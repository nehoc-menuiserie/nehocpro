import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('VOTRE-PROJET'));

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const PHOTO_PREFIX = 'sb:';

export function isCloudPhoto(uri: string) {
  return uri.startsWith(PHOTO_PREFIX);
}

export function cloudPhotoPath(uri: string) {
  return uri.startsWith(PHOTO_PREFIX) ? uri.slice(PHOTO_PREFIX.length) : uri;
}
