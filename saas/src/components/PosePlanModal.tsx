import { useState } from 'react';
import { Button, Field, Input } from './ui';
import { useI18n } from '../i18n';
import type { PosePlan } from '../followUp';

type Tab = 'pose' | 'r1' | 'r2';

export function PosePlanModal({
  clientName,
  initial,
  onCancel,
  onConfirm,
}: {
  clientName: string;
  initial?: PosePlan;
  onCancel: () => void;
  onConfirm: (plan: PosePlan) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('pose');
  const [poseDate, setPoseDate] = useState(initial?.poseDate || '');
  const [reminder1, setReminder1] = useState(initial?.reminder1 || '');
  const [reminder2, setReminder2] = useState(initial?.reminder2 || '');

  const submit = () => {
    if (!poseDate.trim() || !reminder1.trim() || !reminder2.trim()) {
      alert(t('plan.needAll'));
      if (!poseDate.trim()) setTab('pose');
      else if (!reminder1.trim()) setTab('r1');
      else setTab('r2');
      return;
    }
    onConfirm({ poseDate, reminder1, reminder2 });
  };

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="kicker">{clientName || t('home.noName')}</p>
        <h2 id="plan-title">{t('plan.title')}</h2>
        <p className="subtitle">{t('plan.subtitle')}</p>
        <div className="plan-tabs" role="tablist">
          <button type="button" role="tab" className={tab === 'pose' ? 'is-active' : ''} onClick={() => setTab('pose')}>
            {t('plan.tabPose')}
          </button>
          <button type="button" role="tab" className={tab === 'r1' ? 'is-active' : ''} onClick={() => setTab('r1')}>
            {t('plan.tabR1')}
          </button>
          <button type="button" role="tab" className={tab === 'r2' ? 'is-active' : ''} onClick={() => setTab('r2')}>
            {t('plan.tabR2')}
          </button>
        </div>
        {tab === 'pose' ? (
          <Field label={t('plan.poseDate')}>
            <Input type="date" value={poseDate} onChange={(e) => setPoseDate(e.target.value)} />
          </Field>
        ) : null}
        {tab === 'r1' ? (
          <Field label={t('plan.reminder1')}>
            <Input type="datetime-local" value={reminder1} onChange={(e) => setReminder1(e.target.value)} />
          </Field>
        ) : null}
        {tab === 'r2' ? (
          <Field label={t('plan.reminder2')}>
            <Input type="datetime-local" value={reminder2} onChange={(e) => setReminder2(e.target.value)} />
          </Field>
        ) : null}
        <p className="hint">{t('plan.hint')}</p>
        <div className="sticky-row">
          <Button title={t('plan.cancel')} variant="outline" onClick={onCancel} />
          <Button title={t('plan.confirm')} onClick={submit} />
        </div>
      </div>
    </div>
  );
}
