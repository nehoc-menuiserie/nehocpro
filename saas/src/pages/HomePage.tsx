import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '../components/ui';
import { SmartPhoto } from '../components/SmartPhoto';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import { exportBackup, importBackup } from '../storage';
import type { Site } from '../types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function countOpenings(site: Site) {
  return site.rooms.reduce((n, r) => n + r.openings.length, 0);
}

export function HomePage() {
  const navigate = useNavigate();
  const { sites, ready, syncing, remove, replaceAll, syncNow } = useSites();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) =>
      [s.clientName, s.address, s.author, s.siteType].join(' ').toLowerCase().includes(q)
    );
  }, [query, sites]);

  const onExport = () => {
    exportBackup(sites);
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      setBusy(true);
      const imported = await importBackup(file);
      await replaceAll(imported);
      alert(`${imported.length} chantier(s) importé(s).`);
    } catch {
      alert('Fichier non valide.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (site: Site) => {
    if (!confirm(`Supprimer le chantier « ${site.clientName || 'Sans nom'} » ?`)) return;
    remove(site.id);
  };

  const openings = sites.reduce((n, s) => n + countOpenings(s), 0);

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="brand-row">
          <img src="/logo-nehoc.jpeg" alt="NEHOC" className="logo" />
          <div>
            <p className="kicker">Menuiserie aluminium</p>
            <h1>NEHOCPRO</h1>
            <p className="subtitle">Relevés de chantier</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{sites.length}</strong>
            <span>Chantiers</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <strong>{openings}</strong>
            <span>Menuiseries</span>
          </div>
        </div>
      </section>

      <div className="toolbar">
        <Button title="Sauvegarde" variant="secondary" onClick={onExport} />
        <Button title="Importer" variant="outline" onClick={() => importRef.current?.click()} />
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            onImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <div className="toolbar">
        <Button
          title={syncing ? 'Sync…' : 'Synchroniser'}
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await syncNow();
            } catch {
              alert('Synchronisation impossible. Vérifiez le réseau.');
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button title="Déconnexion" variant="outline" onClick={() => signOut()} />
      </div>

      <input
        className="input search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un client, une adresse…"
      />

      <Button title="+ Nouveau chantier" className="cta" onClick={() => navigate('/site/new')} />

      {!ready || busy ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>Aucun chantier</h3>
          <p>Créez un relevé, photographiez les menuiseries et générez le rapport PDF.</p>
        </div>
      ) : (
        <ul className="site-list">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link to={`/site/${item.id}`} className="site-card">
                {item.generalPhotos[0] ? (
                  <SmartPhoto src={item.generalPhotos[0]} className="thumb" />
                ) : (
                  <div className="thumb fallback">{(item.clientName || 'N').slice(0, 1).toUpperCase()}</div>
                )}
                <div className="site-card-body">
                  <strong>{item.clientName || 'Sans nom'}</strong>
                  <span>{item.address || 'Adresse non renseignée'}</span>
                  <span>
                    {authorFullName(item.author) || 'Responsable ?'} · {formatDate(item.updatedAt)}
                  </span>
                  <em>
                    {item.rooms.length} pièce{item.rooms.length > 1 ? 's' : ''} · {countOpenings(item)} menuiserie
                    {countOpenings(item) > 1 ? 's' : ''}
                  </em>
                </div>
              </Link>
              <button type="button" className="delete-link" onClick={() => confirmDelete(item)}>
                Suppr.
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/backoffice" className="footer-backoffice">
        back office
      </Link>
    </div>
  );
}
