import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '../components/ui';
import { PosePlanModal } from '../components/PosePlanModal';
import { SmartPhoto } from '../components/SmartPhoto';
import { SwipeDeleteRow } from '../components/SwipeDeleteRow';
import { authorFullName } from '../constants';
import { useSites } from '../context';
import {
  FOLLOW_UP_FILTERS,
  FOLLOW_UP_STATUSES,
  SIGNED_STATUS,
  followUpTone,
  matchesFollowUpFilter,
  type FollowUpStatus,
  type PosePlan,
} from '../followUp';
import { LanguageSwitcher, useI18n, type MsgKey } from '../i18n';
import type { Site } from '../types';

const FILTER_KEYS: Record<string, MsgKey> = {
  all: 'filter.all',
  open: 'filter.open',
  'Devis à faire': 'filter.todo',
  'Devis envoyé': 'filter.sent',
  'Devis signé': 'filter.signed',
  Facturé: 'filter.invoiced',
  Payé: 'filter.paid',
  Perdu: 'filter.lost',
};

function countOpenings(site: Site) {
  return site.rooms.reduce((n, r) => n + r.openings.length, 0);
}

export function HomePage() {
  const navigate = useNavigate();
  const { sites, ready, syncing, remove, syncNow, upsert } = useSites();
  const { signOut } = useAuth();
  const { t, followLabel, dateLocale } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState('');
  const [planSite, setPlanSite] = useState<Site | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(dateLocale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const countLabel = (rooms: number, openings: number) =>
    t('home.roomsOpenings', {
      rooms,
      roomWord: rooms > 1 ? t('word.rooms') : t('word.room'),
      openings,
      openingWord: openings > 1 ? t('word.openings') : t('word.opening'),
    });

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
    if (followUpStatus === SIGNED_STATUS) {
      setPlanSite(site);
      return;
    }
    try {
      await upsert({ ...site, followUpStatus });
    } catch {
      alert(t('home.followError'));
    }
  };

  const confirmPlan = async (plan: PosePlan) => {
    if (!planSite) return;
    const next = {
      ...planSite,
      followUpStatus: SIGNED_STATUS,
      poseDate: plan.poseDate,
      reminder1: '',
      reminder2: '',
    };
    setPlanSite(null);
    try {
      await upsert(next);
    } catch {
      alert(t('home.followError'));
      throw new Error('follow');
    }
  };

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="brand-row">
          <img src="/logo-nehoc.jpeg" alt="NEHOC" className="logo" />
          <div>
            <p className="kicker">{t('brand.kicker')}</p>
            <h1>NEHOCPRO</h1>
            <p className="subtitle">{t('brand.subtitle')}</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{sites.length}</strong>
            <span>{t('home.sites')}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <strong>{openings}</strong>
            <span>{t('home.openings')}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <strong>{waiting}</strong>
            <span>{t('home.quotesSent')}</span>
          </div>
        </div>
      </section>

      <div className="lang-row">
        <LanguageSwitcher />
      </div>

      <div className="toolbar">
        <Button
          title={syncing ? t('common.syncing') : t('common.sync')}
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            try {
              setBusy(true);
              await syncNow();
            } catch {
              alert(t('home.syncError'));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button title={t('common.logout')} variant="outline" onClick={() => signOut()} />
      </div>

      {searchOpen || query ? (
        <div className="search-panel">
          <input
            ref={searchRef}
            className="input search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.search')}
            aria-label={t('home.search')}
          />
          <button
            type="button"
            className="search-close"
            aria-label={t('home.searchClose')}
            onClick={() => {
              setQuery('');
              setSearchOpen(false);
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="search-toggle"
          aria-label={t('home.searchOpen')}
          onClick={() => setSearchOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <div className="follow-filters" role="tablist" aria-label={t('home.filterAria')}>
        {FOLLOW_UP_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`follow-filter${filter === item.id ? ' is-active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {t(FILTER_KEYS[item.id] || 'filter.all')}
          </button>
        ))}
      </div>

      <Button title={t('home.newSite')} className="cta" onClick={() => navigate('/site/new')} />

      {!ready || busy ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>{t('home.emptyTitle')}</h3>
          <p>{sites.length ? t('home.emptyFilter') : t('home.emptyAll')}</p>
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
                      <strong>{item.clientName || t('home.noName')}</strong>
                      <span>{item.address || t('home.noAddress')}</span>
                      <span>
                        {authorFullName(item.author) || t('home.noAuthor')} · {formatDate(item.updatedAt)}
                      </span>
                      <em>{countLabel(item.rooms.length, countOpenings(item))}</em>
                    </div>
                  </Link>
                  <select
                    className={`follow-badge follow-${followUpTone(item.followUpStatus || 'Relevé')}`}
                    value={item.followUpStatus || 'Relevé'}
                    aria-label={t('home.followOf', { name: item.clientName || t('home.thisSite') })}
                    onChange={(e) => changeStatus(item, e.target.value as FollowUpStatus)}
                  >
                    {FOLLOW_UP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {followLabel(status)}
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
        {t('common.backoffice')}
      </Link>
      {planSite ? (
        <PosePlanModal
          site={planSite}
          onCancel={() => setPlanSite(null)}
          onConfirm={confirmPlan}
        />
      ) : null}
    </div>
  );
}
