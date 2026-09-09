import { CLOSE_OUTCOMES, StatusEvent, STATUS_LABELS } from '../types';
import { formatDateTime } from '../utils/format';

export function Timeline({ history }: { history: StatusEvent[] }) {
  const ordered = [...history].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <ul className="timeline">
      {ordered.map((event) => {
        const outcome = event.outcome
          ? CLOSE_OUTCOMES.find((o) => o.value === event.outcome)?.label
          : null;
        return (
          <li key={event.id}>
            <div className="row">
              <strong>{STATUS_LABELS[event.status]}</strong>
              {outcome && <span className="muted small">{outcome}</span>}
            </div>
            <div className="muted small">
              {event.actorName} ({event.actorRole}) &middot; {formatDateTime(event.at)}
            </div>
            {event.note && <div className="small" style={{ marginTop: '0.25rem' }}>{event.note}</div>}
          </li>
        );
      })}
    </ul>
  );
}
