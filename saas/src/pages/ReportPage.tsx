import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { LanguageSwitcher, useI18n } from '../i18n';
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

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.57 3.6 1 1 0 01-.25 1z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm0 2v.2l8 5.3 8-5.3V7H4zm16 10V9.5l-7.4 4.9a1 1 0 01-1.2 0L4 9.5V17h16z"
      />
    </svg>
  );
}

function telHref(phone: string) {
  const clean = (phone || '').replace(/[^\d+]/g, '');
  return clean ? `tel:${clean}` : '';
}

function mailHref(email: string, clientName: string) {
  const to = (email || '').trim();
  if (!to || !to.includes('@')) return '';
  const subject = encodeURIComponent(`NEHOC — ${clientName || 'Chantier'}`);
  return `mailto:${to}?subject=${subject}`;
}

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, ready } = useSites();
  const { t, locale } = useI18n();
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
    buildReportHtml(site, locale)
      .then((next) => {
        if (alive) setHtml(next);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t('report.generateError'));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [site, locale, t]);

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
      alert(t('report.notReady'));
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
        setPdfHint(t('report.pdfSaved'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPdfHint(err instanceof Error ? err.message : t('report.shareError'));
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
        <Button title={t('common.back')} variant="ghost" onClick={() => navigate('/')} />
        <p className="subtitle">{t('site.missing')}</p>
      </div>
    );
  }

  return (
    <div className="page report-page">
      <header className="page-head">
        <Button title={t('common.backSite')} variant="ghost" onClick={() => navigate(`/site/${site.id}`)} />
        <h1>{t('report.title')}</h1>
        <LanguageSwitcher />
      </header>

      <div className="report-hero">
        <p className="kicker">{t('report.kicker')}</p>
        <h2>{site.clientName}</h2>
        <p>
          {authorFullName(site.author)} ·{' '}
          {t('home.roomsOpenings', {
            rooms: site.rooms.length,
            roomWord: site.rooms.length > 1 ? t('word.rooms') : t('word.room'),
            openings: total,
            openingWord: total > 1 ? t('word.openings') : t('word.opening'),
          })}
        </p>
      </div>

      <div className="report-actions">
        <div className="report-contact">
          {telHref(site.clientPhone) ? (
            <a className="btn btn-call" href={telHref(site.clientPhone)}>
              <PhoneIcon />
              {t('report.call')}
            </a>
          ) : (
            <button type="button" className="btn btn-call" disabled>
              <PhoneIcon />
              {t('report.noPhone')}
            </button>
          )}
          {mailHref(site.clientEmail, site.clientName) ? (
            <a className="btn btn-mail" href={mailHref(site.clientEmail, site.clientName)}>
              <MailIcon />
              {t('report.mail')}
            </a>
          ) : (
            <button type="button" className="btn btn-mail" disabled>
              <MailIcon />
              {t('report.noMail')}
            </button>
          )}
        </div>
        <Button title={t('report.print')} onClick={printPreview} disabled={busy || !html} />
        <button
          type="button"
          className="btn btn-whatsapp"
          onClick={sendWhatsApp}
          disabled={busy || !html || sharing}
        >
          <WhatsAppIcon />
          {sharing ? t('report.preparing') : t('report.whatsapp')}
        </button>
        <p className="hint">
          {pdfHint || t('report.hint')}
        </p>
      </div>

      {busy ? <div className="spinner" /> : null}
      {error ? <p className="subtitle">{error}</p> : null}

      {html ? (
        <div ref={wrapRef} className="report-preview-wrap">
          <iframe
            ref={iframeRef}
            className="report-preview"
            title={t('report.previewAria')}
            srcDoc={html}
            onLoad={fitPreview}
          />
        </div>
      ) : null}
    </div>
  );
}
