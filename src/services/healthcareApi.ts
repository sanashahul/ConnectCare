/**
 * Healthcare API Service
 * Uses HRSA (Health Resources and Services Administration) FindaHealthCenter API
 * to find Federally Qualified Health Centers (FQHCs) - free/low-cost clinics
 *
 * HRSA API: https://findahealthcenter.hrsa.gov - completely free, no key required
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

// HRSA Find a Health Center API (Free, no key required)
const HRSA_API_BASE = 'https://findahealthcenter.hrsa.gov';

interface HRSAHealthCenter {
  name: string;
  address: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  services?: string[];
  operationalHours?: string;
}

/**
 * Fetch free/low-cost health centers near a location using HRSA FindaHealthCenter API
 * These FQHCs provide care regardless of ability to pay
 */
export const fetchHealthCenters = async (
  location: Location,
  radiusMiles: number = 30
): Promise<Resource[]> => {
  try {
    // Try multiple API approaches for best results
    const results = await Promise.allSettled([
      fetchFromHRSALocator(location, radiusMiles),
      fetchFromNPIRegistry(location),
    ]);

    let allClinics: Resource[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allClinics = [...allClinics, ...result.value];
      }
    }

    // Remove duplicates by name similarity
    const uniqueClinics = removeDuplicateClinics(allClinics);

    // If we didn't get real results, use curated data based on major cities
    if (uniqueClinics.length === 0) {
      return getCuratedHealthcareData(location);
    }

    // Sort by distance
    return uniqueClinics.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 15);
  } catch (error) {
    console.log('Error fetching health centers:', error);
    return getCuratedHealthcareData(location);
  }
};

/**
 * Primary: HRSA FindaHealthCenter Locator API
 */
const fetchFromHRSALocator = async (
  location: Location,
  radiusMiles: number
): Promise<Resource[]> => {
  try {
    // HRSA Locator API endpoint
    const url = `${HRSA_API_BASE}/api/v1/searchresults?lat=${location.latitude}&lng=${location.longitude}&radius=${radiusMiles}&pageSize=20`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Try alternative endpoint with zip code if available
      if (location.zipCode) {
        return await fetchFromHRSAByZip(location);
      }
      console.log('HRSA Locator API returned:', response.status);
      return [];
    }

    const data = await response.json();
    const centers = data.healthCenters || data.results || data.data || [];

    if (!Array.isArray(centers) || centers.length === 0) {
      // Try zip-based search as fallback
      if (location.zipCode) {
        return await fetchFromHRSAByZip(location);
      }
      return [];
    }

    return centers.map((center: any): Resource => ({
      id: `hrsa-${(center.name || center.Name || 'clinic').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 5)}`,
      name: center.name || center.Name || 'Community Health Center',
      category: 'healthcare',
      address: formatAddress(center),
      phone: center.phone || center.Phone || center.telephone,
      website: center.website || center.Website || center.webUrl || 'https://findahealthcenter.hrsa.gov',
      description: 'Federally Qualified Health Center (FQHC) - provides care regardless of ability to pay. Sliding scale fees based on income.',
      services: center.services || ['Primary Care', 'Sliding Scale Fees', 'Accepts Uninsured', 'Preventive Care', 'Dental', 'Mental Health'],
      lat: center.latitude || center.Latitude || center.lat || location.latitude,
      lng: center.longitude || center.Longitude || center.lng || location.longitude,
      distance: center.distance || calculateDistance(
        location.latitude,
        location.longitude,
        center.latitude || center.Latitude || center.lat || location.latitude,
        center.longitude || center.Longitude || center.lng || location.longitude
      ),
      // Add typical FQHC hours - most are open Mon-Fri 8am-5pm
      hours: center.hours || {
        monday: '8:00 AM - 5:00 PM',
        tuesday: '8:00 AM - 5:00 PM',
        wednesday: '8:00 AM - 5:00 PM',
        thursday: '8:00 AM - 5:00 PM',
        friday: '8:00 AM - 5:00 PM',
        saturday: 'Closed',
        sunday: 'Closed',
      },
      languages: center.languages || ['English', 'Spanish'],
      acceptsWalkIns: true,
    }));
  } catch (error) {
    console.log('Error fetching from HRSA Locator:', error);
    // Try zip-based search as fallback
    if (location.zipCode) {
      return await fetchFromHRSAByZip(location);
    }
    return [];
  }
};

/**
 * Fallback: HRSA search by ZIP code
 */
const fetchFromHRSAByZip = async (location: Location): Promise<Resource[]> => {
  if (!location.zipCode) return [];

  try {
    const url = `${HRSA_API_BASE}/api/v1/searchresults?zipCode=${location.zipCode}&radius=30&pageSize=15`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const centers = data.healthCenters || data.results || data.data || [];

    return centers.slice(0, 10).map((center: any): Resource => ({
      id: `hrsa-zip-${(center.name || 'clinic').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 5)}`,
      name: center.name || center.Name || 'Community Health Center',
      category: 'healthcare',
      address: formatAddress(center),
      phone: center.phone || center.Phone,
      website: center.website || center.Website || 'https://findahealthcenter.hrsa.gov',
      description: 'FQHC - Free/low-cost care regardless of ability to pay',
      services: ['Primary Care', 'Sliding Scale Fees', 'Accepts Uninsured', 'Preventive Care'],
      lat: center.latitude || center.Latitude || location.latitude,
      lng: center.longitude || center.Longitude || location.longitude,
      distance: center.distance || 0,
      hours: {
        monday: '8:00 AM - 5:00 PM',
        tuesday: '8:00 AM - 5:00 PM',
        wednesday: '8:00 AM - 5:00 PM',
        thursday: '8:00 AM - 5:00 PM',
        friday: '8:00 AM - 5:00 PM',
        saturday: 'Closed',
        sunday: 'Closed',
      },
      languages: ['English', 'Spanish'],
      acceptsWalkIns: true,
    }));
  } catch (error) {
    console.log('Error fetching HRSA by ZIP:', error);
    return [];
  }
};

/**
 * Secondary: NPI Registry API for healthcare providers
 * Free API - no key required
 */
const fetchFromNPIRegistry = async (location: Location): Promise<Resource[]> => {
  if (!location.state || !location.city) return [];

  try {
    // NPI Registry free API - searches for healthcare providers by location
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&city=${encodeURIComponent(location.city)}&state=${encodeURIComponent(location.state)}&taxonomy_description=community%20health&limit=10`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.results || data.results.length === 0) return [];

    return data.results.slice(0, 5).map((provider: any): Resource => {
      const address = provider.addresses?.[0] || {};
      const providerLat = parseFloat(address.latitude) || location.latitude;
      const providerLng = parseFloat(address.longitude) || location.longitude;

      return {
        id: `npi-${provider.number || Math.random().toString(36).substr(2, 9)}`,
        name: provider.basic?.organization_name || provider.basic?.name || 'Healthcare Provider',
        category: 'healthcare',
        address: `${address.address_1 || ''}, ${address.city || ''}, ${address.state || ''} ${address.postal_code || ''}`.trim(),
        phone: address.telephone_number,
        description: 'Healthcare provider - call to verify services and fees',
        services: ['Healthcare', 'Medical Services'],
        lat: providerLat,
        lng: providerLng,
        distance: calculateDistance(location.latitude, location.longitude, providerLat, providerLng),
        hours: {
          monday: '8:00 AM - 5:00 PM',
          tuesday: '8:00 AM - 5:00 PM',
          wednesday: '8:00 AM - 5:00 PM',
          thursday: '8:00 AM - 5:00 PM',
          friday: '8:00 AM - 5:00 PM',
          saturday: 'Closed',
          sunday: 'Closed',
        },
      };
    });
  } catch (error) {
    console.log('Error fetching from NPI Registry:', error);
    return [];
  }
};

/**
 * Helper: Format address from various API response formats
 */
const formatAddress = (center: any): string => {
  if (center.address && typeof center.address === 'object') {
    const addr = center.address;
    return `${addr.address1 || addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || addr.zip || ''}`.trim();
  }
  if (center.Address) {
    return center.Address;
  }
  if (center.street && center.city) {
    return `${center.street}, ${center.city}, ${center.state || ''} ${center.zipCode || center.zip || ''}`.trim();
  }
  return center.fullAddress || center.address || 'Address available on website';
};

/**
 * Helper: Remove duplicate clinics by name similarity
 */
const removeDuplicateClinics = (clinics: Resource[]): Resource[] => {
  const seen = new Map<string, Resource>();

  for (const clinic of clinics) {
    const key = clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    if (!seen.has(key)) {
      seen.set(key, clinic);
    }
  }

  return Array.from(seen.values());
};

/**
 * Search for mental health resources using SAMHSA treatment locator
 * SAMHSA API is free and provides mental health/substance abuse facilities
 */
export const fetchMentalHealthServices = async (
  location: Location,
  radiusMiles: number = 25
): Promise<Resource[]> => {
  try {
    // SAMHSA Treatment Locator API
    const url = `https://findtreatment.gov/locator/find?lat=${location.latitude}&lon=${location.longitude}&radius=${radiusMiles}&type=mental`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return getMentalHealthHotlines(location);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return getMentalHealthHotlines(location);
    }

    return data.results.slice(0, 10).map((facility: any): Resource => ({
      id: `samhsa-${facility.name1?.replace(/\s+/g, '-').toLowerCase() || Math.random()}`,
      name: facility.name1 || 'Mental Health Center',
      category: 'healthcare',
      address: `${facility.street1 || ''}, ${facility.city || ''}, ${facility.state || ''} ${facility.zip || ''}`,
      phone: facility.phone,
      website: facility.website || 'https://findtreatment.gov',
      description: 'Mental health and substance abuse services',
      services: ['Mental Health', 'Counseling', 'Crisis Services'],
      lat: facility.latitude,
      lng: facility.longitude,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        facility.latitude,
        facility.longitude
      ),
      hours: {
        monday: 'Call for hours',
        tuesday: 'Call for hours',
        wednesday: 'Call for hours',
        thursday: 'Call for hours',
        friday: 'Call for hours',
        saturday: 'Call for hours',
        sunday: 'Call for hours',
      },
    }));
  } catch (error) {
    console.log('Error fetching mental health services:', error);
    return getMentalHealthHotlines(location);
  }
};

/**
 * Curated healthcare data with real phone numbers and websites
 * Used when APIs don't return results
 */
const getCuratedHealthcareData = (location: Location): Resource[] => {
  const city = location.city || 'your area';
  const state = location.state || '';

  return [
    {
      id: 'curated-hrsa-hotline',
      name: 'HRSA Health Center Finder Hotline',
      category: 'healthcare',
      address: 'Call to find a health center near you',
      phone: '1-877-464-4772',
      website: 'https://findahealthcenter.hrsa.gov',
      description: 'Call to find a Federally Qualified Health Center near you. They serve everyone regardless of ability to pay.',
      services: ['Free/Low-Cost Care', 'Primary Care', 'Dental', 'Mental Health', 'Pharmacy'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '8:00 AM - 8:00 PM EST',
        tuesday: '8:00 AM - 8:00 PM EST',
        wednesday: '8:00 AM - 8:00 PM EST',
        thursday: '8:00 AM - 8:00 PM EST',
        friday: '8:00 AM - 8:00 PM EST',
        saturday: 'Closed',
        sunday: 'Closed',
      },
    },
    {
      id: 'curated-211-health',
      name: '211 Health Resource Line',
      category: 'healthcare',
      address: `Available in ${city}, ${state}`,
      phone: '211',
      website: 'https://www.211.org',
      description: 'Free, confidential service that connects you to local health resources 24/7. Operators can help find free clinics near you.',
      services: ['24/7 Hotline', 'Local Referrals', 'Free Clinics', 'Prescription Help'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '24 hours',
        tuesday: '24 hours',
        wednesday: '24 hours',
        thursday: '24 hours',
        friday: '24 hours',
        saturday: '24 hours',
        sunday: '24 hours',
      },
    },
    {
      id: 'curated-planned-parenthood',
      name: 'Planned Parenthood',
      category: 'healthcare',
      address: `Search for location in ${state}`,
      phone: '1-800-230-7526',
      website: 'https://www.plannedparenthood.org/health-center',
      description: 'Reproductive health services, STI testing, and general health care. Sliding scale fees available.',
      services: ['Reproductive Health', 'STI Testing', 'Birth Control', 'Sliding Scale'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: 'Varies by location',
        tuesday: 'Varies by location',
        wednesday: 'Varies by location',
        thursday: 'Varies by location',
        friday: 'Varies by location',
        saturday: 'Varies by location',
        sunday: 'Varies by location',
      },
    },
    {
      id: 'curated-ram',
      name: 'Remote Area Medical (RAM)',
      category: 'healthcare',
      address: 'Free pop-up clinics nationwide',
      phone: '865-579-1530',
      website: 'https://www.ramusa.org/clinic-schedule',
      description: 'Free pop-up medical, dental, and vision clinics. Check website for upcoming events near you.',
      services: ['Free Care', 'Medical', 'Dental', 'Vision', 'No Insurance Required'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: 'Event-based',
        tuesday: 'Event-based',
        wednesday: 'Event-based',
        thursday: 'Event-based',
        friday: 'Event-based',
        saturday: 'Event-based',
        sunday: 'Event-based',
      },
    },
  ];
};

/**
 * Mental health hotlines with real numbers
 */
const getMentalHealthHotlines = (location: Location): Resource[] => {
  return [
    {
      id: 'mh-988-lifeline',
      name: '988 Suicide & Crisis Lifeline',
      category: 'healthcare',
      address: 'Available 24/7 nationwide',
      phone: '988',
      website: 'https://988lifeline.org',
      description: 'Free, confidential crisis support 24/7. Call or text 988. Trained counselors ready to help.',
      services: ['Crisis Support', '24/7', 'Free', 'Confidential', 'Text or Call'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '24 hours',
        tuesday: '24 hours',
        wednesday: '24 hours',
        thursday: '24 hours',
        friday: '24 hours',
        saturday: '24 hours',
        sunday: '24 hours',
      },
    },
    {
      id: 'mh-samhsa-helpline',
      name: 'SAMHSA National Helpline',
      category: 'healthcare',
      address: 'Available 24/7 nationwide',
      phone: '1-800-662-4357',
      website: 'https://www.samhsa.gov/find-help/national-helpline',
      description: 'Free, confidential mental health and substance abuse helpline. 24/7, 365 days a year.',
      services: ['Mental Health', 'Substance Abuse', '24/7', 'Free', 'Treatment Referrals'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '24 hours',
        tuesday: '24 hours',
        wednesday: '24 hours',
        thursday: '24 hours',
        friday: '24 hours',
        saturday: '24 hours',
        sunday: '24 hours',
      },
    },
    {
      id: 'mh-crisis-text',
      name: 'Crisis Text Line',
      category: 'healthcare',
      address: 'Text HOME to 741741',
      phone: '741741',
      website: 'https://www.crisistextline.org',
      description: 'Free crisis support via text message. Text HOME to 741741 to connect with a trained counselor.',
      services: ['Text Support', 'Crisis Help', 'Free', '24/7', 'Confidential'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '24 hours',
        tuesday: '24 hours',
        wednesday: '24 hours',
        thursday: '24 hours',
        friday: '24 hours',
        saturday: '24 hours',
        sunday: '24 hours',
      },
    },
    {
      id: 'mh-nami-helpline',
      name: 'NAMI Helpline',
      category: 'healthcare',
      address: 'Available Mon-Fri 10am-10pm ET',
      phone: '1-800-950-6264',
      website: 'https://www.nami.org/help',
      description: 'National Alliance on Mental Illness helpline. Information, referrals, and support for mental health conditions.',
      services: ['Mental Health Info', 'Referrals', 'Support Groups', 'Education'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
      hours: {
        monday: '10:00 AM - 10:00 PM ET',
        tuesday: '10:00 AM - 10:00 PM ET',
        wednesday: '10:00 AM - 10:00 PM ET',
        thursday: '10:00 AM - 10:00 PM ET',
        friday: '10:00 AM - 10:00 PM ET',
        saturday: 'Closed',
        sunday: 'Closed',
      },
    },
  ];
};

/**
 * Main function to get all healthcare resources
 */
export const getAllHealthcareResources = async (
  location: Location
): Promise<Resource[]> => {
  const [healthCenters, mentalHealth] = await Promise.all([
    fetchHealthCenters(location),
    fetchMentalHealthServices(location),
  ]);

  // Combine and sort by distance
  const allResources = [...healthCenters, ...mentalHealth];
  return allResources.sort((a, b) => (a.distance || 0) - (b.distance || 0));
};
