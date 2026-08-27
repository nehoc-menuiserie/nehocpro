import { useEffect, useState } from 'react';
import { resolvePhotoUri } from '../lib/sync';
import { isCloudPhoto } from '../lib/supabase';

export function SmartPhoto({
  src,
  className,
  alt = '',
}: {
  src: string;
  className?: string;
  alt?: string;
}) {
  const [url, setUrl] = useState(() => (isCloudPhoto(src) || src.includes('/storage/v1/') ? '' : src));

  useEffect(() => {
    let alive = true;
    if (!src) {
      setUrl('');
      return;
    }
    resolvePhotoUri(src).then((next) => {
      if (alive) setUrl(next);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  if (!url) return <div className={className} />;
  return <img src={url} className={className} alt={alt} />;
}
