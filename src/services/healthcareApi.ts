/**
 * Healthcare API Service
 * Uses HRSA (Health Resources and Services Administration) free API
 * to find Federally Qualified Health Centers (FQHCs) - free/low-cost clinics
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

// HRSA Health Center API (Free, no key required)
const HRSA_API_BASE = 'https://data.hrsa.gov/data/api/v1';

interface HRSAHealthCenter {
  HealthCenterName: string;
  HealthCenterStreetAddress: string;
  HealthCenterCity: string;
  HealthCenterState: string;
  HealthCenterPostalCode: string;
  HealthCenterTelephone: string;
  HealthCenterWebAddress?: string;
  Latitude: number;
  Longitude: number;
  ServicesOffered?: string[];
}

interface HRSAResponse {
  data: HRSAHealthCenter[];
  totalCount: number;
}

/**
 * Fetch free/low-cost health centers near a location
 * HRSA FQHCs provide care regardless of ability to pay
 */
export const fetchHealthCenters = async (
  location: Location,
  radiusMiles: number = 25
): Promise<Resource[]> => {
  try {
    // HRSA API endpoint for health centers by location
    const url = `${HRSA_API_BASE}/HealthCenters/ByLocation?latitude=${location.latitude}&longitude=${location.longitude}&radius=${radiusMiles}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('HRSA API error:', response.status);
      return getFallbackHealthcareData(location);
    }

    const data: HRSAResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return getFallbackHealthcareData(location);
    }

    return data.data.map((center): Resource => ({
      id: `hrsa-${center.HealthCenterName.replace(/\s+/g, '-').toLowerCase()}`,
      name: center.HealthCenterName,
      category: 'healthcare',
      address: `${center.HealthCenterStreetAddress}, ${center.HealthCenterCity}, ${center.HealthCenterState} ${center.HealthCenterPostalCode}`,
      phone: center.HealthCenterTelephone,
      website: center.HealthCenterWebAddress,
      description: 'Federally Qualified Health Center - provides care regardless of ability to pay',
      services: ['Primary Care', 'Sliding Scale Fees', 'Accepts Uninsured'],
      lat: center.Latitude,
      lng: center.Longitude,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        center.Latitude,
        center.Longitude
      ),
    }));
  } catch (error) {
    console.error('Error fetching HRSA health centers:', error);
    return getFallbackHealthcareData(location);
  }
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
