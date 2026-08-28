import { FOLLOW_UP_STATUSES, followUpTone, type FollowUpStatus } from '../followUp';
import { useI18n } from '../i18n';

export function FollowUpPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: FollowUpStatus) => void;
}) {
  const { t, followLabel } = useI18n();
  return (
    <div className="follow-chips" role="listbox" aria-label={t('site.followTitle')}>
      {FOLLOW_UP_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="option"
          aria-selected={value === status}
          className={`follow-chip follow-${followUpTone(status)}${value === status ? ' is-active' : ''}`}
          onClick={() => onChange(status)}
        >
          {followLabel(status)}
        </button>
      ))}
    </div>
  );
}
