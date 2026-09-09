import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { referralService } from '../services';
import { PartnerOrg, Referral, SERVICE_TYPES, URGENCY_LABELS } from '../types';
import { Pipeline, StatusBadge, Timeline, UrgencyBadge } from '../components';
import { formatDateTime } from '../utils/format';
import { StatusUpdateForm } from './StatusUpdateForm';

/**
 * The page a partner reaches from the link in their email or text. No account
 * required -- the token in the URL is the credential, which is why it is
 * generated from crypto randomness and never displayed outside the referral.
 */
export function PartnerLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [partner, setPartner] = useState<PartnerOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [confirmedName, setConfirmedName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const found = await referralService.getReferralByToken(token);
    setReferral(found);
    if (found) {
      const partners = await referralService.listPartners();
      setPartner(partners.find((p) => p.id === found.partnerOrgId) ?? null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="container empty">Loading&hellip;</div>;

  if (!referral) {
    return (
      <div className="container narrow">
        <div className="card empty">
          <h1>Link not recognized</h1>
          <p className="muted">
            This referral link is invalid or has expired. Contact the referring organization for a
            new one.
          </p>
        </div>
      </div>
    );
  }

  const serviceLabel = SERVICE_TYPES.find((s) => s.value === referral.serviceType)?.label;

  return (
    <div className="container narrow">
      <div className="card">
        <p className="muted small">Referral for {partner?.name ?? 'your organization'}</p>
        <div className="between">
          <div>
            <h1>{referral.clientName}</h1>
            <p className="muted small">
              {referral.reference} &middot; sent {formatDateTime(referral.createdAt)}
            </p>
          </div>
          <div className="row">
            <UrgencyBadge urgency={referral.urgency} />
            <StatusBadge status={referral.status} />
          </div>
        </div>
        <Pipeline status={referral.status} visited={referral.history.map((h) => h.status)} />
      </div>

      <div className="card">
        <h2>Details</h2>
        <div className="stack small">
          <div>
            <strong>Service needed:</strong> {serviceLabel}
          </div>
          <div>
            <strong>Urgency:</strong> {URGENCY_LABELS[referral.urgency]}
          </div>
          <div>
            <strong>Contact:</strong>{' '}
            {referral.preferredContact === 'through_staff'
              ? `Through ${referral.referredByName} at ${referral.referredByOrg}`
              : [referral.clientPhone, referral.clientEmail].filter(Boolean).join(' · ') || '—'}
          </div>
          <div>
            <strong>Referred by:</strong> {referral.referredByName}, {referral.referredByOrg}
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
        {confirmedName ? (
          <>
            <p className="muted small">
              Updating as {confirmedName}.{' '}
              <button
                className="secondary small"
                onClick={() => setConfirmedName(null)}
                style={{ marginLeft: '0.25rem' }}
              >
                Change
              </button>
            </p>
            <StatusUpdateForm
              referral={referral}
              actorName={confirmedName}
              actorRole="partner"
              onUpdated={setReferral}
            />
          </>
        ) : (
          <>
            <p className="muted small">
              Your name is recorded on the update so the referring organization knows who to follow
              up with.
            </p>
            <div className="field">
              <label htmlFor="partnerName">Your name</label>
              <input
                id="partnerName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Moreno"
              />
            </div>
            <button disabled={name.trim().length === 0} onClick={() => setConfirmedName(name.trim())}>
              Continue
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2>History</h2>
        <Timeline history={referral.history} />
      </div>
    </div>
  );
}
