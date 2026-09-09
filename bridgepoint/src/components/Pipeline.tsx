import { ReferralStatus, STATUS_LABELS, STATUS_PIPELINE } from '../types';

/**
 * Progress rail. A referral that skipped the waitlist should not show
 * "Waitlisted" as completed, so stages are matched against real history.
 */
export function Pipeline({
  status,
  visited,
}: {
  status: ReferralStatus;
  visited: ReferralStatus[];
}) {
  return (
    <ul className="pipeline">
      {STATUS_PIPELINE.map((stage) => {
        if (stage === 'waitlisted' && !visited.includes('waitlisted')) return null;
        const className = stage === status ? 'current' : visited.includes(stage) ? 'done' : '';
        return (
          <li key={stage} className={className}>
            {STATUS_LABELS[stage]}
          </li>
        );
      })}
    </ul>
  );
}
