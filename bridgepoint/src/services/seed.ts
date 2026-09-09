/**
 * First-run demo data. Gives a new install something to look at and lets one
 * person walk both sides of a referral without a second device.
 */

import { PartnerOrg } from '../types';
import { referralService } from './referralService';
import { read, write } from './storage';

const SEEDED_KEY = 'seeded';

const DEMO_PARTNERS: Omit<PartnerOrg, 'id' | 'createdAt'>[] = [
  {
    name: 'Riverside Shelter Network',
    contactEmail: 'intake@riverside-example.org',
    contactPhone: '555-0142',
    notifyBy: 'email',
    services: ['shelter', 'transitional_housing'],
    notes: '38 beds. Intake calls returned within 24 hours on weekdays.',
    active: true,
  },
  {
    name: 'Eastside Community Health',
    contactEmail: 'referrals@eastside-example.org',
    contactPhone: '555-0187',
    notifyBy: 'email',
    services: ['healthcare', 'mental_health', 'substance_use'],
    notes: 'Walk-in clinic Tuesdays and Thursdays. No insurance required.',
    active: true,
  },
  {
    name: 'Northgate Workforce Project',
    contactEmail: 'jobs@workforce-example.org',
    contactPhone: '555-0163',
    notifyBy: 'sms',
    services: ['employment', 'benefits'],
    notes: 'Job readiness cohorts start the first Monday of each month.',
    active: true,
  },
];

export async function seedIfEmpty(): Promise<void> {
  if (read<boolean>(SEEDED_KEY, false)) return;

  const existing = await referralService.listPartners();
  if (existing.length === 0) {
    for (const partner of DEMO_PARTNERS) {
      await referralService.createPartner(partner);
    }
  }
  write(SEEDED_KEY, true);
}
