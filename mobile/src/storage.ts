import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

function asString(v: unknown) {
  return v == null ? '' : String(v);
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

async function ensurePhotoDir() {
  const dir = `${FileSystem.documentDirectory}photos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export async function persistPhoto(uri: string): Promise<string> {
  if (!uri) return uri;
  if (uri.startsWith('sb:') || uri.startsWith('http')) return uri;
  const dir = await ensurePhotoDir();
  const dest = `${dir}${uid()}.jpg`;
  const writeBase64 = async (base64: string) => {
    await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
  };
  try {
    if (uri.startsWith('data:')) {
      await writeBase64(uri.split(',')[1] || '');
    } else {
      try {
        await FileSystem.copyAsync({ from: uri, to: dest });
      } catch {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await writeBase64(base64);
      }
    }
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) return uri;
    return dest.startsWith('file://') ? dest : `file://${dest}`;
  } catch {
    return uri;
  }
}

export async function toDataUrl(uri: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:')) return uri;
  let path = uri;
  if (uri.startsWith('sb:')) {
    const { resolvePhotoUri } = await import('./lib/sync');
    path = await resolvePhotoUri(uri);
  }
  if (path.startsWith('http')) {
    const dest = `${FileSystem.cacheDirectory}${uid()}.jpg`;
    await FileSystem.downloadAsync(path, dest);
    path = dest;
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return uri;
  }
}

async function persistSitePhotos(site: Site): Promise<Site> {
  const generalPhotos = await Promise.all(site.generalPhotos.map(persistPhoto));
  const rooms = await Promise.all(
    site.rooms.map(async (room) => ({
      ...room,
      openings: await Promise.all(
        room.openings.map(async (op) => ({
          ...op,
          photos: await Promise.all(op.photos.map(persistPhoto)),
        }))
      ),
    }))
  );
  return { ...site, generalPhotos, rooms };
}

async function siteToBackup(site: Site): Promise<Site> {
  const generalPhotos = await Promise.all(site.generalPhotos.map(toDataUrl));
  const rooms = await Promise.all(
    site.rooms.map(async (room) => ({
      ...room,
      openings: await Promise.all(
        room.openings.map(async (op) => ({
          ...op,
          photos: await Promise.all(op.photos.map(toDataUrl)),
        }))
      ),
    }))
  );
  return { ...site, generalPhotos, rooms };
}

export async function loadSites(): Promise<Site[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSite(item));
  } catch {
    return [];
  }
}

export async function saveSites(sites: Site[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(sites));
}

export async function exportBackup(sites: Site[]) {
  const payload = await Promise.all(sites.map(siteToBackup));
  const path = `${FileSystem.cacheDirectory}NEHOCPRO-sauvegarde.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Sauvegarde NEHOCPRO',
    });
  }
}

export async function importBackup(): Promise<Site[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Fichier non valide');
  const sites = await Promise.all(parsed.map((item) => persistSitePhotos(normalizeSite(item))));
  return sites;
}
