import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '../components/ui';
import { SmartPhoto } from '../components/SmartPhoto';
import { SwipeDeleteRow } from '../components/SwipeDeleteRow';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import {
  FOLLOW_UP_FILTERS,
  FOLLOW_UP_STATUSES,
  followUpTone,
  matchesFollowUpFilter,
  type FollowUpStatus,
} from '../followUp';
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
  const { sites, ready, syncing, remove, syncNow, upsert } = useSites();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      if (!matchesFollowUpFilter(s.followUpStatus, filter)) return false;
      if (!q) return true;
      return [s.clientName, s.clientFirstName, s.clientLastName, s.address, s.author, s.siteType, s.followUpStatus]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [query, sites, filter]);

  const openings = sites.reduce((n, s) => n + countOpenings(s), 0);
  const waiting = sites.filter((s) => s.followUpStatus === 'Devis envoyé').length;

  const changeStatus = async (site: Site, followUpStatus: FollowUpStatus) => {
    if (site.followUpStatus === followUpStatus) return;
    try {
      await upsert({ ...site, followUpStatus });
    } catch {
      alert('Impossible de mettre à jour le suivi. Vérifiez le réseau.');
    }
  };

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
          <div className="stat-divider" />
          <div className="stat">
            <strong>{waiting}</strong>
            <span>Devis envoyés</span>
          </div>
        </div>
      </section>

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

      <div className="follow-filters" role="tablist" aria-label="Filtrer le suivi">
        {FOLLOW_UP_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`follow-filter${filter === item.id ? ' is-active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Button title="+ Nouveau chantier" className="cta" onClick={() => navigate('/site/new')} />

      {!ready || busy ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>Aucun chantier</h3>
          <p>
            {sites.length
              ? 'Aucun dossier dans cet état. Changez le filtre ou créez un relevé.'
              : 'Créez un relevé, photographiez les menuiseries et générez le rapport PDF.'}
          </p>
        </div>
      ) : (
        <ul className="site-list">
          {filtered.map((item) => (
            <li key={item.id}>
              <SwipeDeleteRow
                open={openId === item.id}
                onOpenChange={(open) => setOpenId(open ? item.id : '')}
                onDelete={() => {
                  setOpenId('');
                  remove(item.id);
                }}
              >
                <div className="site-card">
                  <Link to={`/site/${item.id}`} className="site-card-main">
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
                  <select
                    className={`follow-badge follow-${followUpTone(item.followUpStatus || 'Relevé')}`}
                    value={item.followUpStatus || 'Relevé'}
                    aria-label={`Suivi de ${item.clientName || 'ce chantier'}`}
                    onChange={(e) => changeStatus(item, e.target.value as FollowUpStatus)}
                  >
                    {FOLLOW_UP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </SwipeDeleteRow>
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
