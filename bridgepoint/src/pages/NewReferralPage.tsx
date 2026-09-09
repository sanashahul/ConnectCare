import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { notifier, referralService } from '../services';
import {
  ContactMethod,
  PartnerOrg,
  SERVICE_TYPES,
  ServiceType,
  Urgency,
  URGENCY_LABELS,
} from '../types';

export function NewReferralPage() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [preferredContact, setPreferredContact] = useState<ContactMethod>('phone');
  const [serviceType, setServiceType] = useState<ServiceType>('shelter');
  const [urgency, setUrgency] = useState<Urgency>('routine');
  const [note, setNote] = useState('');
  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    referralService.listPartners().then((rows) => setPartners(rows.filter((p) => p.active)));
  }, []);

  /** Surface partners who actually offer the requested service first. */
  const suggested = useMemo(
    () => partners.filter((p) => p.services.includes(serviceType)),
    [partners, serviceType],
  );
  const others = useMemo(
    () => partners.filter((p) => !p.services.includes(serviceType)),
    [partners, serviceType],
  );

  useEffect(() => {
    // Keep the selection sensible as the service type changes.
    if (suggested.length > 0 && !suggested.some((p) => p.id === partnerOrgId)) {
      setPartnerOrgId(suggested[0].id);
    } else if (suggested.length === 0 && partners.length > 0 && !partnerOrgId) {
      setPartnerOrgId(partners[0].id);
    }
  }, [suggested, partners, partnerOrgId]);

  const hasContact =
    clientPhone.trim().length > 0 ||
    clientEmail.trim().length > 0 ||
    preferredContact === 'through_staff';

  const canSubmit = clientName.trim().length > 0 && partnerOrgId.length > 0 && hasContact;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session || session.role !== 'staff' || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const referral = await referralService.createReferral(
        {
          clientName,
          clientPhone,
          clientEmail,
          preferredContact,
          serviceType,
          urgency,
          note,
          partnerOrgId,
        },
        session.name,
        session.orgName ?? '',
      );

      const partner = partners.find((p) => p.id === partnerOrgId);
      if (partner) {
        await notifier.notifyPartner(referral, partner);
      }

      navigate(`/referrals/${referral.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the referral.');
      setSubmitting(false);
    }
  }

  return (
    <div className="container narrow">
      <Link to="/referrals" className="small">
        &larr; Back to referrals
      </Link>
      <h1 style={{ marginTop: '0.75rem' }}>New referral</h1>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2>Who needs help</h2>
          <div className="field">
            <label htmlFor="clientName">Client name</label>
            <input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="clientPhone">Phone</label>
              <input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="555-0100"
                inputMode="tel"
              />
            </div>
            <div className="field">
              <label htmlFor="clientEmail">Email</label>
              <input
                id="clientEmail"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="optional"
                inputMode="email"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="preferredContact">Best way to reach them</label>
            <select
              id="preferredContact"
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value as ContactMethod)}
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="through_staff">Through me (no direct contact)</option>
            </select>
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              Choose &ldquo;through me&rdquo; when the client has no reliable phone or address.
            </p>
          </div>

          {!hasContact && clientName.trim().length > 0 && (
            <div className="alert info">
              Add a phone or email, or set contact to &ldquo;through me&rdquo; so the partner knows
              how to reach this client.
            </div>
          )}
        </div>

        <div className="card">
          <h2>What they need</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="serviceType">Service</label>
              <select
                id="serviceType"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="urgency">Urgency</label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
              >
                {(Object.keys(URGENCY_LABELS) as Urgency[]).map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">Note for the partner (optional)</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the partner needs to know to serve this person well."
            />
            <p className="muted small" style={{ marginTop: '0.35rem' }}>
              Share only what the partner needs. This note goes to another organization.
            </p>
          </div>
        </div>

        <div className="card">
          <h2>Send to</h2>
          <div className="field">
            <label htmlFor="partner">Partner organization</label>
            <select
              id="partner"
              value={partnerOrgId}
              onChange={(e) => setPartnerOrgId(e.target.value)}
            >
              {suggested.length > 0 && (
                <optgroup label="Offers this service">
                  {suggested.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label="Other partners">
                  {others.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {partners.length === 0 && (
            <div className="alert info">
              No partner organizations yet. <Link to="/partners">Add one first.</Link>
            </div>
          )}

          <button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Sending…' : 'Send referral'}
          </button>
        </div>
      </form>
    </div>
  );
}
