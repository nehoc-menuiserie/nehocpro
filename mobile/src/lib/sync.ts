import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import type { Site } from '../types';
import { splitClientName, uid } from '../storage';
import { PHOTO_PREFIX, cloudPhotoPath, isCloudPhoto, supabase } from './supabase';

function localPhoto(uri: string) {
  return (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('data:') ||
    uri.startsWith('/')
  );
}

async function signedUrl(path: string) {
  if (!supabase || !path) return '';
  const clean = path.replace(/^\/+/, '');
  const { data, error } = await supabase.storage.from('site-photos').createSignedUrl(clean, 60 * 60 * 24 * 7);
  if (!error && data?.signedUrl) return data.signedUrl;
  const publicUrl = supabase.storage.from('site-photos').getPublicUrl(clean).data.publicUrl;
  return publicUrl || '';
}

export async function resolvePhotoUri(uri: string) {
  if (!uri) return uri;
  if (isCloudPhoto(uri)) return signedUrl(cloudPhotoPath(uri));
  return uri;
}

async function uploadPhoto(userId: string, siteId: string, uri: string) {
  if (!supabase) return uri;
  if (isCloudPhoto(uri)) return uri;
  if (!localPhoto(uri) && uri.startsWith('http')) return uri;

  let base64: string;
  if (uri.startsWith('data:')) {
    base64 = uri.split(',')[1] || '';
  } else {
    base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  const path = `${userId}/${siteId}/${uid()}.jpg`;
  const { error } = await supabase.storage.from('site-photos').upload(path, decode(base64), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return `${PHOTO_PREFIX}${path}`;
}

export async function pushSite(site: Site) {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const generalPhotos = await Promise.all(
    site.generalPhotos.map((uri) => uploadPhoto(user.id, site.id, uri))
  );
  const rooms = await Promise.all(
    site.rooms.map(async (room) => ({
      ...room,
      openings: await Promise.all(
        room.openings.map(async (op) => ({
          ...op,
          photos: await Promise.all(op.photos.map((uri) => uploadPhoto(user.id, site.id, uri))),
        }))
      ),
    }))
  );

  const { error: siteError } = await supabase.from('sites').upsert({
    id: site.id,
    owner_id: user.id,
    author: site.author,
    client_name: site.clientName,
    client_phone: site.clientPhone,
    client_email: site.clientEmail,
    address: site.address,
    site_type: site.siteType,
    work_type: site.workType,
    general_notes: site.generalNotes,
    updated_at: site.updatedAt,
  });
  if (siteError) throw siteError;

  await supabase.from('rooms').delete().eq('site_id', site.id);
  await supabase.from('photos').delete().eq('site_id', site.id);

  if (rooms.length) {
    const { error } = await supabase.from('rooms').insert(
      rooms.map((room, i) => ({
        id: room.id,
        site_id: site.id,
        name: room.name,
        notes: room.notes,
        position: i,
      }))
    );
    if (error) throw error;
  }

  const openingRows = rooms.flatMap((room, ri) =>
    room.openings.map((op, oi) => ({
      id: op.id,
      room_id: room.id,
      type: op.type,
      ref: op.ref,
      width: op.width,
      height: op.height,
      pose: op.pose,
      quantity: op.quantity,
      color_ral: op.colorRal,
      notes: op.notes,
      position: ri * 1000 + oi,
    }))
  );
  if (openingRows.length) {
    const { error } = await supabase.from('openings').insert(openingRows);
    if (error) throw error;
  }

  const photoRows = [
    ...generalPhotos.map((ref, i) => ({
      id: uid(),
      site_id: site.id,
      opening_id: null as string | null,
      kind: 'general',
      storage_path: isCloudPhoto(ref) ? cloudPhotoPath(ref) : ref,
      position: i,
    })),
    ...rooms.flatMap((room) =>
      room.openings.flatMap((op) =>
        op.photos.map((ref, i) => ({
          id: uid(),
          site_id: site.id,
          opening_id: op.id,
          kind: 'opening',
          storage_path: isCloudPhoto(ref) ? cloudPhotoPath(ref) : ref,
          position: i,
        }))
      )
    ),
  ].filter((p) => p.storage_path);

  if (photoRows.length) {
    const { error } = await supabase.from('photos').insert(photoRows);
    if (error) throw error;
  }

  return { ...site, generalPhotos, rooms };
}

export async function deleteCloudSite(id: string) {
  if (!supabase) return;
  await supabase.from('sites').delete().eq('id', id);
}

export async function pullSites(): Promise<Site[]> {
  if (!supabase) return [];
  const { data: siteRows, error } = await supabase.from('sites').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  if (!siteRows?.length) return [];

  const siteIds = siteRows.map((s) => s.id as string);
  const { data: roomRows } = await supabase.from('rooms').select('*').in('site_id', siteIds);
  const roomIds = (roomRows || []).map((r) => r.id as string);
  const { data: openingRows } = roomIds.length
    ? await supabase.from('openings').select('*').in('room_id', roomIds)
    : { data: [] };
  const { data: photoRows } = await supabase.from('photos').select('*').in('site_id', siteIds);

  const sites = siteRows.map((row) => {
    const rooms = (roomRows || [])
      .filter((r) => r.site_id === row.id)
      .sort((a, b) => (a.position as number) - (b.position as number))
      .map((room) => ({
        id: String(room.id),
        name: String(room.name || ''),
        notes: String(room.notes || ''),
        openings: (openingRows || [])
          .filter((o) => o.room_id === room.id)
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((op) => ({
            id: String(op.id),
            type: String(op.type || 'Fenêtre'),
            ref: String(op.ref || ''),
            width: String(op.width || ''),
            height: String(op.height || ''),
            pose: String(op.pose || 'À définir'),
            quantity: String(op.quantity || '1'),
            colorRal: String(op.color_ral || ''),
            notes: String(op.notes || ''),
            photos: (photoRows || [])
              .filter((p) => p.opening_id === op.id && p.kind === 'opening')
              .sort((a, b) => (a.position as number) - (b.position as number))
              .map((p) => `${PHOTO_PREFIX}${p.storage_path}`),
          })),
      }));
    return {
      id: String(row.id),
      author: String(row.author || ''),
      clientName: String(row.client_name || ''),
      clientFirstName: splitClientName(String(row.client_name || '')).clientFirstName,
      clientLastName: splitClientName(String(row.client_name || '')).clientLastName,
      clientPhone: String(row.client_phone || ''),
      clientEmail: String(row.client_email || ''),
      address: String(row.address || ''),
      siteType: String(row.site_type || 'Maison'),
      workType: String(row.work_type || 'Rénovation'),
      generalNotes: String(row.general_notes || ''),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      generalPhotos: (photoRows || [])
        .filter((p) => p.site_id === row.id && p.kind === 'general')
        .sort((a, b) => (a.position as number) - (b.position as number))
        .map((p) => `${PHOTO_PREFIX}${p.storage_path}`),
      rooms,
    } satisfies Site;
  });

  return Promise.all(sites.map(hydrateSitePhotos));
}

async function hydrateSitePhotos(site: Site): Promise<Site> {
  return {
    ...site,
    generalPhotos: await Promise.all(site.generalPhotos.map(resolvePhotoUri)),
    rooms: await Promise.all(
      site.rooms.map(async (room) => ({
        ...room,
        openings: await Promise.all(
          room.openings.map(async (op) => ({
            ...op,
            photos: await Promise.all(op.photos.map(resolvePhotoUri)),
          }))
        ),
      }))
    ),
  };
}

function photosUsable(uris: string[]) {
  return uris.some(
    (u) => u.startsWith('file:') || u.startsWith('http') || u.startsWith('data:') || u.startsWith('content:')
  );
}

export function mergeSites(local: Site[], remote: Site[]) {
  const locals = new Map(local.map((s) => [s.id, s]));
  const map = new Map<string, Site>();
  [...local, ...remote].forEach((site) => {
    const current = map.get(site.id);
    if (current && new Date(current.updatedAt).getTime() > new Date(site.updatedAt).getTime()) return;
    const loc = locals.get(site.id);
    let next = site;
    if (loc) {
      if (!photosUsable(next.generalPhotos) && photosUsable(loc.generalPhotos)) {
        next = { ...next, generalPhotos: loc.generalPhotos };
      }
      next = {
        ...next,
        rooms: next.rooms.map((room) => {
          const lr = loc.rooms.find((r) => r.id === room.id);
          if (!lr) return room;
          return {
            ...room,
            openings: room.openings.map((op) => {
              const lo = lr.openings.find((o) => o.id === op.id);
              if (lo && !photosUsable(op.photos) && photosUsable(lo.photos)) {
                return { ...op, photos: lo.photos };
              }
              return op;
            }),
          };
        }),
      };
    }
    map.set(next.id, next);
  });
  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
