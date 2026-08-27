import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoGrid } from '../components/PhotoGrid';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle, Select, Textarea } from '../components/ui';
import { useCatalog } from '../catalog';
import { useSites } from '../context';
import { createEmptyOpening, createEmptyRoom, createEmptySite } from '../storage';
import type { Opening, Room, Site } from '../types';

export function SitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSite, upsert, ready } = useSites();
  const { labels } = useCatalog();
  const isNew = !id || id === 'new';
  const [site, setSite] = useState<Site | null>(null);
  const [missing, setMissing] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const found = isNew ? undefined : getSite(id || '');
    if (!isNew && !found) {
      setMissing(true);
      setSite(null);
      return;
    }
    setMissing(false);
    const next = found ? (JSON.parse(JSON.stringify(found)) as Site) : createEmptySite();
    setSite(next);
    setActiveRoomId(next.rooms[0]?.id || '');
  }, [ready, id, isNew]);

  if (missing) {
    return (
      <div className="page">
        <Button title="← Accueil" variant="ghost" onClick={() => navigate('/')} />
        <p className="subtitle">Chantier introuvable.</p>
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
      alert('Sélectionnez la personne qui effectue le relevé.');
      return false;
    }
    if (!site.clientName.trim()) {
      alert('Indiquez le nom du client.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await upsert(site);
      alert('Le chantier a été enregistré.');
      if (isNew) navigate(`/site/${site.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const onReport = async () => {
    if (!validate()) return;
    await upsert(site);
    navigate(`/report/${site.id}`);
  };

  return (
    <div className="page site-page">
      <header className="page-head">
        <Button title="← Accueil" variant="ghost" onClick={() => navigate('/')} />
        <div className="page-head-center">
          <h1>{isNew ? 'Nouveau chantier' : 'Chantier'}</h1>
          <p>
            {site.rooms.length} pièce{site.rooms.length > 1 ? 's' : ''} · {openingCount} menuiserie
            {openingCount > 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <div className="site-grid">
        <Card>
          <SectionTitle>Responsable du relevé</SectionTitle>
          <Select
            label="Relevé effectué par *"
            value={site.author}
            options={['', ...labels('authors')]}
            onChange={(e) => patch({ author: e.target.value })}
          />
        </Card>

        <Card>
          <SectionTitle>Client et chantier</SectionTitle>
          <div className="form-grid">
            <Field label="Nom du client *">
              <Input value={site.clientName} onChange={(e) => patch({ clientName: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <Input value={site.clientPhone} onChange={(e) => patch({ clientPhone: e.target.value })} type="tel" />
            </Field>
            <Field label="E-mail">
              <Input value={site.clientEmail} onChange={(e) => patch({ clientEmail: e.target.value })} type="email" />
            </Field>
            <Field label="Adresse du chantier">
              <Input value={site.address} onChange={(e) => patch({ address: e.target.value })} />
            </Field>
            <Select
              label="Type de chantier"
              value={site.siteType}
              options={labels('site_types')}
              onChange={(e) => patch({ siteType: e.target.value })}
            />
            <Select
              label="Nature des travaux"
              value={site.workType}
              options={labels('work_types')}
              onChange={(e) => patch({ workType: e.target.value })}
            />
          </div>
          <Field label="Notes générales">
            <Textarea value={site.generalNotes} onChange={(e) => patch({ generalNotes: e.target.value })} rows={4} />
          </Field>
        </Card>
      </div>

      <Card>
        <SectionTitle>Photos générales</SectionTitle>
        <PhotoGrid uris={site.generalPhotos} onChange={(generalPhotos) => patch({ generalPhotos })} />
      </Card>

      <div className="section-head">
        <h2 className="block-title">Pièces et menuiseries</h2>
        <Button title="+ Pièce" variant="secondary" onClick={addRoom} />
      </div>

      {site.rooms.map((room, index) => (
        <Card key={room.id} className={activeRoomId === room.id ? 'room-card is-active' : 'room-card'}>
          <div className="section-head">
            <h3>Pièce {index + 1}</h3>
            <Button
              title="Supprimer"
              variant="danger"
              onClick={() => setSite((s) => (s ? { ...s, rooms: s.rooms.filter((r) => r.id !== room.id) } : s))}
            />
          </div>
          <div className="form-grid">
            <Field label="Nom de la pièce">
              <Input
                value={room.name}
                placeholder="Ex. Séjour, Chambre 1…"
                onFocus={() => setActiveRoomId(room.id)}
                onChange={(e) => updateRoom(room.id, { name: e.target.value })}
              />
            </Field>
            <Field label="Notes sur la pièce">
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
                <h4>Menuiserie {oi + 1}</h4>
                <Button
                  title="Supprimer"
                  variant="danger"
                  onClick={() =>
                    updateRoom(room.id, { openings: room.openings.filter((o) => o.id !== op.id) })
                  }
                />
              </div>
              <div className="form-grid">
                <Select
                  label="Type"
                  value={op.type}
                  options={labels('opening_types')}
                  onChange={(e) => updateOpening(room.id, op.id, { type: e.target.value })}
                />
                <Field label="Repère">
                  <Input
                    value={op.ref}
                    placeholder="Ex. F01"
                    onChange={(e) => updateOpening(room.id, op.id, { ref: e.target.value })}
                  />
                </Field>
                <Field label="Largeur (mm)">
                  <Input
                    value={op.width}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { width: e.target.value })}
                  />
                </Field>
                <Field label="Hauteur (mm)">
                  <Input
                    value={op.height}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { height: e.target.value })}
                  />
                </Field>
                <Select
                  label="Type de pose"
                  value={op.pose}
                  options={labels('pose_types')}
                  onChange={(e) => updateOpening(room.id, op.id, { pose: e.target.value })}
                />
                <Field label="Quantité">
                  <Input
                    value={op.quantity}
                    inputMode="numeric"
                    onChange={(e) => updateOpening(room.id, op.id, { quantity: e.target.value })}
                  />
                </Field>
              </div>
              <span className="label">Couleur extérieure (RAL)</span>
              <div className="color-row">
                <ColorSwatch value={op.colorRal} size={42} />
                <Select
                  value={op.colorRal}
                  options={[{ value: '', label: 'À définir' }, ...labels('ral_colors').map((v) => ({ value: v, label: v }))]}
                  onChange={(e) => updateOpening(room.id, op.id, { colorRal: e.target.value })}
                />
              </div>
              <Field label="Notes">
                <Textarea
                  value={op.notes}
                  rows={2}
                  onChange={(e) => updateOpening(room.id, op.id, { notes: e.target.value })}
                />
              </Field>
              <PhotoGrid uris={op.photos} onChange={(photos) => updateOpening(room.id, op.id, { photos })} />
            </div>
          ))}
          <Button title="+ Ajouter une menuiserie" variant="secondary" onClick={() => addOpening(room.id)} />
        </Card>
      ))}

      <div className="sticky-bar">
        <div className="sticky-row">
          <Button title="+ Pièce" variant="outline" onClick={addRoom} />
          <Button title="+ Menuiserie" variant="outline" onClick={() => addOpening()} />
        </div>
        <div className="sticky-row">
          <Button title={saving ? 'Enregistrement…' : 'Enregistrer'} onClick={onSave} disabled={saving} />
          <Button title="Rapport PDF" variant="secondary" onClick={onReport} />
        </div>
      </div>
    </div>
  );
}
