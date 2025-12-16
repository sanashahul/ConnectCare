/**
 * Employment API Service
 * Uses multiple free job APIs to find employment opportunities
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

// Note: For Adzuna, you need to sign up at developer.adzuna.com (free)
// These are placeholder values - replace with real keys
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url?: string;
  type?: string;
  lat?: number;
  lng?: number;
}

/**
 * Fetch jobs from USAJobs (Government jobs - completely free, no API key needed)
 */
export const fetchUSAJobs = async (
  location: Location,
  keywords?: string
): Promise<Resource[]> => {
  try {
    const locationQuery = location.city
      ? `${location.city}, ${location.state}`
      : location.state || '';

    // USAJobs API - free government jobs
    const url = `https://data.usajobs.gov/api/search?LocationName=${encodeURIComponent(locationQuery)}&ResultsPerPage=20`;

    const response = await fetch(url, {
      headers: {
        'Host': 'data.usajobs.gov',
        'User-Agent': 'ConnectCare/1.0',
      },
    });

    if (!response.ok) {
      console.log('USAJobs API returned:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.SearchResult?.SearchResultItems) {
      return [];
    }

    return data.SearchResult.SearchResultItems.slice(0, 10).map((item: any): Resource => {
      const job = item.MatchedObjectDescriptor;
      return {
        id: `usajobs-${job.PositionID}`,
        name: job.PositionTitle,
        category: 'employment',
        address: job.PositionLocationDisplay || locationQuery,
        description: `${job.OrganizationName} - ${job.JobGrade?.[0]?.Code || 'Government'} position`,
        website: job.PositionURI,
        services: ['Government Job', job.PositionSchedule?.[0]?.Name || 'Full-time'],
        lat: location.latitude,
        lng: location.longitude,
        distance: 0,
      };
    });
  } catch (error) {
    console.error('Error fetching USAJobs:', error);
    return [];
  }
};

/**
 * Fetch jobs from Adzuna API (free tier available)
 * Sign up at: https://developer.adzuna.com/
 */
export const fetchAdzunaJobs = async (
  location: Location,
  keywords?: string
): Promise<Resource[]> => {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.log('Adzuna API keys not configured');
    return [];
  }

  try {
    const what = keywords || 'entry level';
    const where = location.city || location.zipCode || '';

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}&results_per_page=15&sort_by=date`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log('Adzuna API returned:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.results) {
      return [];
    }

    return data.results.map((job: any): Resource => ({
      id: `adzuna-${job.id}`,
      name: job.title,
      category: 'employment',
      address: job.location?.display_name || 'Remote',
      description: job.company?.display_name || 'Company',
      website: job.redirect_url,
      phone: undefined,
      services: [
        job.contract_type || 'Full-time',
        job.salary_min ? `$${Math.round(job.salary_min / 1000)}k+` : 'Competitive',
      ],
      lat: job.latitude || location.latitude,
      lng: job.longitude || location.longitude,
      distance: job.latitude
        ? calculateDistance(location.latitude, location.longitude, job.latitude, job.longitude)
        : 0,
    }));
  } catch (error) {
    console.error('Error fetching Adzuna jobs:', error);
    return [];
  }
};

/**
 * Fetch jobs from JSearch (RapidAPI) - has free tier
 */
export const fetchJSearchJobs = async (
  location: Location,
  keywords?: string
): Promise<Resource[]> => {
  // JSearch requires RapidAPI key - leaving as placeholder
  return [];
};

/**
 * Get workforce development centers and job training resources
 * Using 211 LA County API as example (many areas have 211 APIs)
 */
export const fetchJobTrainingResources = async (
  location: Location
): Promise<Resource[]> => {
  // Return curated list of national job training resources
  const nationalResources: Resource[] = [
    {
      id: 'job-corps',
      name: 'Job Corps',
      category: 'employment',
      address: 'Nationwide locations',
      phone: '1-800-733-5627',
      website: 'https://www.jobcorps.gov',
      description: 'Free education and job training for ages 16-24',
      services: ['Free Training', 'Housing Available', 'Ages 16-24'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'americorps',
      name: 'AmeriCorps',
      category: 'employment',
      address: 'Nationwide locations',
      phone: '1-800-942-2677',
      website: 'https://americorps.gov',
      description: 'Service opportunities with education awards',
      services: ['Paid Service', 'Education Award', 'Skills Training'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'goodwill',
      name: 'Goodwill Job Training',
      category: 'employment',
      address: `Search for location near ${location.city || 'you'}`,
      website: 'https://www.goodwill.org/jobs-training/',
      description: 'Free job training and placement services',
      services: ['Free Training', 'Resume Help', 'Job Placement'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];

  return nationalResources;
};

/**
 * Get entry-level and no-experience-required jobs
 * These are typically more accessible for homeless individuals
 */
export const getEntryLevelJobs = async (location: Location): Promise<Resource[]> => {
  // Common employers known for hiring without extensive background checks
  // or experience requirements
  const entryLevelOpportunities: Resource[] = [
    {
      id: 'temp-agencies',
      name: 'Temp/Staffing Agencies',
      category: 'employment',
      address: `Search "${location.city || 'your city'} staffing agency"`,
      description: 'Day labor and temp work - often same-day pay',
      services: ['Same Day Pay', 'No Experience', 'Flexible Hours'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'day-labor',
      name: 'Day Labor Centers',
      category: 'employment',
      address: 'Search for centers in your area',
      phone: '211',
      description: 'Daily work opportunities with worker protections',
      services: ['Daily Pay', 'No Background Check', 'Walk-In'],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];

  return entryLevelOpportunities;
};

/**
 * Main function to get all employment resources
 */
export const getAllEmploymentResources = async (
  location: Location
): Promise<Resource[]> => {
  const [usaJobs, trainingResources, entryLevel] = await Promise.all([
    fetchUSAJobs(location),
    fetchJobTrainingResources(location),
    getEntryLevelJobs(location),
  ]);

  // Also try Adzuna if keys are configured
  let adzunaJobs: Resource[] = [];
  if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
    adzunaJobs = await fetchAdzunaJobs(location);
  }

  // Combine all resources
  const allResources = [
    ...adzunaJobs,
    ...usaJobs,
    ...entryLevel,
    ...trainingResources,
  ];

  // Sort by distance (real jobs first, then resources)
  return allResources.sort((a, b) => {
    // Prioritize jobs with actual locations
    if (a.website && !b.website) return -1;
    if (!a.website && b.website) return 1;
    return (a.distance || 0) - (b.distance || 0);
  });
};
