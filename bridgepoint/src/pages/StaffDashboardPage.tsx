import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { referralService } from '../services';
import { PartnerOrg, Referral, ReferralStatus, SERVICE_TYPES, STATUS_LABELS } from '../types';
import { StatusBadge, UrgencyBadge } from '../components';
import { formatRelative } from '../utils/format';

type Filter = 'open' | ReferralStatus | 'all';

export function StaffDashboardPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([referralService.listReferrals(), referralService.listPartners()])
      .then(([r, p]) => {
        setReferrals(r);
        setPartners(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const partnerName = (id: string) =>
    partners.find((p) => p.id === id)?.name ?? 'Unknown organization';

  const visible = useMemo(() => {
    if (filter === 'all') return referrals;
    if (filter === 'open') return referrals.filter((r) => r.status !== 'closed');
    return referrals.filter((r) => r.status === filter);
  }, [referrals, filter]);

  const counts = useMemo(() => {
    return {
      open: referrals.filter((r) => r.status !== 'closed').length,
      waitlisted: referrals.filter((r) => r.status === 'waitlisted').length,
      needsAttention: referrals.filter(
        (r) => r.status === 'sent' && Date.now() - new Date(r.createdAt).getTime() > 48 * 3600 * 1000,
      ).length,
    };
  }, [referrals]);

  return (
    <div className="container">
      <div className="between">
        <div>
          <h1>Referrals</h1>
          <p className="muted small">
            {counts.open} open &middot; {counts.waitlisted} waitlisted
            {counts.needsAttention > 0 && (
              <> &middot; {counts.needsAttention} unacknowledged for over 48 hours</>
            )}
          </p>
        </div>
        <Link to="/referrals/new">
          <button>New referral</button>
        </Link>
      </div>

      {counts.needsAttention > 0 && (
        <div className="alert info">
          {counts.needsAttention} referral{counts.needsAttention === 1 ? ' has' : 's have'} not been
          acknowledged by the partner organization in over 48 hours. Consider following up by phone.
        </div>
      )}

      <div className="row" style={{ marginBottom: '1rem' }}>
        {(['open', 'sent', 'accepted', 'waitlisted', 'in_progress', 'closed', 'all'] as Filter[]).map(
          (f) => (
            <button
              key={f}
              className={filter === f ? 'small' : 'secondary small'}
              onClick={() => setFilter(f)}
            >
              {f === 'open' ? 'Open' : f === 'all' ? 'All' : STATUS_LABELS[f as ReferralStatus]}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="empty">Loading&hellip;</div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <p>No referrals here yet.</p>
          <Link to="/referrals/new">
            <button>Create the first one</button>
          </Link>
        </div>
      ) : (
        <ul className="list">
          {visible.map((r) => (
            <li key={r.id}>
              <Link className="referral-row" to={`/referrals/${r.id}`}>
                <div className="between">
                  <div>
                    <strong>{r.clientName}</strong>{' '}
                    <span className="muted small">{r.reference}</span>
                    <div className="muted small">
                      {SERVICE_TYPES.find((s) => s.value === r.serviceType)?.label} &rarr;{' '}
                      {partnerName(r.partnerOrgId)}
                    </div>
                  </div>
                  <div className="row">
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <div className="muted small" style={{ marginTop: '0.35rem' }}>
                  Updated {formatRelative(r.updatedAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
