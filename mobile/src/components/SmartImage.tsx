import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { resolvePhotoUri } from '../lib/sync';
import { isCloudPhoto } from '../lib/supabase';

export function SmartImage({ source, ...rest }: ImageProps) {
  const raw = typeof source === 'object' && source && 'uri' in source ? String(source.uri || '') : '';
  const [uri, setUri] = useState(isCloudPhoto(raw) ? '' : raw);

  useEffect(() => {
    let alive = true;
    if (!raw) {
      setUri('');
      return;
    }
    if (!isCloudPhoto(raw) && !raw.startsWith('sb:')) {
      setUri(raw);
      return;
    }
    resolvePhotoUri(raw).then((next) => {
      if (!alive) return;
      setUri(next.startsWith('http') || next.startsWith('file:') || next.startsWith('data:') ? next : '');
    });
    return () => {
      alive = false;
    };
  }, [raw]);

  if (!uri) return null;
  return <Image {...rest} source={{ uri }} cachePolicy="memory-disk" recyclingKey={uri} />;
}
