import { Button, Field, Input } from './ui';
import { useI18n } from '../i18n';
import type { PosePlan } from '../followUp';
import { useState } from 'react';

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
  const [poseDate, setPoseDate] = useState(initial?.poseDate || '');
  const [reminder1, setReminder1] = useState(initial?.reminder1 || '');
  const [reminder2, setReminder2] = useState(initial?.reminder2 || '');

  const submit = () => {
    if (!poseDate.trim() || !reminder1.trim() || !reminder2.trim()) {
      alert(t('plan.needAll'));
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
        <Field label={t('plan.poseDate')}>
          <Input type="date" value={poseDate} onChange={(e) => setPoseDate(e.target.value)} />
        </Field>
        <Field label={t('plan.reminder1')}>
          <Input type="datetime-local" value={reminder1} onChange={(e) => setReminder1(e.target.value)} />
        </Field>
        <Field label={t('plan.reminder2')}>
          <Input type="datetime-local" value={reminder2} onChange={(e) => setReminder2(e.target.value)} />
        </Field>
        <p className="hint">{t('plan.hint')}</p>
        <div className="sticky-row">
          <Button title={t('plan.cancel')} variant="outline" onClick={onCancel} />
          <Button title={t('plan.confirm')} onClick={submit} />
        </div>
      </div>
    </div>
  );
}
