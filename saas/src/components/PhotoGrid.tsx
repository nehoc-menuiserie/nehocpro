import { useRef, useState } from 'react';
import { SmartPhoto } from './SmartPhoto';
import { ensureCloudPhoto } from '../lib/sync';
import { compressImage } from '../storage';

export function PhotoGrid({
  siteId,
  uris,
  onChange,
}: {
  siteId: string;
  uris: string[];
  onChange: (next: string[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const local = await Promise.all([...files].map((file) => compressImage(file)));
      const uploaded: string[] = [];
      for (const uri of local.filter(Boolean)) {
        uploaded.push(await ensureCloudPhoto(siteId, uri));
      }
      onChange([...uris, ...uploaded]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Impossible d’enregistrer la photo dans le cloud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="photo-actions">
        <button type="button" className="photo-action" onClick={() => cameraRef.current?.click()} disabled={busy}>
          <span>📷</span>
          {busy ? 'Envoi…' : 'Photo'}
        </button>
        <button type="button" className="photo-action" onClick={() => libraryRef.current?.click()} disabled={busy}>
          <span>🖼</span>
          Galerie
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {uris.length ? (
        <div className="photo-grid">
          {uris.map((uri, i) => (
            <div key={`${uri.slice(0, 48)}-${i}`} className="photo-item">
              <button type="button" className="photo-thumb" onClick={() => setPreview(uri)}>
                <SmartPhoto src={uri} />
              </button>
              <button
                type="button"
                className="photo-remove"
                onClick={() => onChange(uris.filter((_, idx) => idx !== i))}
                aria-label="Supprimer la photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{busy ? 'Envoi des photos vers le cloud…' : 'Aucune photo pour le moment.'}</p>
      )}
      {preview ? (
        <button type="button" className="lightbox" onClick={() => setPreview(null)}>
          <SmartPhoto src={preview} />
        </button>
      ) : null}
    </div>
  );
}
