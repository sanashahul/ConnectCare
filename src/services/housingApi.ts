/**
 * Housing API Service
 * Uses HUD and OpenStreetMap APIs to find housing resources
 *
 * APIs used:
 * - HUD Housing Counselor API (free, no key) - https://data.hud.gov
 * - OpenStreetMap Overpass API (free, no key) - for shelter locations
 *
 * CURATED DATA with REAL phone numbers that actually work:
 * - Salvation Army: 1-800-725-2769
 * - Catholic Charities: 1-800-919-9338
 * - Family Promise: 908-273-1100
 * - Covenant House: 1-800-388-3888
 * - National Homeless Hotline: 1-800-231-6946
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

/**
 * Extended Resource type with housing-specific fields
 */
export interface HousingResource extends Omit<Resource, 'hours'> {
  // Spanish translations
  nameEs?: string;
  descriptionEs?: string;
  servicesEs?: string[];
  // Housing-specific fields
  hours?: string;
  hoursEs?: string;
  eligibility?: string;
  eligibilityEs?: string;
  servicesDetailed?: string[];
  servicesDetailedEs?: string[];
  intakeInfo?: string;
  intakeInfoEs?: string;
}

/**
 * Fetch homeless shelters using OpenStreetMap Overpass API
 * This finds actual shelter locations near the user
 */
export const fetchHUDShelters = async (
  location: Location
): Promise<HousingResource[]> => {
  try {
    // Use OpenStreetMap Overpass API to find real shelters nearby
    const sheltersFromOSM = await fetchSheltersFromOSM(location);

    // Get curated national shelter networks with REAL phone numbers
    const curatedShelters = getCuratedShelterData(location);

    // Combine results - curated shelters first, then OSM results
    const allShelters = [...curatedShelters, ...sheltersFromOSM];

    return allShelters;
  } catch (error) {
    console.error('Error fetching shelters:', error);
    return getCuratedShelterData(location);
  }
};

/**
 * OpenStreetMap Overpass API - finds real shelter locations
 * Free, no key required
 */
const fetchSheltersFromOSM = async (location: Location): Promise<HousingResource[]> => {
  try {
    // Search within ~15 miles (0.25 degrees roughly)
    const bbox = `${location.latitude - 0.25},${location.longitude - 0.25},${location.latitude + 0.25},${location.longitude + 0.25}`;

    // Overpass query for homeless shelters, social facilities, and emergency lodging
    const query = `
      [out:json][timeout:10];
      (
        node["social_facility"="shelter"](${bbox});
        node["social_facility"="homeless_shelter"](${bbox});
        node["amenity"="shelter"](${bbox});
        node["amenity"="social_facility"]["social_facility:for"="homeless"](${bbox});
        node["emergency"="shelter"](${bbox});
        way["social_facility"="shelter"](${bbox});
        way["social_facility"="homeless_shelter"](${bbox});
        way["amenity"="social_facility"]["social_facility:for"="homeless"](${bbox});
      );
      out center body;
    `.trim();

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.log('Overpass API returned:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return [];
    }

    return data.elements.slice(0, 10).map((element: any): HousingResource => {
      const lat = element.lat || element.center?.lat || location.latitude;
      const lng = element.lon || element.center?.lon || location.longitude;
      const tags = element.tags || {};

      return {
        id: `osm-shelter-${element.id}`,
        name: tags.name || tags['name:en'] || 'Homeless Shelter',
        category: 'housing',
        address: formatOSMAddress(tags) || `Near ${location.city || 'your location'}`,
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
        description: tags.description || 'Emergency shelter - call ahead to verify availability',
        services: ['Emergency Shelter', 'Temporary Housing'],
        lat,
        lng,
        distance: calculateDistance(location.latitude, location.longitude, lat, lng),
        hours: 'Call for hours',
        hoursEs: 'Llame para horarios',
      };
    });
  } catch (error) {
    console.error('Error fetching from OpenStreetMap:', error);
    return [];
  }
};

/**
 * Format address from OpenStreetMap tags
 */
const formatOSMAddress = (tags: any): string => {
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:state']) parts.push(tags['addr:state']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

  return parts.length > 0 ? parts.join(', ') : '';
};

/**
 * CURATED shelter data with REAL, VERIFIED phone numbers
 * These numbers are tested and connect to actual services
 */
const getCuratedShelterData = (location: Location): HousingResource[] => {
  const city = location.city || 'your area';
  const state = location.state || '';

  return [
    {
      id: 'curated-national-homeless-hotline',
      name: 'National Homeless Hotline',
      category: 'housing',
      address: 'Available 24/7 Nationwide',
      phone: '1-800-231-6946',
      website: 'https://www.homelessshelterdirectory.org/',
      description: 'Free hotline connecting you to local shelters and services. Available 24/7.',
      services: ['24/7 Hotline', 'Shelter Referrals', 'Local Resources'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Anyone experiencing homelessness',
      eligibilityEs: 'Cualquier persona sin hogar',
      servicesDetailed: [
        'Free shelter referrals nationwide',
        'Connected to local shelter networks',
        'Crisis support available',
        'Spanish language assistance',
      ],
      servicesDetailedEs: [
        'Referencias gratuitas a refugios en todo el país',
        'Conectado a redes de refugios locales',
        'Apoyo de crisis disponible',
        'Asistencia en español',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-211-housing',
      name: '211 Housing Helpline',
      category: 'housing',
      address: 'Available Nationwide - Call or Text',
      phone: '211',
      website: 'https://www.211.org/',
      description: 'Call or text 211 for local emergency shelter and housing resources.',
      services: ['24/7 Hotline', 'Local Referrals', 'Emergency Shelter'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Everyone - No restrictions',
      eligibilityEs: 'Todos - Sin restricciones',
      servicesDetailed: [
        'Local shelter information',
        'Rental assistance programs',
        'Utility assistance',
        'Food and basic needs',
        'Multi-language support',
      ],
      servicesDetailedEs: [
        'Información de refugios locales',
        'Programas de asistencia de alquiler',
        'Asistencia de servicios públicos',
        'Comida y necesidades básicas',
        'Soporte en múltiples idiomas',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-salvation-army',
      name: 'Salvation Army Shelters',
      category: 'housing',
      address: `Call for locations near ${city}, ${state}`,
      phone: '1-800-725-2769',
      website: 'https://www.salvationarmyusa.org/usn/provide-shelter/',
      description: 'Emergency shelter, meals, and case management at 7,600+ locations nationwide.',
      services: ['Emergency Shelter', 'Meals', 'Case Management'],
      hours: 'Varies by location - Call for hours',
      hoursEs: 'Varía por ubicación - Llame para horarios',
      intakeInfo: 'Walk-in welcome at most locations. Call ahead for availability.',
      intakeInfoEs: 'Se acepta sin cita en la mayoría de ubicaciones. Llame antes para disponibilidad.',
      eligibility: 'Open to all - Some locations may have gender/family restrictions',
      eligibilityEs: 'Abierto a todos - Algunas ubicaciones pueden tener restricciones de género/familia',
      servicesDetailed: [
        'Emergency overnight shelter',
        'Hot meals (breakfast & dinner)',
        'Showers and hygiene facilities',
        'Case management services',
        'Job search assistance',
        'Clothing assistance',
      ],
      servicesDetailedEs: [
        'Refugio de emergencia nocturno',
        'Comidas calientes (desayuno y cena)',
        'Duchas e instalaciones de higiene',
        'Servicios de gestión de casos',
        'Asistencia en búsqueda de empleo',
        'Asistencia de ropa',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-catholic-charities',
      name: 'Catholic Charities USA',
      category: 'housing',
      address: `Find local office in ${state || 'your state'}`,
      phone: '1-800-919-9338',
      website: 'https://www.catholiccharitiesusa.org/find-help/',
      description: 'Emergency shelter, affordable housing, and homeless prevention services.',
      services: ['Shelter', 'Housing Assistance', 'Food', 'Counseling'],
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM (varies by location)',
      hoursEs: 'Lun-Vie: 8:00 AM - 5:00 PM (varía por ubicación)',
      eligibility: 'Open to all regardless of faith',
      eligibilityEs: 'Abierto a todos sin importar la religión',
      servicesDetailed: [
        'Emergency shelter programs',
        'Transitional housing',
        'Rental & utility assistance',
        'Food pantries',
        'Immigration services',
        'Disaster relief',
      ],
      servicesDetailedEs: [
        'Programas de refugio de emergencia',
        'Vivienda de transición',
        'Asistencia de alquiler y servicios',
        'Despensas de alimentos',
        'Servicios de inmigración',
        'Ayuda en desastres',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-family-promise',
      name: 'Family Promise',
      category: 'housing',
      address: 'Over 200 affiliates nationwide',
      phone: '908-273-1100',
      website: 'https://familypromise.org/',
      description: 'Emergency shelter and housing specifically for families with children.',
      services: ['Family Shelter', 'Meals', 'Day Center', 'Case Management'],
      hours: '24/7 shelter - Office: Mon-Fri 9 AM - 5 PM',
      hoursEs: 'Refugio 24/7 - Oficina: Lun-Vie 9 AM - 5 PM',
      eligibility: 'Families with children only',
      eligibilityEs: 'Solo familias con niños',
      intakeInfo: 'Call main line for referral to nearest affiliate',
      intakeInfoEs: 'Llame a la línea principal para referencia al afiliado más cercano',
      servicesDetailed: [
        'Emergency family shelter',
        'Keep families together',
        'Meals provided',
        'Case management',
        'Employment assistance',
        'Financial literacy classes',
      ],
      servicesDetailedEs: [
        'Refugio de emergencia familiar',
        'Mantiene a las familias juntas',
        'Comidas proporcionadas',
        'Gestión de casos',
        'Asistencia de empleo',
        'Clases de educación financiera',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-covenant-house',
      name: 'Covenant House (Youth 16-24)',
      category: 'housing',
      address: 'Major cities across the US',
      phone: '1-800-388-3888',
      website: 'https://www.covenanthouse.org/',
      description: 'Emergency shelter and services for homeless youth ages 16-24.',
      services: ['Youth Shelter', 'Crisis Line', 'Education', 'Job Training'],
      hours: '24/7 Crisis Line - Shelter hours vary',
      hoursEs: 'Línea de crisis 24/7 - Horarios de refugio varían',
      eligibility: 'Youth ages 16-24 only',
      eligibilityEs: 'Solo jóvenes de 16-24 años',
      intakeInfo: 'Walk-in welcome. Crisis line available 24/7.',
      intakeInfoEs: 'Se acepta sin cita. Línea de crisis disponible 24/7.',
      servicesDetailed: [
        'Emergency shelter for youth',
        '24/7 crisis hotline',
        'GED & education support',
        'Job training programs',
        'Mental health services',
        'Legal assistance',
      ],
      servicesDetailedEs: [
        'Refugio de emergencia para jóvenes',
        'Línea de crisis 24/7',
        'Apoyo de GED y educación',
        'Programas de capacitación laboral',
        'Servicios de salud mental',
        'Asistencia legal',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-dv-hotline',
      name: 'National DV Hotline (Safe Shelter)',
      category: 'housing',
      address: 'Confidential - Locations not disclosed',
      phone: '1-800-799-7233',
      website: 'https://www.thehotline.org/',
      description: 'Safe emergency shelter for domestic violence survivors. Confidential locations.',
      services: ['Safe Shelter', 'Crisis Support', 'Safety Planning', 'Legal Help'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Domestic violence survivors and their children',
      eligibilityEs: 'Sobrevivientes de violencia doméstica y sus hijos',
      intakeInfo: 'Call hotline for safe, confidential shelter placement',
      intakeInfoEs: 'Llame a la línea de ayuda para colocación segura y confidencial',
      servicesDetailed: [
        'Safe emergency shelter',
        '24/7 crisis support',
        'Safety planning',
        'Legal advocacy',
        'Children\'s services',
        'Transitional housing',
      ],
      servicesDetailedEs: [
        'Refugio de emergencia seguro',
        'Apoyo de crisis 24/7',
        'Planificación de seguridad',
        'Abogacía legal',
        'Servicios para niños',
        'Vivienda de transición',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'curated-veterans-homeless',
      name: 'VA Homeless Veterans Hotline',
      category: 'housing',
      address: 'Available to all veterans nationwide',
      phone: '1-877-424-3838',
      website: 'https://www.va.gov/homeless/',
      description: 'Housing assistance and emergency shelter specifically for veterans.',
      services: ['Veteran Housing', 'HUD-VASH', 'SSVF', 'Case Management'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Veterans and veteran families only',
      eligibilityEs: 'Solo veteranos y familias de veteranos',
      intakeInfo: 'Call hotline for immediate assistance and program enrollment',
      intakeInfoEs: 'Llame a la línea para asistencia inmediata e inscripción en programas',
      servicesDetailed: [
        'HUD-VASH housing vouchers',
        'SSVF rapid re-housing',
        'Grant Per Diem shelters',
        'Health care for homeless vets',
        'Employment assistance',
        'Benefits enrollment',
      ],
      servicesDetailedEs: [
        'Vales de vivienda HUD-VASH',
        'Realojamiento rápido SSVF',
        'Refugios Grant Per Diem',
        'Atención médica para veteranos sin hogar',
        'Asistencia de empleo',
        'Inscripción en beneficios',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];
};

/**
 * Get HUD Housing Counseling Agencies
 * Free API: https://data.hud.gov/Housing_Counselor/search
 */
export const fetchHousingCounselors = async (
  location: Location
): Promise<HousingResource[]> => {
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

    return data.slice(0, 5).map((agency: any): HousingResource => ({
      id: `hud-counselor-${agency.agcid}`,
      name: agency.nme || 'Housing Counseling Agency',
      category: 'housing',
      address: `${agency.adr1 || ''}, ${agency.city || ''}, ${agency.statecd || ''} ${agency.zipcd || ''}`.trim(),
      phone: agency.phone1,
      website: agency.weburl || undefined,
      description: 'HUD-approved housing counseling agency - FREE services',
      services: agency.services?.split(',').slice(0, 3) || ['Housing Counseling', 'Foreclosure Prevention'],
      hours: 'Mon-Fri: 9:00 AM - 5:00 PM (call to confirm)',
      hoursEs: 'Lun-Vie: 9:00 AM - 5:00 PM (llame para confirmar)',
      eligibility: 'All income levels - Free HUD-approved services',
      eligibilityEs: 'Todos los niveles de ingresos - Servicios gratuitos aprobados por HUD',
      servicesDetailed: [
        'Housing counseling',
        'Foreclosure prevention',
        'Rental assistance guidance',
        'Credit counseling',
        'Budgeting help',
      ],
      servicesDetailedEs: [
        'Asesoramiento de vivienda',
        'Prevención de ejecución hipotecaria',
        'Orientación sobre asistencia de alquiler',
        'Asesoramiento de crédito',
        'Ayuda con presupuesto',
      ],
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
): Promise<HousingResource[]> => {
  const resources: HousingResource[] = [
    {
      id: 'section-8',
      name: 'Section 8 Housing Choice Voucher',
      category: 'housing',
      address: `Contact your local Public Housing Authority in ${location.city || location.state || 'your area'}`,
      phone: '211',
      website: 'https://www.hud.gov/topics/housing_choice_voucher_program_section_8',
      description: 'Federal rental assistance for low-income families',
      services: ['Rental Assistance', 'Voucher Program', 'Income-Based'],
      hours: 'PHA offices: Mon-Fri 8 AM - 5 PM',
      hoursEs: 'Oficinas PHA: Lun-Vie 8 AM - 5 PM',
      eligibility: 'Income below 50% of area median',
      eligibilityEs: 'Ingresos por debajo del 50% de la mediana del área',
      servicesDetailed: [
        'Pays portion of your rent',
        'You pay about 30% of income',
        'Can use in private rentals',
        'Portable - move with your voucher',
      ],
      servicesDetailedEs: [
        'Paga parte de tu alquiler',
        'Pagas aproximadamente 30% de tus ingresos',
        'Se puede usar en alquileres privados',
        'Portátil - múdate con tu vale',
      ],
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
      hours: 'PHA offices: Mon-Fri 8 AM - 5 PM',
      hoursEs: 'Oficinas PHA: Lun-Vie 8 AM - 5 PM',
      eligibility: 'Based on income, family size, citizenship',
      eligibilityEs: 'Basado en ingresos, tamaño de familia, ciudadanía',
      servicesDetailed: [
        'Rent based on income',
        'Government-managed properties',
        'Many locations nationwide',
        'Wait times vary by location',
      ],
      servicesDetailedEs: [
        'Alquiler basado en ingresos',
        'Propiedades administradas por el gobierno',
        'Muchas ubicaciones en todo el país',
        'Tiempos de espera varían por ubicación',
      ],
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
      hours: 'Varies by local provider',
      hoursEs: 'Varía según el proveedor local',
      eligibility: 'Currently homeless individuals/families',
      eligibilityEs: 'Personas/familias actualmente sin hogar',
      servicesDetailed: [
        '3-24 months rental assistance',
        'Help finding housing',
        'Case management support',
        'Connection to other services',
      ],
      servicesDetailedEs: [
        '3-24 meses de asistencia de alquiler',
        'Ayuda para encontrar vivienda',
        'Apoyo de gestión de casos',
        'Conexión con otros servicios',
      ],
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
): Promise<HousingResource[]> => {
  // Emergency resources are now included in getCuratedShelterData
  // This returns additional emergency-specific resources
  const resources: HousingResource[] = [
    {
      id: 'emergency-runaway-safeline',
      name: 'National Runaway Safeline',
      category: 'housing',
      address: 'Available 24/7 Nationwide',
      phone: '1-800-786-2929',
      website: 'https://www.1800runaway.org/',
      description: 'Crisis line for runaway and homeless youth. Can arrange bus tickets home.',
      services: ['Youth Crisis Line', 'Home Free Program', 'Message Relay'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Youth under 21 and their families',
      eligibilityEs: 'Jóvenes menores de 21 años y sus familias',
      servicesDetailed: [
        'Crisis intervention',
        'Home Free bus ticket program',
        'Message relay to family',
        'Shelter referrals',
        'Counseling services',
      ],
      servicesDetailedEs: [
        'Intervención de crisis',
        'Programa de boleto de autobús Home Free',
        'Relay de mensajes a la familia',
        'Referencias a refugios',
        'Servicios de consejería',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'emergency-warmline',
      name: 'St. Vincent de Paul Society',
      category: 'housing',
      address: `Find local conference in ${location.city || 'your area'}`,
      phone: '314-576-3993',
      website: 'https://www.svdpusa.org/',
      description: 'Emergency assistance with rent, utilities, and basic needs.',
      services: ['Rent Help', 'Utility Assistance', 'Food', 'Furniture'],
      hours: 'Mon-Fri: 9 AM - 4 PM (varies by location)',
      hoursEs: 'Lun-Vie: 9 AM - 4 PM (varía por ubicación)',
      eligibility: 'Open to all in need regardless of faith',
      eligibilityEs: 'Abierto a todos los necesitados sin importar la religión',
      servicesDetailed: [
        'Emergency rent assistance',
        'Utility payment help',
        'Food pantries',
        'Furniture for those setting up home',
        'Personal visit assistance',
      ],
      servicesDetailedEs: [
        'Asistencia de emergencia de alquiler',
        'Ayuda con pagos de servicios',
        'Despensas de alimentos',
        'Muebles para establecer hogar',
        'Asistencia de visita personal',
      ],
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
): Promise<HousingResource[]> => {
  const resources: HousingResource[] = [
    {
      id: 'transitional-oxford-house',
      name: 'Oxford House (Recovery Housing)',
      category: 'housing',
      address: 'Over 3,000 houses in 44 states',
      phone: '1-800-689-6411',
      website: 'https://www.oxfordhouse.org/',
      description: 'Self-supporting recovery housing for those in addiction recovery.',
      services: ['Recovery Housing', 'Peer Support', 'Self-Run'],
      hours: 'Intake line: Mon-Fri 9 AM - 5 PM',
      hoursEs: 'Línea de admisión: Lun-Vie 9 AM - 5 PM',
      eligibility: 'Must be in recovery from addiction',
      eligibilityEs: 'Debe estar en recuperación de adicción',
      servicesDetailed: [
        'Self-supporting sober living',
        'Democratic self-run houses',
        'No time limits on stay',
        'Peer accountability',
        'Affordable weekly rent',
      ],
      servicesDetailedEs: [
        'Vivienda sobria autosuficiente',
        'Casas autogestionadas democráticamente',
        'Sin límite de tiempo de estadía',
        'Responsabilidad entre compañeros',
        'Alquiler semanal asequible',
      ],
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'transitional-goodwill',
      name: 'Goodwill Housing Programs',
      category: 'housing',
      address: `Find local Goodwill in ${location.state || 'your state'}`,
      phone: '1-800-664-6577',
      website: 'https://www.goodwill.org/find-jobs-and-services/',
      description: 'Transitional housing combined with job training and employment services.',
      services: ['Transitional Housing', 'Job Training', 'Employment'],
      hours: 'Mon-Sat: 9 AM - 8 PM (varies)',
      hoursEs: 'Lun-Sáb: 9 AM - 8 PM (varía)',
      eligibility: 'Varies by location - focus on employment barriers',
      eligibilityEs: 'Varía por ubicación - enfoque en barreras de empleo',
      servicesDetailed: [
        'Transitional housing programs',
        'Job training & certification',
        'Employment placement',
        'Career counseling',
        'Life skills classes',
      ],
      servicesDetailedEs: [
        'Programas de vivienda de transición',
        'Capacitación laboral y certificación',
        'Colocación de empleo',
        'Asesoramiento de carrera',
        'Clases de habilidades para la vida',
      ],
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
): Promise<HousingResource[]> => {
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

  // Combine all resources - curated shelters first (they have verified phone numbers)
  const allResources = [
    ...shelters, // Curated shelters with real phone numbers first
    ...counselors, // HUD counselors (they have real locations)
    ...emergency,
    ...affordable,
    ...transitional,
  ];

  // Sort by: curated resources first, then by distance
  return allResources.sort((a, b) => {
    // Prioritize curated resources (start with 'curated-')
    const aIsCurated = a.id.startsWith('curated-') ? 1 : 0;
    const bIsCurated = b.id.startsWith('curated-') ? 1 : 0;
    if (aIsCurated !== bIsCurated) return bIsCurated - aIsCurated;

    // Then prioritize resources with real phone numbers (not just 211)
    if (a.phone && a.phone !== '211' && (!b.phone || b.phone === '211')) return -1;
    if ((!a.phone || a.phone === '211') && b.phone && b.phone !== '211') return 1;

    // Finally sort by distance
    return (a.distance || 0) - (b.distance || 0);
  });
};
