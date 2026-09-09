import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { referralService } from '../services';
import { PartnerOrg, Referral, SERVICE_TYPES } from '../types';
import { StatusBadge, UrgencyBadge } from '../components';
import { formatRelative } from '../utils/format';

const URGENCY_RANK = { emergency: 0, urgent: 1, routine: 2 } as const;

export function PartnerInboxPage() {
  const { session } = useSession();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [org, setOrg] = useState<PartnerOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    if (!session?.partnerOrgId) {
      setLoading(false);
      return;
    }
    Promise.all([
      referralService.listReferralsForPartner(session.partnerOrgId),
      referralService.listPartners(),
    ])
      .then(([rows, partners]) => {
        setReferrals(rows);
        setOrg(partners.find((p) => p.id === session.partnerOrgId) ?? null);
      })
      .finally(() => setLoading(false));
  }, [session?.partnerOrgId]);

  /** New and most urgent first -- this is a work queue, not a log. */
  const visible = useMemo(() => {
    const rows = showClosed ? referrals : referrals.filter((r) => r.status !== 'closed');
    return [...rows].sort((a, b) => {
      if (a.status === 'sent' && b.status !== 'sent') return -1;
      if (b.status === 'sent' && a.status !== 'sent') return 1;
      const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (byUrgency !== 0) return byUrgency;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [referrals, showClosed]);

  const awaiting = referrals.filter((r) => r.status === 'sent').length;

  if (!session?.partnerOrgId) {
    return (
      <div className="container">
        <div className="card empty">
          <p>Sign in as a partner organization to see your referral queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="between">
        <div>
          <h1>{org?.name ?? 'Referral inbox'}</h1>
          <p className="muted small">
            {awaiting > 0
              ? `${awaiting} new referral${awaiting === 1 ? '' : 's'} awaiting your response`
              : 'No new referrals awaiting response'}
          </p>
        </div>
        <button className="secondary small" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? 'Hide closed' : 'Show closed'}
        </button>
      </div>

      {loading ? (
        <div className="empty">Loading&hellip;</div>
      ) : visible.length === 0 ? (
        <div className="card empty">No referrals in your queue.</div>
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
                      {SERVICE_TYPES.find((s) => s.value === r.serviceType)?.label} &middot; from{' '}
                      {r.referredByOrg}
                    </div>
                  </div>
                  <div className="row">
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <div className="muted small" style={{ marginTop: '0.35rem' }}>
                  Received {formatRelative(r.createdAt)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
