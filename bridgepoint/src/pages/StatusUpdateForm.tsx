import { FormEvent, useEffect, useState } from 'react';
import { referralService } from '../services';
import {
  ALLOWED_TRANSITIONS,
  CLOSE_OUTCOMES,
  CloseOutcome,
  Referral,
  ReferralStatus,
  STATUS_LABELS,
} from '../types';

/**
 * Shared by the staff detail view and the partner's link-accessed view, so both
 * sides move a referral through exactly the same transitions.
 */
export function StatusUpdateForm({
  referral,
  actorName,
  actorRole,
  onUpdated,
}: {
  referral: Referral;
  actorName: string;
  actorRole: 'staff' | 'partner';
  onUpdated: (referral: Referral) => void;
}) {
  const options = ALLOWED_TRANSITIONS[referral.status];
  const [status, setStatus] = useState<ReferralStatus | ''>(options[0] ?? '');
  const [outcome, setOutcome] = useState<CloseOutcome>('services_started');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Re-seed the choice whenever the referral moves.
    setStatus(ALLOWED_TRANSITIONS[referral.status][0] ?? '');
    setNote('');
  }, [referral.status, referral.id]);

  if (options.length === 0) {
    return (
      <p className="muted small">
        This referral is closed. Its history is kept as a record and can no longer be changed.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await referralService.updateStatus(referral.id, {
        status,
        outcome: status === 'closed' ? outcome : undefined,
        note,
        actorName,
        actorRole,
      });
      onUpdated(updated);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the referral.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert error">{error}</div>}

      <div className="field">
        <label htmlFor="status">Move to</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReferralStatus)}
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {status === 'closed' && (
        <div className="field">
          <label htmlFor="outcome">Outcome</label>
          <select
            id="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CloseOutcome)}
          >
            {CLOSE_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="note">Note (optional)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What changed, and anything the other organization should know."
        />
      </div>

      <button type="submit" disabled={saving || !status}>
        {saving ? 'Saving…' : 'Save update'}
      </button>
    </form>
  );
}
