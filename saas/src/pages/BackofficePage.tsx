import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATALOG_SECTIONS, useCatalog, type CatalogKind } from '../catalog';
import { Button, Card, ColorSwatch, Field, Input, SectionTitle } from '../components/ui';
import { LanguageSwitcher, useI18n, type MsgKey } from '../i18n';

const SECTION_KEYS: Record<CatalogKind, { title: MsgKey; hint: MsgKey }> = {
  authors: { title: 'bo.authors', hint: 'bo.authorsHint' },
  site_types: { title: 'bo.siteTypes', hint: 'bo.siteTypesHint' },
  work_types: { title: 'bo.workTypes', hint: 'bo.workTypesHint' },
  opening_types: { title: 'bo.openings', hint: 'bo.openingsHint' },
  pose_types: { title: 'bo.poses', hint: 'bo.posesHint' },
  ral_colors: { title: 'bo.colors', hint: 'bo.colorsHint' },
};

function Section({ kind, isColor }: { kind: CatalogKind; isColor?: boolean }) {
  const { items, addItem, removeItem } = useCatalog();
  const { t } = useI18n();
  const [label, setLabel] = useState('');
  const [hex, setHex] = useState('#701616');
  const list = useMemo(
    () => items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position),
    [items, kind]
  );
  const copy = SECTION_KEYS[kind];

  const add = async () => {
    if (!label.trim()) {
      alert(t('bo.needName'));
      return;
    }
    await addItem(kind, label, isColor ? hex : undefined);
    setLabel('');
  };

  return (
    <Card>
      <SectionTitle>{t(copy.title)}</SectionTitle>
      <p className="hint">{t(copy.hint)}</p>
      {list.map((item) => (
        <div key={item.id} className="catalog-row">
          {isColor ? <ColorSwatch value={item.label} size={28} /> : null}
          <span>
            {item.label}
            {item.extra.hex ? `  ${item.extra.hex}` : ''}
          </span>
          <button type="button" className="delete-link" onClick={() => removeItem(item.id)}>
            {t('bo.delete')}
          </button>
        </div>
      ))}
      <Field label={t('bo.new')}>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('bo.newPh')} />
      </Field>
      {isColor ? (
        <Field label={t('bo.hex')}>
          <Input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#701616" />
        </Field>
      ) : null}
      <Button title={t('common.add')} variant="secondary" onClick={add} />
    </Card>
  );
}

export function BackofficePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="page narrow">
      <div className="section-head">
        <Button title={t('common.backHome')} variant="ghost" onClick={() => navigate('/')} />
        <LanguageSwitcher />
      </div>
      <p className="kicker">NEHOCPRO</p>
      <h1>{t('bo.title')}</h1>
      <p className="subtitle">{t('bo.subtitle')}</p>
      <div className="backoffice-grid">
        {CATALOG_SECTIONS.map((section) => (
          <Section key={section.kind} kind={section.kind} isColor={section.color} />
        ))}
      </div>
    </div>
  );
}
