import { ReferralStatus, STATUS_LABELS } from '../types';

export function StatusBadge({ status }: { status: ReferralStatus }) {
  return <span className={`badge ${status}`}>{STATUS_LABELS[status]}</span>;
}
