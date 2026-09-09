/**
 * BridgePoint domain types.
 *
 * Privacy note: a referral deliberately carries the minimum needed for a
 * partner organization to reach the client and know what they need --
 * name, contact, and requested service. No immigration status, no medical
 * detail, no questionnaire history.
 */

export type ServiceType =
  | 'shelter'
  | 'transitional_housing'
  | 'permanent_housing'
  | 'healthcare'
  | 'mental_health'
  | 'substance_use'
  | 'employment'
  | 'legal'
  | 'benefits'
  | 'other';

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'shelter', label: 'Emergency shelter' },
  { value: 'transitional_housing', label: 'Transitional housing' },
  { value: 'permanent_housing', label: 'Permanent housing' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'mental_health', label: 'Mental health' },
  { value: 'substance_use', label: 'Substance use treatment' },
  { value: 'employment', label: 'Employment' },
  { value: 'legal', label: 'Legal aid' },
  { value: 'benefits', label: 'Benefits enrollment' },
  { value: 'other', label: 'Other' },
];

/**
 * Status pipeline. Order matters -- the UI renders progress from this.
 * `waitlisted` sits between acceptance and active work, for partners
 * who have capacity limits (beds, program slots).
 */
export type ReferralStatus =
  | 'sent'
  | 'accepted'
  | 'waitlisted'
  | 'in_progress'
  | 'closed';

export const STATUS_PIPELINE: ReferralStatus[] = [
  'sent',
  'accepted',
  'waitlisted',
  'in_progress',
  'closed',
];

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  sent: 'Sent',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  in_progress: 'In progress',
  closed: 'Closed',
};

/**
 * Which statuses a partner may move to from where they are. Prevents a
 * closed referral from silently reopening, and keeps the timeline honest.
 */
export const ALLOWED_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  sent: ['accepted', 'closed'],
  accepted: ['waitlisted', 'in_progress', 'closed'],
  waitlisted: ['in_progress', 'closed'],
  in_progress: ['waitlisted', 'closed'],
  closed: [],
};

export type CloseOutcome =
  | 'services_started'
  | 'housed'
  | 'declined_by_client'
  | 'unreachable'
  | 'ineligible'
  | 'no_capacity'
  | 'referred_elsewhere';

export const CLOSE_OUTCOMES: { value: CloseOutcome; label: string }[] = [
  { value: 'services_started', label: 'Services started' },
  { value: 'housed', label: 'Client housed' },
  { value: 'declined_by_client', label: 'Client declined services' },
  { value: 'unreachable', label: 'Could not reach client' },
  { value: 'ineligible', label: 'Not eligible for this program' },
  { value: 'no_capacity', label: 'No capacity available' },
  { value: 'referred_elsewhere', label: 'Referred to another organization' },
];

export type Urgency = 'emergency' | 'urgent' | 'routine';

export const URGENCY_LABELS: Record<Urgency, string> = {
  emergency: 'Emergency (tonight)',
  urgent: 'Urgent (this week)',
  routine: 'Routine',
};

export type ContactMethod = 'phone' | 'email' | 'through_staff';

export interface PartnerOrg {
  id: string;
  name: string;
  /** Where referral notifications go. */
  contactEmail?: string;
  contactPhone?: string;
  /** Preferred channel for the referral notification. */
  notifyBy: 'email' | 'sms';
  services: ServiceType[];
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  orgName: string;
  email?: string;
}

/** One entry in a referral's audit trail. Append-only. */
export interface StatusEvent {
  id: string;
  status: ReferralStatus;
  outcome?: CloseOutcome;
  note?: string;
  /** Display name of whoever made the change. */
  actorName: string;
  actorRole: 'staff' | 'partner';
  at: string;
}

export interface Referral {
  id: string;
  /**
   * Unguessable token used in the partner's notification link, so a partner
   * can update status without an account. Treat as a secret.
   */
  token: string;
  /** Short human-readable reference for phone conversations, e.g. "BP-4T9K". */
  reference: string;

  // --- Minimal client information ---
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  preferredContact: ContactMethod;

  // --- What is being asked for ---
  serviceType: ServiceType;
  urgency: Urgency;
  /** Optional short context from the referring staff member. */
  note?: string;

  // --- Routing ---
  partnerOrgId: string;
  referredByName: string;
  referredByOrg: string;

  // --- Live state ---
  status: ReferralStatus;
  outcome?: CloseOutcome;
  history: StatusEvent[];
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted by referralService.createReferral. */
export interface NewReferralInput {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  preferredContact: ContactMethod;
  serviceType: ServiceType;
  urgency: Urgency;
  note?: string;
  partnerOrgId: string;
}

export interface StatusUpdateInput {
  status: ReferralStatus;
  outcome?: CloseOutcome;
  note?: string;
  actorName: string;
  actorRole: 'staff' | 'partner';
}
