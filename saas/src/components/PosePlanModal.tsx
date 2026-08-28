import { createPortal } from 'react-dom';
import { useState } from 'react';
import { planCalendarHref } from '../calendar';
import { SIGNED_STATUS, type PosePlan } from '../followUp';
import { useI18n } from '../i18n';
import type { Site } from '../types';
import { Button, DateTimeFields, Field, Input } from './ui';

const COMPLETE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function PosePlanModal({
  site,
  onCancel,
  onConfirm,
}: {
  site: Site;
  onCancel: () => void;
  onConfirm: (plan: PosePlan) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [poseDate, setPoseDate] = useState(site.poseDate || '');
  const [reminder1, setReminder1] = useState(site.reminder1 || '');
  const [reminder2, setReminder2] = useState(site.reminder2 || '');

  const ready = Boolean(poseDate.trim() && COMPLETE.test(reminder1) && COMPLETE.test(reminder2));
  const draft: Site = {
    ...site,
    followUpStatus: SIGNED_STATUS,
    poseDate,
    reminder1,
    reminder2,
  };

  return createPortal(
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-labelledby="plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card-body">
          <p className="kicker">{site.clientName || t('home.noName')}</p>
          <h2 id="plan-title">{t('plan.title')}</h2>
          <p className="subtitle">{t('plan.subtitleShort')}</p>
          <Field label={t('plan.poseDate')}>
            <Input type="date" value={poseDate} onChange={(e) => setPoseDate(e.target.value)} />
          </Field>
          <Field label={t('plan.reminder1')}>
            <DateTimeFields value={reminder1} onChange={setReminder1} />
          </Field>
          <Field label={t('plan.reminder2')}>
            <DateTimeFields value={reminder2} onChange={setReminder2} />
          </Field>
        </div>
        <div className="modal-card-actions">
          <Button title={t('plan.cancel')} variant="outline" onClick={onCancel} />
          <a
            className="btn btn-primary"
            href={ready ? planCalendarHref(draft) : '#'}
            onClick={async (e) => {
              e.preventDefault();
              if (!ready) {
                alert(t('plan.needAll'));
                return;
              }
              try {
                await onConfirm({ poseDate, reminder1, reminder2 });
                window.location.assign(planCalendarHref(draft));
              } catch {
                // save already showed an error
              }
            }}
          >
            {t('plan.confirm')}
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
