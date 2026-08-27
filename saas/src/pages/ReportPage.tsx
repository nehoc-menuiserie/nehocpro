import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ColorSwatch } from '../components/ui';
import { SmartPhoto } from '../components/SmartPhoto';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { buildReportHtml, printReport } from '../reportHtml';

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, ready } = useSites();
  const site = id ? getSite(id) : undefined;
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => site?.rooms.reduce((n, r) => n + r.openings.length, 0) ?? 0, [site]);

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

  const sharePdf = async () => {
    try {
      setBusy(true);
      const html = await buildReportHtml(site);
      printReport(html);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Impossible de générer le rapport.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page report-page">
      <header className="page-head">
        <Button title="← Chantier" variant="ghost" onClick={() => navigate(`/site/${site.id}`)} />
        <h1>Rapport</h1>
        <span />
      </header>

      <div className="report-hero">
        <img src="/logo-nehoc.jpeg" alt="NEHOC" className="logo" />
        <p className="kicker">Visite de chantier</p>
        <h2>{site.clientName}</h2>
        <p>{site.address || 'Adresse non renseignée'}</p>
        <p>
          {authorFullName(site.author)} · {site.siteType} · {site.workType}
        </p>
      </div>

      <div className="pills">
        <div className="pill">
          <strong>{site.rooms.length}</strong>
          <span>Pièces</span>
        </div>
        <div className="pill">
          <strong>{total}</strong>
          <span>Menuiseries</span>
        </div>
      </div>

      {site.generalPhotos[0] ? <SmartPhoto src={site.generalPhotos[0]} className="cover" /> : null}

      {site.generalNotes ? (
        <section className="card">
          <h3>Observations</h3>
          <p className="notes">{site.generalNotes}</p>
        </section>
      ) : null}

      {site.rooms.map((room) => (
        <section key={room.id} className="card">
          <h3>{room.name || 'Pièce'}</h3>
          {room.notes ? <p className="notes">{room.notes}</p> : null}
          {room.openings.map((op) => (
            <div key={op.id} className="report-opening-row">
              {op.photos[0] ? (
                <SmartPhoto src={op.photos[0]} className="op-photo" />
              ) : (
                <div className="op-photo empty">Sans photo</div>
              )}
              <div>
                <strong>
                  {op.type}
                  {op.ref ? ` — ${op.ref}` : ''}
                </strong>
                <p>
                  {op.width || op.height ? `${op.width || '—'} × ${op.height || '—'} mm` : 'Dimensions à définir'}
                  {' · '}qté {op.quantity || '1'}
                </p>
                <p>{op.pose}</p>
                <div className="color-line">
                  <ColorSwatch value={op.colorRal} size={18} />
                  <span>{op.colorRal || 'Couleur à définir'}</span>
                </div>
                {op.notes ? <p className="notes">{op.notes}</p> : null}
              </div>
            </div>
          ))}
        </section>
      ))}

      <Button
        title={busy ? 'Génération du PDF…' : 'Imprimer / enregistrer le PDF'}
        onClick={sharePdf}
        disabled={busy}
      />
      {busy ? <div className="spinner" /> : null}
    </div>
  );
}
