import { FOLLOW_UP_STATUSES, followUpTone, type FollowUpStatus } from '../followUp';

export function FollowUpPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: FollowUpStatus) => void;
}) {
  return (
    <div className="follow-chips" role="listbox" aria-label="Suivi du chantier">
      {FOLLOW_UP_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="option"
          aria-selected={value === status}
          className={`follow-chip follow-${followUpTone(status)}${value === status ? ' is-active' : ''}`}
          onClick={() => onChange(status)}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
