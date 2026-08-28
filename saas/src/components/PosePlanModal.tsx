import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Button, DateTimeFields, Field, Input } from './ui';
import { useI18n } from '../i18n';
import type { PosePlan } from '../followUp';

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
    const complete = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
    if (!poseDate.trim() || !complete.test(reminder1) || !complete.test(reminder2)) {
      alert(t('plan.needAll'));
      return;
    }
    onConfirm({ poseDate, reminder1, reminder2 });
  };

  return createPortal(
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
          <DateTimeFields value={reminder1} onChange={setReminder1} />
        </Field>
        <Field label={t('plan.reminder2')}>
          <DateTimeFields value={reminder2} onChange={setReminder2} />
        </Field>
        <p className="hint">{t('plan.hint')}</p>
        <div className="sticky-row">
          <Button title={t('plan.cancel')} variant="outline" onClick={onCancel} />
          <Button title={t('plan.confirm')} onClick={submit} />
        </div>
      </div>
    </div>,
    document.body
  );
}
