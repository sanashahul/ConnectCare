import { Resource, Location, QuestionAnswer, ServiceCategory } from '../types';
import { calculateDistance } from './location';

// Google Places API types (for reference)
const PLACE_TYPES = {
  healthcare: ['hospital', 'health', 'doctor', 'clinic', 'pharmacy', 'dentist', 'physiotherapist'],
  employment: ['employment_agency', 'local_government_office'],
  housing: ['local_government_office', 'lodging', 'real_estate_agency'],
};

// Search queries for each category
const SEARCH_QUERIES = {
  healthcare: [
    'free clinic',
    'community health center',
    'federally qualified health center',
    'sliding scale clinic',
    'mental health services',
  ],
  employment: [
    'workforce development center',
    'job training center',
    'employment services',
    'career center',
    'unemployment office',
  ],
  housing: [
    'homeless shelter',
    'housing assistance',
    'emergency shelter',
    'transitional housing',
    'housing authority',
  ],
};

// For demo purposes, we'll use sample data
// In production, this would call Google Places API
const SAMPLE_RESOURCES: Record<ServiceCategory, Resource[]> = {
  healthcare: [
    {
      id: 'hc1',
      name: 'Community Health Center',
      category: 'healthcare',
      address: '123 Main St',
      phone: '(555) 123-4567',
      website: 'https://example.com',
      description: 'Free and low-cost medical services for all',
      services: ['Primary Care', 'Mental Health', 'Dental', 'Pharmacy'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'hc2',
      name: 'Free Clinic Downtown',
      category: 'healthcare',
      address: '456 Oak Ave',
      phone: '(555) 234-5678',
      description: 'Walk-in clinic, no insurance required',
      services: ['Primary Care', 'Vaccinations', 'Health Screenings'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'hc3',
      name: 'Mental Health Services Center',
      category: 'healthcare',
      address: '789 Elm St',
      phone: '(555) 345-6789',
      description: 'Counseling and psychiatric services',
      services: ['Counseling', 'Psychiatry', 'Support Groups', 'Crisis Services'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'hc4',
      name: 'Dental Care for All',
      category: 'healthcare',
      address: '321 Pine Rd',
      phone: '(555) 456-7890',
      description: 'Affordable dental care on sliding scale',
      services: ['Dental Exams', 'Cleanings', 'Extractions', 'Fillings'],
      lat: 0,
      lng: 0,
    },
  ],
  employment: [
    {
      id: 'em1',
      name: 'Workforce Development Center',
      category: 'employment',
      address: '100 Job Lane',
      phone: '(555) 567-8901',
      website: 'https://example.com',
      description: 'Job training and placement services',
      services: ['Job Search', 'Resume Help', 'Interview Prep', 'Training Programs'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'em2',
      name: 'Career Services Center',
      category: 'employment',
      address: '200 Work Blvd',
      phone: '(555) 678-9012',
      description: 'Free career counseling and job matching',
      services: ['Career Counseling', 'Job Fairs', 'Skills Assessment'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'em3',
      name: 'Second Chance Employment',
      category: 'employment',
      address: '300 Opportunity Way',
      phone: '(555) 789-0123',
      description: 'Employment services for those with barriers',
      services: ['Background-Friendly Jobs', 'Job Training', 'Support Services'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'em4',
      name: 'Day Labor Center',
      category: 'employment',
      address: '400 Worker St',
      phone: '(555) 890-1234',
      description: 'Daily work opportunities and wage protection',
      services: ['Day Jobs', 'Wage Protection', 'Skills Training'],
      lat: 0,
      lng: 0,
    },
  ],
  housing: [
    {
      id: 'ho1',
      name: 'Emergency Shelter',
      category: 'housing',
      address: '500 Haven Ave',
      phone: '(555) 901-2345',
      description: 'Emergency overnight shelter, open 24/7',
      services: ['Emergency Beds', 'Meals', 'Showers', 'Storage'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'ho2',
      name: 'Family Shelter Services',
      category: 'housing',
      address: '600 Family Rd',
      phone: '(555) 012-3456',
      description: 'Shelter services for families with children',
      services: ['Family Housing', 'Case Management', 'Child Services'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'ho3',
      name: 'Housing Authority Office',
      category: 'housing',
      address: '700 Section Way',
      phone: '(555) 123-4567',
      description: 'Housing vouchers and assistance programs',
      services: ['Section 8', 'Public Housing', 'Rental Assistance'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'ho4',
      name: 'Transitional Housing Program',
      category: 'housing',
      address: '800 Path Ln',
      phone: '(555) 234-5678',
      description: 'Up to 2 years of supportive housing',
      services: ['Transitional Housing', 'Case Management', 'Life Skills'],
      lat: 0,
      lng: 0,
    },
    {
      id: 'ho5',
      name: 'Veterans Housing Services',
      category: 'housing',
      address: '900 Honor Dr',
      phone: '(555) 345-6789',
      description: 'Housing services specifically for veterans',
      services: ['VASH Vouchers', 'Veteran Housing', 'Support Services'],
      lat: 0,
      lng: 0,
    },
  ],
};

// Function to fetch resources from Google Places API
export const fetchResourcesFromAPI = async (
  location: Location,
  category: ServiceCategory,
  apiKey: string
): Promise<Resource[]> => {
  const queries = SEARCH_QUERIES[category];
  const allResources: Resource[] = [];

  for (const query of queries) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&location=${location.latitude},${location.longitude}&radius=50000&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results) {
        const resources: Resource[] = data.results.map((place: any) => ({
          id: place.place_id,
          name: place.name,
          category,
          address: place.formatted_address,
          rating: place.rating,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          ),
        }));
        allResources.push(...resources);
      }
    } catch (error) {
      console.error(`Error fetching ${query}:`, error);
    }
  }

  // Remove duplicates and sort by distance
  const uniqueResources = allResources.filter(
    (resource, index, self) => index === self.findIndex((r) => r.id === resource.id)
  );

  return uniqueResources.sort((a, b) => (a.distance || 0) - (b.distance || 0));
};

// Function to get sample resources (for demo without API key)
export const getSampleResources = (
  location: Location,
  category: ServiceCategory
): Resource[] => {
  const resources = SAMPLE_RESOURCES[category].map((resource, index) => {
    // Generate random nearby coordinates for demo
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const lat = location.latitude + latOffset;
    const lng = location.longitude + lngOffset;
    const distance = calculateDistance(location.latitude, location.longitude, lat, lng);

    return {
      ...resource,
      lat,
      lng,
      distance,
      address: `${resource.address}, ${location.city || 'Your City'}, ${location.state || 'State'}`,
    };
  });

  return resources.sort((a, b) => (a.distance || 0) - (b.distance || 0));
};

// Function to filter resources based on user's answers
export const filterResourcesByAnswers = (
  resources: Resource[],
  answers: QuestionAnswer[],
  category: ServiceCategory
): Resource[] => {
  // This is a simplified matching algorithm
  // In production, this would be more sophisticated

  let filtered = [...resources];

  if (category === 'healthcare') {
    // Check for mental health needs
    const mentalHealthAnswer = answers.find((a) => a.questionId === 'health_5');
    if (mentalHealthAnswer && (mentalHealthAnswer.answer === 'yes' || mentalHealthAnswer.answer === 'yes_urgent')) {
      // Prioritize mental health services
      filtered.sort((a, b) => {
        const aHasMental = a.services?.some((s) => s.toLowerCase().includes('mental'));
        const bHasMental = b.services?.some((s) => s.toLowerCase().includes('mental'));
        if (aHasMental && !bHasMental) return -1;
        if (!aHasMental && bHasMental) return 1;
        return 0;
      });
    }

    // Check for dental needs
    const dentalAnswer = answers.find((a) => a.questionId === 'health_6');
    if (dentalAnswer && dentalAnswer.answer !== 'no') {
      // Prioritize dental services
      filtered.sort((a, b) => {
        const aHasDental = a.services?.some((s) => s.toLowerCase().includes('dental'));
        const bHasDental = b.services?.some((s) => s.toLowerCase().includes('dental'));
        if (aHasDental && !bHasDental) return -1;
        if (!aHasDental && bHasDental) return 1;
        return 0;
      });
    }
  }

  if (category === 'employment') {
    // Check for background check issues
    const backgroundAnswer = answers.find((a) => a.questionId === 'employ_8');
    if (backgroundAnswer && (backgroundAnswer.answer === 'no' || backgroundAnswer.answer === 'unsure')) {
      // Prioritize second-chance employers
      filtered.sort((a, b) => {
        const aFriendly = a.name.toLowerCase().includes('second chance') ||
                         a.services?.some((s) => s.toLowerCase().includes('background'));
        const bFriendly = b.name.toLowerCase().includes('second chance') ||
                         b.services?.some((s) => s.toLowerCase().includes('background'));
        if (aFriendly && !bFriendly) return -1;
        if (!aFriendly && bFriendly) return 1;
        return 0;
      });
    }
  }

  if (category === 'housing') {
    // Check for veteran status
    const veteranAnswer = answers.find((a) => a.questionId === 'housing_3');
    if (veteranAnswer && veteranAnswer.answer === 'yes') {
      // Prioritize veteran services
      filtered.sort((a, b) => {
        const aVeteran = a.name.toLowerCase().includes('veteran') ||
                        a.services?.some((s) => s.toLowerCase().includes('veteran'));
        const bVeteran = b.name.toLowerCase().includes('veteran') ||
                        b.services?.some((s) => s.toLowerCase().includes('veteran'));
        if (aVeteran && !bVeteran) return -1;
        if (!aVeteran && bVeteran) return 1;
        return 0;
      });
    }

    // Check for children
    const childrenAnswer = answers.find((a) => a.questionId === 'housing_4');
    if (childrenAnswer && childrenAnswer.answer === 'yes') {
      // Prioritize family services
      filtered.sort((a, b) => {
        const aFamily = a.name.toLowerCase().includes('family') ||
                       a.services?.some((s) => s.toLowerCase().includes('family'));
        const bFamily = b.name.toLowerCase().includes('family') ||
                       b.services?.some((s) => s.toLowerCase().includes('family'));
        if (aFamily && !bFamily) return -1;
        if (!aFamily && bFamily) return 1;
        return 0;
      });
    }
  }

  return filtered;
};

// Main function to get resources
export const getResources = async (
  location: Location,
  category: ServiceCategory,
  answers: QuestionAnswer[],
  apiKey?: string
): Promise<Resource[]> => {
  let resources: Resource[];

  if (apiKey) {
    resources = await fetchResourcesFromAPI(location, category, apiKey);
  } else {
    // Use sample data for demo
    resources = getSampleResources(location, category);
  }

  // Filter based on user answers
  return filterResourcesByAnswers(resources, answers, category);
};
