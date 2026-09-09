import { FormEvent, useEffect, useState } from 'react';
import { referralService } from '../services';
import { PartnerOrg, SERVICE_TYPES, ServiceType } from '../types';

export function PartnersPage() {
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notifyBy, setNotifyBy] = useState<'email' | 'sms'>('email');
  const [services, setServices] = useState<ServiceType[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setPartners(await referralService.listPartners());
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggleService(value: ServiceType) {
    setServices((current) =>
      current.includes(value) ? current.filter((s) => s !== value) : [...current, value],
    );
  }

  function resetForm() {
    setName('');
    setContactEmail('');
    setContactPhone('');
    setNotifyBy('email');
    setServices([]);
    setNotes('');
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const needsEmail = notifyBy === 'email' && contactEmail.trim().length === 0;
    const needsPhone = notifyBy === 'sms' && contactPhone.trim().length === 0;
    if (needsEmail || needsPhone) {
      setError(`Add a ${notifyBy === 'email' ? 'contact email' : 'contact phone'} so referrals can reach them.`);
      return;
    }

    await referralService.createPartner({
      name: name.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notifyBy,
      services,
      notes: notes.trim() || undefined,
      active: true,
    });
    resetForm();
    setShowForm(false);
    refresh();
  }

  async function toggleActive(partner: PartnerOrg) {
    await referralService.updatePartner(partner.id, { active: !partner.active });
    refresh();
  }

  return (
    <div className="container">
      <div className="between">
        <div>
          <h1>Partner organizations</h1>
          <p className="muted small">Where your referrals go, and how each partner is notified.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className={showForm ? 'secondary' : ''}>
          {showForm ? 'Cancel' : 'Add partner'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>New partner organization</h2>
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="pname">Organization name</label>
              <input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="pemail">Referral email</label>
                <input
                  id="pemail"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="intake@example.org"
                />
              </div>
              <div className="field">
                <label htmlFor="pphone">Referral phone</label>
                <input
                  id="pphone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="555-0100"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="notifyBy">Notify them by</label>
              <select
                id="notifyBy"
                value={notifyBy}
                onChange={(e) => setNotifyBy(e.target.value as 'email' | 'sms')}
              >
                <option value="email">Email</option>
                <option value="sms">Text message</option>
              </select>
            </div>

            <div className="field">
              <label>Services they provide</label>
              <div className="row">
                {SERVICE_TYPES.map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    className={services.includes(s.value) ? 'small' : 'secondary small'}
                    onClick={() => toggleService(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="pnotes">Notes (capacity, intake hours, eligibility)</label>
              <textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <button type="submit" disabled={name.trim().length === 0}>
              Save partner
            </button>
          </form>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="card empty">No partner organizations yet.</div>
      ) : (
        <ul className="list">
          {partners.map((p) => (
            <li key={p.id}>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="between">
                  <div>
                    <h3>
                      {p.name}{' '}
                      {!p.active && <span className="badge closed">Inactive</span>}
                    </h3>
                    <div className="muted small">
                      Notified by {p.notifyBy === 'email' ? 'email' : 'text'} &middot;{' '}
                      {(p.notifyBy === 'email' ? p.contactEmail : p.contactPhone) ?? 'no contact on file'}
                    </div>
                    <div className="row" style={{ marginTop: '0.4rem' }}>
                      {p.services.map((s) => (
                        <span key={s} className="badge accepted">
                          {SERVICE_TYPES.find((x) => x.value === s)?.label}
                        </span>
                      ))}
                    </div>
                    {p.notes && (
                      <p className="muted small" style={{ marginTop: '0.5rem' }}>
                        {p.notes}
                      </p>
                    )}
                  </div>
                  <button className="secondary small" onClick={() => toggleActive(p)}>
                    {p.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
