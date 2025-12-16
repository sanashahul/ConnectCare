/**
 * Housing API Service
 * Uses HUD and other free APIs to find housing resources
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

interface HUDShelter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  lat?: number;
  lng?: number;
  type?: string;
}

/**
 * Fetch homeless shelters from HUD Exchange API
 * https://www.hudexchange.info/resource/3031/coc-homeless-populations-and-subpopulations-reports/
 */
export const fetchHUDShelters = async (
  location: Location
): Promise<Resource[]> => {
  try {
    // HUD's HMIS data API (Homeless Management Information System)
    // Note: This requires registration but is free
    // For now, we'll use a fallback approach with known shelter networks

    // Try to get state-based shelter info
    const state = location.state || '';

    // Known national shelter networks with location finders
    const shelterNetworks: Resource[] = [
      {
        id: 'salvation-army',
        name: 'Salvation Army Shelters',
        category: 'housing',
        address: `Find location near ${location.city || 'you'}`,
        phone: '1-800-725-2769',
        website: 'https://www.salvationarmyusa.org/usn/provide-shelter/',
        description: 'Emergency shelter, transitional housing, and support services',
        services: ['Emergency Shelter', 'Meals', 'Case Management'],
        lat: location.latitude,
        lng: location.longitude,
        distance: 0,
      },
      {
        id: 'catholic-charities',
        name: 'Catholic Charities Housing',
        category: 'housing',
        address: `Search for location in ${location.state || 'your state'}`,
        website: 'https://www.catholiccharitiesusa.org/',
        description: 'Emergency shelter, affordable housing, and homeless prevention',
        services: ['Shelter', 'Affordable Housing', 'Utility Assistance'],
        lat: location.latitude,
        lng: location.longitude,
        distance: 0,
      },
    ];

    return shelterNetworks;
  } catch (error) {
    console.error('Error fetching HUD shelters:', error);
    return [];
  }
};

/**
 * Get HUD Housing Counseling Agencies
 * Free API: https://data.hud.gov/Housing_Counselor/search
 */
export const fetchHousingCounselors = async (
  location: Location
): Promise<Resource[]> => {
  try {
    const zipCode = location.zipCode || '';

    if (!zipCode) {
      return [];
    }

    // HUD Housing Counselor API - completely free
    const url = `https://data.hud.gov/Housing_Counselor/search?zip=${zipCode}&distance=50&limit=10&output=json`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log('HUD Counselor API returned:', response.status);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.slice(0, 5).map((agency: any): Resource => ({
      id: `hud-counselor-${agency.agcid}`,
      name: agency.nme || 'Housing Counseling Agency',
      category: 'housing',
      address: `${agency.adr1 || ''}, ${agency.city || ''}, ${agency.statecd || ''} ${agency.zipcd || ''}`.trim(),
      phone: agency.phone1,
      website: agency.weburl || undefined,
      description: 'HUD-approved housing counseling agency - free services',
      services: agency.services?.split(',').slice(0, 3) || ['Housing Counseling', 'Foreclosure Prevention'],
      lat: parseFloat(agency.latitude) || location.latitude,
      lng: parseFloat(agency.longitude) || location.longitude,
      distance: agency.latitude && agency.longitude
        ? calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(agency.latitude),
            parseFloat(agency.longitude)
          )
        : 0,
    }));
  } catch (error) {
    console.error('Error fetching HUD counselors:', error);
    return [];
  }
};

/**
 * Get affordable housing programs and resources
 */
export const getAffordableHousingResources = async (
  location: Location
): Promise<Resource[]> => {
  const resources: Resource[] = [
    {
      id: 'section-8',
      name: 'Section 8 Housing Choice Voucher',
      category: 'housing',
      address: `Contact your local Public Housing Authority in ${location.city || location.state || 'your area'}`,
      phone: '211',
      website: 'https://www.hud.gov/topics/housing_choice_voucher_program_section_8',
      description: 'Federal rental assistance for low-income families',
      services: ['Rental Assistance', 'Voucher Program', 'Income-Based'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'public-housing',
      name: 'Public Housing',
      category: 'housing',
      address: 'Search for local Public Housing Authority',
      phone: '211',
      website: 'https://www.hud.gov/topics/rental_assistance/phprog',
      description: 'Affordable housing owned and operated by local housing authorities',
      services: ['Affordable Rent', 'Low Income', 'Application Required'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'rapid-rehousing',
      name: 'Rapid Re-Housing Programs',
      category: 'housing',
      address: 'Call 211 for local programs',
      phone: '211',
      website: 'https://www.hudexchange.info/programs/rapid-re-housing/',
      description: 'Short-term rental assistance and services to help homeless individuals',
      services: ['Short-term Assistance', 'Rental Help', 'Case Management'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];

  return resources;
};

/**
 * Get emergency housing resources
 */
export const getEmergencyHousingResources = async (
  location: Location
): Promise<Resource[]> => {
  const resources: Resource[] = [
    {
      id: 'emergency-211',
      name: '211 Housing Hotline',
      category: 'housing',
      address: 'Available nationwide',
      phone: '211',
      website: 'https://www.211.org/',
      description: 'Call or text 211 for local emergency housing and shelter information',
      services: ['24/7 Hotline', 'Local Referrals', 'Emergency Shelter'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'family-promise',
      name: 'Family Promise',
      category: 'housing',
      address: `Search for affiliate near ${location.city || 'you'}`,
      phone: '908-273-1100',
      website: 'https://familypromise.org/',
      description: 'Emergency shelter and housing for families with children',
      services: ['Family Shelter', 'Meals', 'Day Center'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'covenant-house',
      name: 'Covenant House',
      category: 'housing',
      address: 'Multiple US locations',
      phone: '1-800-388-3888',
      website: 'https://www.covenanthouse.org/',
      description: 'Shelter and services for homeless youth ages 16-24',
      services: ['Youth Shelter', 'Ages 16-24', 'Crisis Hotline'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];

  return resources;
};

/**
 * Search for transitional housing programs
 */
export const getTransitionalHousingResources = async (
  location: Location
): Promise<Resource[]> => {
  const resources: Resource[] = [
    {
      id: 'hud-vash',
      name: 'HUD-VASH (Veterans)',
      category: 'housing',
      address: 'Contact local VA Medical Center',
      phone: '1-877-424-3838',
      website: 'https://www.va.gov/homeless/hud-vash.asp',
      description: 'Housing vouchers and case management for homeless veterans',
      services: ['Veterans Only', 'Housing Voucher', 'VA Support'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'ssvf',
      name: 'SSVF (Supportive Services for Veteran Families)',
      category: 'housing',
      address: 'Available through VA',
      phone: '1-877-424-3838',
      website: 'https://www.va.gov/homeless/ssvf/',
      description: 'Rapid re-housing and prevention for veteran families',
      services: ['Veterans', 'Family Housing', 'Prevention'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];

  return resources;
};

/**
 * Main function to get all housing resources
 */
export const getAllHousingResources = async (
  location: Location
): Promise<Resource[]> => {
  const [
    shelters,
    counselors,
    affordable,
    emergency,
    transitional,
  ] = await Promise.all([
    fetchHUDShelters(location),
    fetchHousingCounselors(location),
    getAffordableHousingResources(location),
    getEmergencyHousingResources(location),
    getTransitionalHousingResources(location),
  ]);

  // Combine all resources
  const allResources = [
    ...counselors, // HUD counselors first (they have real locations)
    ...emergency,
    ...shelters,
    ...affordable,
    ...transitional,
  ];

  // Sort by distance (real locations first)
  return allResources.sort((a, b) => {
    // Prioritize resources with real phone numbers
    if (a.phone && a.phone !== '211' && (!b.phone || b.phone === '211')) return -1;
    if ((!a.phone || a.phone === '211') && b.phone && b.phone !== '211') return 1;
    return (a.distance || 0) - (b.distance || 0);
  });
};
