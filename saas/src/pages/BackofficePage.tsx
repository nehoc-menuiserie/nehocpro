import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATALOG_SECTIONS, useCatalog, type CatalogKind } from '../catalog';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle } from '../components/ui';

function Section({ kind, title, hint, isColor }: { kind: CatalogKind; title: string; hint: string; isColor?: boolean }) {
  const { items, addItem, removeItem } = useCatalog();
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#701616');
  const list = useMemo(
    () => items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position),
    [items, kind]
  );

  const add = async () => {
    if (!label.trim()) {
      alert('Indiquez un nom.');
      return;
    }
    await addItem(kind, label, isColor ? hex : undefined);
    setLabel('');
  };

  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <p className="hint">{hint}</p>
      {list.map((item) => (
        <div key={item.id} className="catalog-row">
          {isColor ? <ColorSwatch value={item.label} size={28} /> : null}
          <span>
            {item.label}
            {item.extra.hex ? `  ${item.extra.hex}` : ''}
          </span>
          <button type="button" className="delete-link" onClick={() => removeItem(item.id)}>
            Suppr.
          </button>
        </div>
      ))}
      <Field label="Nouveau">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom à ajouter" />
      </Field>
      {isColor ? (
        <Field label="Couleur écran (#hex)">
          <Input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#701616" />
        </Field>
      ) : null}
      <Button title="Ajouter" variant="secondary" onClick={add} />
    </Card>
  );
}

export function BackofficePage() {
  const navigate = useNavigate();
  return (
    <div className="page narrow">
      <Button title="← Accueil" variant="ghost" onClick={() => navigate('/')} />
      <p className="kicker">NEHOCPRO</p>
      <h1>Back office</h1>
      <p className="subtitle">Ajoutez ou retirez les listes utilisées dans les relevés. Les 4 utilisateurs voient les mêmes choix.</p>
      <div className="backoffice-grid">
        {CATALOG_SECTIONS.map((section) => (
          <Section
            key={section.kind}
            kind={section.kind}
            title={section.title}
            hint={section.hint}
            isColor={section.color}
          />
        ))}
      </div>
    </div>
  );
}
