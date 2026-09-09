/**
 * Referral data access.
 *
 * `ReferralService` is the contract the UI codes against. `LocalReferralService`
 * implements it on top of localStorage so the app runs with no backend today.
 * A future `HttpReferralService` implementing the same interface can be swapped
 * in at the bottom of this file without touching a single screen.
 */

import {
  ALLOWED_TRANSITIONS,
  NewReferralInput,
  PartnerOrg,
  Referral,
  StatusEvent,
  StatusUpdateInput,
} from '../types';
import { generateId, generateReference, generateToken } from './ids';
import { read, write } from './storage';

const REFERRALS_KEY = 'referrals';
const PARTNERS_KEY = 'partners';

export interface ReferralService {
  listReferrals(): Promise<Referral[]>;
  /** Referrals addressed to one partner organization. */
  listReferralsForPartner(partnerOrgId: string): Promise<Referral[]>;
  getReferral(id: string): Promise<Referral | null>;
  /** Lookup by the token embedded in a partner's notification link. */
  getReferralByToken(token: string): Promise<Referral | null>;
  createReferral(input: NewReferralInput, staffName: string, staffOrg: string): Promise<Referral>;
  updateStatus(id: string, update: StatusUpdateInput): Promise<Referral>;

  listPartners(): Promise<PartnerOrg[]>;
  createPartner(input: Omit<PartnerOrg, 'id' | 'createdAt'>): Promise<PartnerOrg>;
  updatePartner(id: string, patch: Partial<Omit<PartnerOrg, 'id' | 'createdAt'>>): Promise<PartnerOrg>;
}

export class TransitionError extends Error {}
export class NotFoundError extends Error {}

class LocalReferralService implements ReferralService {
  private allReferrals(): Referral[] {
    return read<Referral[]>(REFERRALS_KEY, []);
  }

  private saveReferrals(rows: Referral[]): void {
    write(REFERRALS_KEY, rows);
  }

  async listReferrals(): Promise<Referral[]> {
    return this.allReferrals().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listReferralsForPartner(partnerOrgId: string): Promise<Referral[]> {
    const rows = await this.listReferrals();
    return rows.filter((r) => r.partnerOrgId === partnerOrgId);
  }

  async getReferral(id: string): Promise<Referral | null> {
    return this.allReferrals().find((r) => r.id === id) ?? null;
  }

  async getReferralByToken(token: string): Promise<Referral | null> {
    return this.allReferrals().find((r) => r.token === token) ?? null;
  }

  async createReferral(
    input: NewReferralInput,
    staffName: string,
    staffOrg: string,
  ): Promise<Referral> {
    const now = new Date().toISOString();
    const firstEvent: StatusEvent = {
      id: generateId(),
      status: 'sent',
      note: 'Referral sent to partner organization.',
      actorName: staffName,
      actorRole: 'staff',
      at: now,
    };

    const referral: Referral = {
      id: generateId(),
      token: generateToken(),
      reference: generateReference(),
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone?.trim() || undefined,
      clientEmail: input.clientEmail?.trim() || undefined,
      preferredContact: input.preferredContact,
      serviceType: input.serviceType,
      urgency: input.urgency,
      note: input.note?.trim() || undefined,
      partnerOrgId: input.partnerOrgId,
      referredByName: staffName,
      referredByOrg: staffOrg,
      status: 'sent',
      history: [firstEvent],
      createdAt: now,
      updatedAt: now,
    };

    this.saveReferrals([...this.allReferrals(), referral]);
    return referral;
  }

  async updateStatus(id: string, update: StatusUpdateInput): Promise<Referral> {
    const rows = this.allReferrals();
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) throw new NotFoundError('Referral not found.');

    const current = rows[index];
    if (!ALLOWED_TRANSITIONS[current.status].includes(update.status)) {
      throw new TransitionError(
        `Cannot move a referral from "${current.status}" to "${update.status}".`,
      );
    }
    if (update.status === 'closed' && !update.outcome) {
      throw new TransitionError('Closing a referral requires an outcome.');
    }

    const now = new Date().toISOString();
    const event: StatusEvent = {
      id: generateId(),
      status: update.status,
      outcome: update.outcome,
      note: update.note?.trim() || undefined,
      actorName: update.actorName,
      actorRole: update.actorRole,
      at: now,
    };

    const updated: Referral = {
      ...current,
      status: update.status,
      outcome: update.status === 'closed' ? update.outcome : current.outcome,
      history: [...current.history, event],
      updatedAt: now,
    };

    rows[index] = updated;
    this.saveReferrals(rows);
    return updated;
  }

  async listPartners(): Promise<PartnerOrg[]> {
    return read<PartnerOrg[]>(PARTNERS_KEY, []).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createPartner(input: Omit<PartnerOrg, 'id' | 'createdAt'>): Promise<PartnerOrg> {
    const partner: PartnerOrg = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    write(PARTNERS_KEY, [...read<PartnerOrg[]>(PARTNERS_KEY, []), partner]);
    return partner;
  }

  async updatePartner(
    id: string,
    patch: Partial<Omit<PartnerOrg, 'id' | 'createdAt'>>,
  ): Promise<PartnerOrg> {
    const rows = read<PartnerOrg[]>(PARTNERS_KEY, []);
    const index = rows.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundError('Partner organization not found.');
    rows[index] = { ...rows[index], ...patch };
    write(PARTNERS_KEY, rows);
    return rows[index];
  }
}

/**
 * The single place to swap backends. Replace with `new HttpReferralService(baseUrl)`
 * once a server exists; every screen keeps working unchanged.
 */
export const referralService: ReferralService = new LocalReferralService();
