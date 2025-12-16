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
const HRSA_LOCATOR_API = 'https://findahealthcenter.hrsa.gov/api/v1';

interface HRSALocation {
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

interface HRSALocatorResponse {
  healthCenters?: HRSALocation[];
  results?: HRSALocation[];
  data?: any[];
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

    if (uniqueClinics.length === 0) {
      return getFallbackHealthcareData(location);
    }

    // Sort by distance
    return uniqueClinics.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 15);
  } catch (error) {
    console.error('Error fetching health centers:', error);
    return getFallbackHealthcareData(location);
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
    // HRSA Locator API with coordinates
    const url = `${HRSA_LOCATOR_API}/searchresults?lat=${location.latitude}&lng=${location.longitude}&radius=${radiusMiles}&pageSize=20`;

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

    const data: HRSALocatorResponse = await response.json();
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
      website: center.website || center.Website || center.webUrl,
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
    console.error('Error fetching from HRSA Locator:', error);
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
    const url = `${HRSA_LOCATOR_API}/searchresults?zipCode=${location.zipCode}&radius=30&pageSize=15`;

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
      website: center.website || center.Website,
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
    console.error('Error fetching HRSA by ZIP:', error);
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
      };
    });
  } catch (error) {
    console.error('Error fetching from NPI Registry:', error);
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
      return getFallbackMentalHealthData(location);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return getFallbackMentalHealthData(location);
    }

    return data.results.slice(0, 10).map((facility: any): Resource => ({
      id: `samhsa-${facility.name1?.replace(/\s+/g, '-').toLowerCase() || Math.random()}`,
      name: facility.name1 || 'Mental Health Center',
      category: 'healthcare',
      address: `${facility.street1 || ''}, ${facility.city || ''}, ${facility.state || ''} ${facility.zip || ''}`,
      phone: facility.phone,
      website: facility.website,
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
    }));
  } catch (error) {
    console.error('Error fetching mental health services:', error);
    return getFallbackMentalHealthData(location);
  }
};

/**
 * Fetch free clinics using FreeClinics.com API
 */
export const fetchFreeClinics = async (
  location: Location,
  state: string
): Promise<Resource[]> => {
  // Free Clinics directory - we'll use the state to find clinics
  // This is a backup when HRSA doesn't have enough results
  try {
    // Using a public free clinic directory
    const url = `https://www.freeclinics.com/api/v1/clinics?state=${state}&lat=${location.latitude}&lng=${location.longitude}`;

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.clinics?.map((clinic: any): Resource => ({
      id: `fc-${clinic.id || Math.random()}`,
      name: clinic.name,
      category: 'healthcare',
      address: clinic.address,
      phone: clinic.phone,
      description: 'Free clinic - no cost medical care',
      services: ['Free Care', 'Primary Care'],
      lat: clinic.lat || location.latitude,
      lng: clinic.lng || location.longitude,
      distance: 0,
    })) || [];
  } catch (error) {
    console.error('Error fetching free clinics:', error);
    return [];
  }
};

// Fallback data when APIs fail
const getFallbackHealthcareData = (location: Location): Resource[] => {
  return [
    {
      id: 'fallback-1',
      name: 'Community Health Center',
      category: 'healthcare',
      address: `Near ${location.city || 'your location'}, ${location.state || ''}`,
      phone: '211',
      description: 'Call 211 to find free and low-cost health centers in your area',
      services: ['Primary Care', 'Sliding Scale Fees'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'fallback-2',
      name: 'Find a Health Center',
      category: 'healthcare',
      address: 'findahealthcenter.hrsa.gov',
      phone: '1-877-464-4772',
      website: 'https://findahealthcenter.hrsa.gov',
      description: 'HRSA hotline to find federally qualified health centers',
      services: ['Free/Low-Cost Care', 'All Services'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];
};

const getFallbackMentalHealthData = (location: Location): Resource[] => {
  return [
    {
      id: 'mh-fallback-1',
      name: 'SAMHSA National Helpline',
      category: 'healthcare',
      address: 'Available 24/7',
      phone: '1-800-662-4357',
      description: 'Free, confidential mental health and substance abuse helpline',
      services: ['Mental Health', 'Substance Abuse', '24/7 Support'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'mh-fallback-2',
      name: '988 Suicide & Crisis Lifeline',
      category: 'healthcare',
      address: 'Available 24/7',
      phone: '988',
      description: 'Free, confidential crisis support',
      services: ['Crisis Support', '24/7', 'Free'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
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
