import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { buildReportHtml } from '../reportHtml';

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, ready } = useSites();
  const site = id ? getSite(id) : undefined;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const total = useMemo(() => site?.rooms.reduce((n, r) => n + r.openings.length, 0) ?? 0, [site]);

  useEffect(() => {
    if (!site) return;
    let alive = true;
    setBusy(true);
    setError('');
    buildReportHtml(site)
      .then((next) => {
        if (alive) setHtml(next);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Impossible de générer le rapport.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [site]);

  const fitIframe = () => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.documentElement) return;
    frame.style.height = `${Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight)}px`;
  };

  const printPreview = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) {
      alert('L’aperçu n’est pas encore prêt.');
      return;
    }
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };

  if (!ready) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="page">
        <Button title="← Retour" variant="ghost" onClick={() => navigate('/')} />
        <p className="subtitle">Chantier introuvable.</p>
      </div>
    );
  }

  return (
    <div className="page report-page">
      <header className="page-head">
        <Button title="← Chantier" variant="ghost" onClick={() => navigate(`/site/${site.id}`)} />
        <h1>Aperçu du rapport</h1>
        <span />
      </header>

      <div className="report-hero">
        <p className="kicker">Visite de chantier</p>
        <h2>{site.clientName}</h2>
        <p>
          {authorFullName(site.author)} · {site.rooms.length} pièce{site.rooms.length > 1 ? 's' : ''} · {total}{' '}
          menuiserie{total > 1 ? 's' : ''}
        </p>
      </div>

      <div className="report-actions">
        <Button title="Imprimer / enregistrer en PDF" onClick={printPreview} disabled={busy || !html} />
        <p className="hint">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » pour télécharger le fichier.</p>
      </div>

      {busy ? <div className="spinner" /> : null}
      {error ? <p className="subtitle">{error}</p> : null}

      {html ? (
        <div className="report-preview-wrap">
          <iframe
            ref={iframeRef}
            className="report-preview"
            title="Aperçu du rapport PDF"
            srcDoc={html}
            onLoad={fitIframe}
          />
        </div>
      ) : null}
    </div>
  );
}
