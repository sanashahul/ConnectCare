import { Urgency, URGENCY_LABELS } from '../types';

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === 'routine') return null;
  return <span className={`badge ${urgency}`}>{URGENCY_LABELS[urgency]}</span>;
}
