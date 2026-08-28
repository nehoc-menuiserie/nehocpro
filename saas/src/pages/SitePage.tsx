import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoGrid } from '../components/PhotoGrid';
import { FollowUpPicker } from '../components/FollowUpPicker';
import { PosePlanModal } from '../components/PosePlanModal';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle, Select, Textarea } from '../components/ui';
import { useCatalog } from '../catalog';
import { useSites } from '../context';
import { SIGNED_STATUS, canAccessPosePlan, type FollowUpStatus, type PosePlan } from '../followUp';
import { composeClientName, createEmptyOpening, createEmptyRoom, createEmptySite, normalizeSite } from '../storage';
import { LanguageSwitcher, useI18n } from '../i18n';
import type { Opening, Room, Site } from '../types';

export function SitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, upsert, ready } = useSites();
  const { labels } = useCatalog();
  const { t, catalogLabel } = useI18n();
  const isNew = !id || id === 'new';
  const [site, setSite] = useState<Site | null>(null);
  const [missing, setMissing] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'survey' | 'plan'>('survey');
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const found = isNew ? undefined : getSite(id || '');
    if (!isNew && !found) {
      setMissing(true);
      setSite(null);
      return;
    }
    setMissing(false);
    const next = found ? normalizeSite(JSON.parse(JSON.stringify(found)) as Site) : createEmptySite();
    setSite(next);
    setActiveRoomId(next.rooms[0]?.id || '');
    setView('survey');
  }, [ready, id, isNew]);

  if (missing) {
    return (
      <div className="page">
        <Button title={t('common.backHome')} variant="ghost" onClick={() => navigate('/')} />
        <p className="subtitle">{t('site.missing')}</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    );
  }

  const openingCount = site.rooms.reduce((n, r) => n + r.openings.length, 0);

  const patch = (partial: Partial<Site>) => setSite((s) => (s ? { ...s, ...partial } : s));

  const requestStatus = (followUpStatus: FollowUpStatus) => {
    if (followUpStatus === SIGNED_STATUS && site.followUpStatus !== SIGNED_STATUS) {
      setPlanOpen(true);
      return;
    }
    if (!canAccessPosePlan(followUpStatus)) setView('survey');
    patch({ followUpStatus });
  };

  const confirmPlan = async (plan: PosePlan) => {
    const next = {
      ...site,
      followUpStatus: SIGNED_STATUS,
      poseDate: plan.poseDate,
      reminder1: '',
      reminder2: '',
    };
    setSite(next);
    setPlanOpen(false);
    setView('plan');
    try {
      await upsert(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('site.saveError'));
      throw err;
    }
  };

  const showPlanTab = canAccessPosePlan(site.followUpStatus);
  const currentView = showPlanTab ? view : 'survey';

  const updateRoom = (roomId: string, partial: Partial<Room>) => {
    setSite((s) =>
      s
        ? {
            ...s,
            rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, ...partial } : r)),
          }
        : s
    );
  };

  const updateOpening = (roomId: string, openingId: string, partial: Partial<Opening>) => {
    setSite((s) =>
      s
        ? {
            ...s,
            rooms: s.rooms.map((r) =>
              r.id !== roomId
                ? r
                : { ...r, openings: r.openings.map((o) => (o.id === openingId ? { ...o, ...partial } : o)) }
            ),
          }
        : s
    );
  };

  const addRoom = () => {
    const room = createEmptyRoom();
    setSite((s) => (s ? { ...s, rooms: [...s.rooms, room] } : s));
    setActiveRoomId(room.id);
  };

  const addOpening = (roomId?: string) => {
    const targetId = roomId || activeRoomId || site.rooms.at(-1)?.id;
    if (!targetId) {
      const room = createEmptyRoom();
      room.openings = [createEmptyOpening()];
      setSite((s) => (s ? { ...s, rooms: [...s.rooms, room] } : s));
      setActiveRoomId(room.id);
      return;
    }
    const opening = createEmptyOpening();
    setSite((s) =>
      s
        ? {
            ...s,
            rooms: s.rooms.map((r) => (r.id === targetId ? { ...r, openings: [...r.openings, opening] } : r)),
          }
        : s
    );
    setActiveRoomId(targetId);
  };

  const validate = () => {
    if (!site.author) {
      alert(t('site.needAuthor'));
      return false;
    }
    if (!site.clientFirstName.trim() || !site.clientLastName.trim()) {
      alert(t('site.needName'));
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await upsert(site);
      setSite(saved);
      alert(t('site.saved'));
      if (isNew) navigate(`/site/${saved.id}`, { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : t('site.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const onReport = async () => {
    if (!validate()) return;
    try {
      const saved = await upsert(site);
      setSite(saved);
      navigate(`/report/${saved.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('site.saveError'));
    }
  };

  return (
    <div className={`page site-page${currentView === 'plan' ? ' is-plan' : ''}`}>
      <header className="page-head">
        <Button title={t('common.backHome')} variant="ghost" onClick={() => navigate('/')} />
        <div className="page-head-center">
          <h1>{isNew ? t('site.newTitle') : t('site.title')}</h1>
          <p>
            {t('home.roomsOpenings', {
              rooms: site.rooms.length,
              roomWord: site.rooms.length > 1 ? t('word.rooms') : t('word.room'),
              openings: openingCount,
              openingWord: openingCount > 1 ? t('word.openings') : t('word.opening'),
            })}
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      {showPlanTab ? (
        <div className="site-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'survey'}
            className={currentView === 'survey' ? 'is-active' : ''}
            onClick={() => setView('survey')}
          >
            {t('site.tabSurvey')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'plan'}
            className={currentView === 'plan' ? 'is-active' : ''}
            onClick={() => setView('plan')}
          >
            {t('site.tabPlan')}
          </button>
        </div>
      ) : null}

      {currentView === 'plan' ? (
        <Card className="plan-card">
          <SectionTitle>{t('plan.title')}</SectionTitle>
          <p className="follow-hint">{t('plan.subtitle')}</p>
          <Field label={t('plan.poseDate')}>
            <Input type="date" value={site.poseDate} onChange={(e) => patch({ poseDate: e.target.value })} />
          </Field>
        </Card>
      ) : (
      <>
      <div className="site-grid">
        <Card>
          <SectionTitle>{t('site.authorTitle')}</SectionTitle>
          <Select
            label={t('site.authorLabel')}
            value={site.author}
            options={['', ...labels('authors')]}
            onChange={(e) => patch({ author: e.target.value })}
          />
        </Card>

        <Card>
          <SectionTitle>{t('site.followTitle')}</SectionTitle>
          <p className="follow-hint">{t('site.followHint')}</p>
          <FollowUpPicker value={site.followUpStatus || 'Relevé'} onChange={requestStatus} />
        </Card>

        <Card className="site-grid-span">
          <SectionTitle>{t('site.clientTitle')}</SectionTitle>
          <div className="form-grid">
            <Field label={t('site.firstName')}>
              <Input
                value={site.clientFirstName}
                autoComplete="given-name"
                onChange={(e) =>
                  patch({
                    clientFirstName: e.target.value,
                    clientName: composeClientName(e.target.value, site.clientLastName),
                  })
                }
              />
            </Field>
            <Field label={t('site.lastName')}>
              <Input
                value={site.clientLastName}
                autoComplete="family-name"
                onChange={(e) =>
                  patch({
                    clientLastName: e.target.value,
                    clientName: composeClientName(site.clientFirstName, e.target.value),
                  })
                }
              />
            </Field>
            <Field label={t('site.address')} className="field-span">
              <Input value={site.address} autoComplete="street-address" onChange={(e) => patch({ address: e.target.value })} />
            </Field>
            <Field label={t('site.phone')}>
              <Input value={site.clientPhone} onChange={(e) => patch({ clientPhone: e.target.value })} type="tel" />
            </Field>
            <Field label={t('site.email')}>
              <Input value={site.clientEmail} onChange={(e) => patch({ clientEmail: e.target.value })} type="email" />
            </Field>
            <Select
              label={t('site.siteType')}
              value={site.siteType}
              options={labels('site_types').map((v) => ({ value: v, label: catalogLabel(v) }))}
              onChange={(e) => patch({ siteType: e.target.value })}
            />
            <Select
              label={t('site.workType')}
              value={site.workType}
              options={labels('work_types').map((v) => ({ value: v, label: catalogLabel(v) }))}
              onChange={(e) => patch({ workType: e.target.value })}
            />
          </div>
          <Field label={t('site.notes')}>
            <Textarea value={site.generalNotes} onChange={(e) => patch({ generalNotes: e.target.value })} rows={4} />
          </Field>
        </Card>
      </div>

      <Card>
        <SectionTitle>{t('site.photos')}</SectionTitle>
        <PhotoGrid siteId={site.id} uris={site.generalPhotos} onChange={(generalPhotos) => patch({ generalPhotos })} />
      </Card>

      <div className="section-head">
        <h2 className="block-title">{t('site.roomsTitle')}</h2>
        <Button title={t('site.addRoom')} variant="secondary" onClick={addRoom} />
      </div>

      {site.rooms.map((room, index) => (
        <Card key={room.id} className={activeRoomId === room.id ? 'room-card is-active' : 'room-card'}>
          <div className="section-head">
            <h3>{t('site.roomN', { n: index + 1 })}</h3>
            <Button
              title={t('common.delete')}
              variant="danger"
              onClick={() => setSite((s) => (s ? { ...s, rooms: s.rooms.filter((r) => r.id !== room.id) } : s))}
            />
          </div>
          <div className="form-grid">
            <Field label={t('site.roomName')}>
              <Input
                value={room.name}
                placeholder={t('site.roomNamePh')}
                onFocus={() => setActiveRoomId(room.id)}
                onChange={(e) => updateRoom(room.id, { name: e.target.value })}
              />
            </Field>
            <Field label={t('site.roomNotes')}>
              <Textarea
                value={room.notes}
                rows={2}
                onFocus={() => setActiveRoomId(room.id)}
                onChange={(e) => updateRoom(room.id, { notes: e.target.value })}
              />
            </Field>
          </div>

          {room.openings.map((op, oi) => (
            <div key={op.id} className="opening">
              <div className="section-head">
                <h4>{t('site.openingN', { n: oi + 1 })}</h4>
                <Button
                  title={t('common.delete')}
                  variant="danger"
                  onClick={() =>
                    updateRoom(room.id, { openings: room.openings.filter((o) => o.id !== op.id) })
                  }
                />
              </div>
              <div className="form-grid">
                <Select
                  label={t('site.type')}
                  value={op.type}
                  options={labels('opening_types').map((v) => ({ value: v, label: catalogLabel(v) }))}
                  onChange={(e) => updateOpening(room.id, op.id, { type: e.target.value })}
                />
                <Field label={t('site.ref')}>
                  <Input
                    value={op.ref}
                    placeholder={t('site.refPh')}
                    onChange={(e) => updateOpening(room.id, op.id, { ref: e.target.value })}
                  />
                </Field>
                <Field label={t('site.width')}>
                  <Input
                    value={op.width}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { width: e.target.value })}
                  />
                </Field>
                <Field label={t('site.height')}>
                  <Input
                    value={op.height}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { height: e.target.value })}
                  />
                </Field>
                <Select
                  label={t('site.pose')}
                  value={op.pose}
                  options={labels('pose_types').map((v) => ({ value: v, label: catalogLabel(v) }))}
                  onChange={(e) => updateOpening(room.id, op.id, { pose: e.target.value })}
                />
                <Field label={t('site.qty')}>
                  <Input
                    value={op.quantity}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { quantity: e.target.value })}
                  />
                </Field>
              </div>
              <span className="label">{t('site.color')}</span>
              <div className="color-row">
                <ColorSwatch value={op.colorRal} size={42} />
                <Select
                  value={op.colorRal}
                  options={[
                    { value: '', label: t('common.toDefine') },
                    ...labels('ral_colors').map((v) => ({ value: v, label: catalogLabel(v) })),
                  ]}
                  onChange={(e) => updateOpening(room.id, op.id, { colorRal: e.target.value })}
                />
              </div>
              <Field label={t('site.openingNotes')}>
                <Textarea
                  value={op.notes}
                  rows={2}
                  onChange={(e) => updateOpening(room.id, op.id, { notes: e.target.value })}
                />
              </Field>
              <PhotoGrid
                siteId={site.id}
                uris={op.photos}
                onChange={(photos) => updateOpening(room.id, op.id, { photos })}
              />
            </div>
          ))}
          <Button title={t('site.addOpeningLong')} variant="secondary" onClick={() => addOpening(room.id)} />
        </Card>
      ))}
      </>
      )}

      <div className="sticky-bar">
        {currentView === 'plan' ? (
          <Button title={saving ? t('common.saving') : t('common.save')} onClick={onSave} disabled={saving} />
        ) : (
          <>
            <div className="sticky-row">
              <Button title={t('site.addRoom')} variant="outline" onClick={addRoom} />
              <Button title={t('site.addOpening')} variant="outline" onClick={() => addOpening()} />
            </div>
            <div className="sticky-row">
              <Button title={saving ? t('common.saving') : t('common.save')} onClick={onSave} disabled={saving} />
              <Button title={t('site.reportPdf')} variant="secondary" onClick={onReport} />
            </div>
          </>
        )}
      </div>
      {planOpen ? (
        <PosePlanModal
          site={site}
          onCancel={() => setPlanOpen(false)}
          onConfirm={confirmPlan}
        />
      ) : null}
    </div>
  );
}
