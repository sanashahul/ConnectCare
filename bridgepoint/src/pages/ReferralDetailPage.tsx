import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { notifier, OutboxEntry, referralService, statusLinkFor } from '../services';
import {
  CLOSE_OUTCOMES,
  PartnerOrg,
  Referral,
  SERVICE_TYPES,
  URGENCY_LABELS,
} from '../types';
import { Pipeline, StatusBadge, Timeline, UrgencyBadge } from '../components';
import { formatDateTime } from '../utils/format';
import { StatusUpdateForm } from './StatusUpdateForm';

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { session } = useSession();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [partner, setPartner] = useState<PartnerOrg | null>(null);
  const [outbox, setOutbox] = useState<OutboxEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const justCreated = searchParams.get('created') === '1';

  const load = useCallback(async () => {
    if (!id) return;
    const found = await referralService.getReferral(id);
    setReferral(found);
    if (found) {
      const partners = await referralService.listPartners();
      setPartner(partners.find((p) => p.id === found.partnerOrgId) ?? null);
      const entries = await notifier.listOutbox();
      setOutbox(entries.find((e) => e.referralId === found.id) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyMessage() {
    if (!outbox) return;
    try {
      await navigator.clipboard.writeText(outbox.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (loading) return <div className="container empty">Loading&hellip;</div>;
  if (!referral) {
    return (
      <div className="container">
        <div className="card empty">
          <p>That referral could not be found.</p>
          <Link to="/referrals">Back to referrals</Link>
        </div>
      </div>
    );
  }

  const visited = referral.history.map((h) => h.status);
  const serviceLabel = SERVICE_TYPES.find((s) => s.value === referral.serviceType)?.label;
  const outcomeLabel = referral.outcome
    ? CLOSE_OUTCOMES.find((o) => o.value === referral.outcome)?.label
    : null;

  return (
    <div className="container">
      <Link to={session?.role === 'partner' ? '/inbox' : '/referrals'} className="small">
        &larr; Back
      </Link>

      {justCreated && (
        <div className="alert success" style={{ marginTop: '0.75rem' }}>
          Referral created. The notification below is ready for {partner?.name ?? 'the partner'}.
        </div>
      )}

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="between">
          <div>
            <h1>{referral.clientName}</h1>
            <p className="muted small">
              {referral.reference} &middot; created {formatDateTime(referral.createdAt)}
            </p>
          </div>
          <div className="row">
            <UrgencyBadge urgency={referral.urgency} />
            <StatusBadge status={referral.status} />
          </div>
        </div>

        <Pipeline status={referral.status} visited={visited} />

        {outcomeLabel && (
          <p className="small" style={{ marginTop: '0.75rem' }}>
            <strong>Outcome:</strong> {outcomeLabel}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Referral details</h2>
        <div className="stack small">
          <div>
            <strong>Service:</strong> {serviceLabel}
          </div>
          <div>
            <strong>Urgency:</strong> {URGENCY_LABELS[referral.urgency]}
          </div>
          <div>
            <strong>Sent to:</strong> {partner?.name ?? 'Unknown organization'}
          </div>
          <div>
            <strong>Referred by:</strong> {referral.referredByName}, {referral.referredByOrg}
          </div>
          <div>
            <strong>Contact:</strong>{' '}
            {referral.preferredContact === 'through_staff'
              ? `Through ${referral.referredByName}`
              : [referral.clientPhone, referral.clientEmail].filter(Boolean).join(' · ') || '—'}
          </div>
          {referral.note && (
            <div>
              <strong>Note:</strong> {referral.note}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Update status</h2>
        <StatusUpdateForm
          referral={referral}
          actorName={session?.name ?? 'Unknown'}
          actorRole={session?.role ?? 'staff'}
          onUpdated={(updated) => setReferral(updated)}
        />
      </div>

      {outbox && session?.role === 'staff' && (
        <div className="card">
          <h2>Partner notification</h2>
          <p className="muted small">
            Delivery over {outbox.channel === 'email' ? 'email' : 'SMS'} needs a backend, so this
            build composes the message for you to send from your own account. The link inside lets{' '}
            {partner?.name ?? 'the partner'} update status without an account.
          </p>
          <div className="row" style={{ marginBottom: '0.6rem' }}>
            <span className="badge closed">To: {outbox.to || 'no address on file'}</span>
            {outbox.subject && <span className="muted small">{outbox.subject}</span>}
          </div>
          <div className="message-preview">{outbox.body}</div>
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button className="secondary small" onClick={copyMessage}>
              {copied ? 'Copied' : 'Copy message'}
            </button>
            {outbox.channel === 'email' && outbox.to && (
              <a
                href={`mailto:${outbox.to}?subject=${encodeURIComponent(
                  outbox.subject ?? '',
                )}&body=${encodeURIComponent(outbox.body)}`}
              >
                <button className="secondary small">Open in mail client</button>
              </a>
            )}
            <Link to={`/r/${referral.token}`} className="small">
              Preview the partner&rsquo;s view
            </Link>
          </div>
          <p className="muted small" style={{ marginTop: '0.6rem', wordBreak: 'break-all' }}>
            Status link: {statusLinkFor(referral.token)}
          </p>
        </div>
      )}

      <div className="card">
        <h2>History</h2>
        <Timeline history={referral.history} />
      </div>
    </div>
  );
}
