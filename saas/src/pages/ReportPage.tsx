import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { buildReportHtml } from '../reportHtml';
import { buildReportPdfFromPreview, sharePdfFile } from '../shareWhatsApp';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, ready } = useSites();
  const site = id ? getSite(id) : undefined;
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [pdfHint, setPdfHint] = useState('');
  const pdfFileRef = useRef<File | null>(null);

  const total = useMemo(() => site?.rooms.reduce((n, r) => n + r.openings.length, 0) ?? 0, [site]);

  const fitPreview = useCallback(() => {
    const wrap = wrapRef.current;
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!wrap || !frame || !doc?.documentElement) return;

    frame.style.transform = 'none';
    frame.style.width = '210mm';
    const naturalWidth = frame.offsetWidth || 1;
    const naturalHeight = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, 1);
    frame.style.height = `${naturalHeight}px`;

    const scale = Math.min(1, wrap.clientWidth / naturalWidth);
    frame.style.transform = `scale(${scale})`;
    wrap.style.height = `${naturalHeight * scale}px`;
  }, []);

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

  useEffect(() => {
    pdfFileRef.current = null;
    setPdfHint('');
  }, [html]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => fitPreview());
    observer.observe(wrap);
    window.addEventListener('resize', fitPreview);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fitPreview);
    };
  }, [fitPreview, html]);

  const printPreview = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) {
      alert('L’aperçu n’est pas encore prêt.');
      return;
    }
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };

  const sendWhatsApp = async () => {
    const frame = iframeRef.current;
    if (!site || !frame?.contentDocument) return;
    setSharing(true);
    setPdfHint('');
    try {
      const file = pdfFileRef.current ?? (await buildReportPdfFromPreview(frame, site));
      pdfFileRef.current = file;
      const result = await sharePdfFile(file);
      if (result === 'saved') {
        setPdfHint('Le PDF a été enregistré. Appuyez encore sur le bouton pour choisir WhatsApp, ou joignez le fichier dans une conversation.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPdfHint(err instanceof Error ? err.message : 'Impossible de partager le PDF.');
    } finally {
      setSharing(false);
    }
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
        <button
          type="button"
          className="btn btn-whatsapp"
          onClick={sendWhatsApp}
          disabled={busy || !html || sharing}
        >
          <WhatsAppIcon />
          {sharing ? 'Préparation du PDF…' : 'Envoyer le PDF sur WhatsApp'}
        </button>
        <p className="hint">
          {pdfHint || 'Choisissez WhatsApp, puis le contact. C’est le PDF du rapport qui part, pas un texte.'}
        </p>
      </div>

      {busy ? <div className="spinner" /> : null}
      {error ? <p className="subtitle">{error}</p> : null}

      {html ? (
        <div ref={wrapRef} className="report-preview-wrap">
          <iframe
            ref={iframeRef}
            className="report-preview"
            title="Aperçu du rapport PDF"
            srcDoc={html}
            onLoad={fitPreview}
          />
        </div>
      ) : null}
    </div>
  );
}
