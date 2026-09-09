/**
 * Partner notification.
 *
 * The chosen flow is: partner gets an email or text containing a link that
 * lets them update status without creating an account. Real delivery needs a
 * server (an API key can never ship in browser code), so `LocalNotifier`
 * composes the exact message and records it as an outbox entry the staff user
 * can copy, forward, or open in their mail client.
 *
 * A server-backed notifier implements the same interface and actually sends.
 */

import { PartnerOrg, Referral, SERVICE_TYPES, URGENCY_LABELS } from '../types';
import { generateId } from './ids';
import { read, write } from './storage';

const OUTBOX_KEY = 'outbox';

export interface OutboxEntry {
  id: string;
  referralId: string;
  channel: 'email' | 'sms';
  to: string;
  subject?: string;
  body: string;
  link: string;
  /** 'composed' means built locally and awaiting a real send. */
  status: 'composed' | 'sent' | 'failed';
  createdAt: string;
}

export interface Notifier {
  notifyPartner(referral: Referral, partner: PartnerOrg): Promise<OutboxEntry>;
  listOutbox(): Promise<OutboxEntry[]>;
}

/** The URL a partner opens to update status. */
export function statusLinkFor(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/r/${token}`;
}

function serviceLabel(referral: Referral): string {
  return SERVICE_TYPES.find((s) => s.value === referral.serviceType)?.label ?? referral.serviceType;
}

export function composeBody(referral: Referral, partner: PartnerOrg, link: string): string {
  const contactLines = [
    referral.clientPhone ? `Phone: ${referral.clientPhone}` : null,
    referral.clientEmail ? `Email: ${referral.clientEmail}` : null,
    referral.preferredContact === 'through_staff'
      ? `Preferred contact: through ${referral.referredByName} at ${referral.referredByOrg}`
      : `Preferred contact: ${referral.preferredContact}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    `Hello ${partner.name},`,
    '',
    `${referral.referredByOrg} is referring a client to you.`,
    '',
    `Reference: ${referral.reference}`,
    `Client: ${referral.clientName}`,
    contactLines,
    `Service needed: ${serviceLabel(referral)}`,
    `Urgency: ${URGENCY_LABELS[referral.urgency]}`,
    referral.note ? `Note: ${referral.note}` : null,
    '',
    'Please use this link to accept the referral and keep its status current:',
    link,
    '',
    `Referred by ${referral.referredByName}, ${referral.referredByOrg}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** SMS is length-sensitive, so it gets a trimmed version. */
export function composeSms(referral: Referral, partner: PartnerOrg, link: string): string {
  return [
    `${partner.name}: new referral from ${referral.referredByOrg}.`,
    `${referral.reference} - ${referral.clientName}, ${serviceLabel(referral)}`,
    `(${URGENCY_LABELS[referral.urgency]})`,
    `Update status: ${link}`,
  ].join(' ');
}

class LocalNotifier implements Notifier {
  async notifyPartner(referral: Referral, partner: PartnerOrg): Promise<OutboxEntry> {
    const link = statusLinkFor(referral.token);
    const channel = partner.notifyBy;
    const to = (channel === 'email' ? partner.contactEmail : partner.contactPhone) ?? '';

    const entry: OutboxEntry = {
      id: generateId(),
      referralId: referral.id,
      channel,
      to,
      subject:
        channel === 'email'
          ? `New referral ${referral.reference} from ${referral.referredByOrg}`
          : undefined,
      body:
        channel === 'email'
          ? composeBody(referral, partner, link)
          : composeSms(referral, partner, link),
      link,
      status: 'composed',
      createdAt: new Date().toISOString(),
    };

    write(OUTBOX_KEY, [...read<OutboxEntry[]>(OUTBOX_KEY, []), entry]);
    return entry;
  }

  async listOutbox(): Promise<OutboxEntry[]> {
    return read<OutboxEntry[]>(OUTBOX_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const notifier: Notifier = new LocalNotifier();
