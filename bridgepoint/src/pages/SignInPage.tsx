import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, SessionRole } from '../context/SessionContext';
import { referralService } from '../services';
import { PartnerOrg } from '../types';

/**
 * Identity selection, not authentication. Lets one person demo both sides
 * of a referral; replaced by real sign-in when the backend lands.
 */
export function SignInPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<SessionRole>('staff');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [partners, setPartners] = useState<PartnerOrg[]>([]);

  useEffect(() => {
    referralService.listPartners().then((rows) => {
      setPartners(rows);
      if (rows.length > 0) setPartnerOrgId((current) => current || rows[0].id);
    });
  }, []);

  const canSubmit =
    name.trim().length > 0 &&
    (role === 'staff' ? orgName.trim().length > 0 : partnerOrgId.length > 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    if (role === 'staff') {
      signIn({ role: 'staff', name: name.trim(), orgName: orgName.trim() });
      navigate('/referrals');
    } else {
      signIn({ role: 'partner', name: name.trim(), partnerOrgId });
      navigate('/inbox');
    }
  }

  return (
    <div className="container narrow">
      <div className="card">
        <h1>BridgePoint</h1>
        <p className="muted">
          Refer clients to partner organizations and follow what happens next.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="role">I am</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as SessionRole)}
            >
              <option value="staff">Staff at a referring organization</option>
              <option value="partner">Staff at a partner organization</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Ellis"
              autoComplete="name"
            />
          </div>

          {role === 'staff' ? (
            <div className="field">
              <label htmlFor="org">Your organization</label>
              <input
                id="org"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Downtown Outreach Team"
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="partner">Which partner organization</label>
              <select
                id="partner"
                value={partnerOrgId}
                onChange={(e) => setPartnerOrgId(e.target.value)}
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={!canSubmit}>
            Continue
          </button>
        </form>
      </div>

      <p className="muted small">
        This build stores data in your browser only. Nothing is transmitted to another
        organization until a backend is connected.
      </p>
    </div>
  );
}
