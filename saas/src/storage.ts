import { FOLLOW_UP_DEFAULT, followUpFromRecord, stripFollowUpMark } from './followUp';
import type { Opening, Room, Site } from './types';

const KEY = 'nehocpro_sites_v02';

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyOpening(): Opening {
  return {
    id: uid(),
    type: 'Fenêtre',
    ref: '',
    width: '',
    height: '',
    pose: 'À définir',
    quantity: '1',
    colorRal: '',
    notes: '',
    photos: [],
  };
}

export function createEmptyRoom(): Room {
  return { id: uid(), name: '', notes: '', openings: [] };
}

export function createEmptySite(): Site {
  return {
    id: uid(),
    author: '',
    clientName: '',
    clientFirstName: '',
    clientLastName: '',
    clientPhone: '',
    clientEmail: '',
    address: '',
    siteType: 'Maison',
    workType: 'Rénovation',
    followUpStatus: FOLLOW_UP_DEFAULT,
    generalNotes: '',
    generalPhotos: [],
    rooms: [createEmptyRoom()],
    updatedAt: new Date().toISOString(),
  };
}

export function composeClientName(first: string, last: string) {
  return [first.trim(), last.trim()].filter(Boolean).join(' ');
}

export function splitClientName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { clientFirstName: '', clientLastName: '' };
  if (parts.length === 1) return { clientFirstName: '', clientLastName: parts[0] };
  return { clientFirstName: parts.slice(0, -1).join(' '), clientLastName: parts[parts.length - 1] };
}

function asString(v: unknown) {
  return v == null ? '' : String(v);
}

export function normalizeSite(raw: Partial<Site> & Record<string, unknown>): Site {
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  return {
    id: asString(raw.id) || uid(),
    author: asString(raw.author),
    clientFirstName: asString(raw.clientFirstName) || splitClientName(asString(raw.clientName)).clientFirstName,
    clientLastName: asString(raw.clientLastName) || splitClientName(asString(raw.clientName)).clientLastName,
    clientName:
      composeClientName(asString(raw.clientFirstName), asString(raw.clientLastName)) || asString(raw.clientName),
    clientPhone: asString(raw.clientPhone),
    clientEmail: asString(raw.clientEmail),
    address: asString(raw.address),
    siteType: asString(raw.siteType) || 'Maison',
    workType: asString(raw.workType) || 'Rénovation',
    followUpStatus: followUpFromRecord(raw.followUpStatus, asString(raw.generalNotes)),
    generalNotes: stripFollowUpMark(asString(raw.generalNotes)),
    generalPhotos: Array.isArray(raw.generalPhotos) ? raw.generalPhotos.map(asString) : [],
    rooms: rooms.map((r) => {
      const room = r as Partial<Room>;
      return {
        id: asString(room.id) || uid(),
        name: asString(room.name),
        notes: asString(room.notes),
        openings: (room.openings || []).map((o) => {
          const op = o as Partial<Opening>;
          return {
            id: asString(op.id) || uid(),
            type: asString(op.type) || 'Fenêtre',
            ref: asString(op.ref),
            width: asString(op.width),
            height: asString(op.height),
            pose: asString(op.pose) || 'À définir',
            quantity: asString(op.quantity) || '1',
            colorRal: asString(op.colorRal),
            notes: asString(op.notes),
            photos: Array.isArray(op.photos) ? op.photos.map(asString) : [],
          };
        }),
      };
    }),
    updatedAt: asString(raw.updatedAt) || new Date().toISOString(),
  };
}

export function mapSitePhotos(site: Site, fn: (uri: string) => string): Site {
  return {
    ...site,
    generalPhotos: site.generalPhotos.map(fn).filter(Boolean),
    rooms: site.rooms.map((room) => ({
      ...room,
      openings: room.openings.map((op) => ({
        ...op,
        photos: op.photos.map(fn).filter(Boolean),
      })),
    })),
  };
}

export function loadSites(): Site[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSite(item));
  } catch {
    return [];
  }
}

export function saveSites(sites: Site[]) {
  localStorage.setItem(KEY, JSON.stringify(sites));
}

export function exportBackup(sites: Site[]) {
  const blob = new Blob([JSON.stringify(sites, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NEHOCPRO-sauvegarde.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<Site[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Fichier non valide');
  return parsed.map((item) => normalizeSite(item));
}

export function compressImage(file: File, maxW = 1600, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
