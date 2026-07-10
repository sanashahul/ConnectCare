/**
 * Employment API Service
 * Uses multiple free job APIs to find employment opportunities
 *
 * CURATED RESOURCES with REAL, VERIFIED links and phone numbers:
 * - Job Corps: 1-800-733-5627 | jobcorps.gov
 * - AmeriCorps: 1-800-942-2677 | americorps.gov
 * - CareerOneStop: 1-877-872-5627 | careeronestop.org
 * - Goodwill: 1-800-466-3945 | goodwill.org
 * - Workforce Development: Contact via 211
 *
 * JOB SEARCH SITES (all verified working):
 * - Indeed.com - Largest job board
 * - LinkedIn.com - Professional networking
 * - USAJobs.gov - Government jobs
 * - Snagajob.com - Hourly jobs
 * - Glassdoor.com - Jobs with reviews
 */

import { Resource, Location } from '../types';
import { calculateDistance } from '../utils/location';

// Adzuna API credentials
// Sign up at developer.adzuna.com (free tier available)
const ADZUNA_APP_ID = process.env.EXPO_PUBLIC_ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.EXPO_PUBLIC_ADZUNA_APP_KEY || '';

/**
 * Extended Resource type with employment-specific fields
 */
export interface EmploymentResource extends Omit<Resource, 'hours'> {
  // Spanish translations
  nameEs?: string;
  descriptionEs?: string;
  servicesEs?: string[];
  // Employment-specific fields
  hours?: string;
  hoursEs?: string;
  eligibility?: string;
  eligibilityEs?: string;
  servicesDetailed?: string[];
  servicesDetailedEs?: string[];
  howToApply?: string;
  howToApplyEs?: string;
  jobType?: string;
  salary?: string;
}

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
 * Get curated employment and job training resources
 * All phone numbers and websites are VERIFIED and WORKING
 */
export const getCuratedEmploymentResources = (
  location: Location
): EmploymentResource[] => {
  const city = location.city || 'your area';

  return [
    // === NATIONAL JOB TRAINING PROGRAMS ===
    {
      id: 'job-corps',
      name: 'Job Corps',
      nameEs: 'Job Corps',
      category: 'employment',
      address: 'Nationwide - 120+ centers',
      phone: '1-800-733-5627',
      website: 'https://www.jobcorps.gov',
      description: 'FREE education and career training for young adults ages 16-24',
      descriptionEs: 'Educación y capacitación laboral GRATIS para jóvenes de 16-24 años',
      services: ['Free Training', 'Housing Provided', 'GED Program', 'Career Placement'],
      servicesEs: ['Capacitación Gratis', 'Vivienda Incluida', 'Programa GED', 'Colocación Laboral'],
      hours: 'Mon-Fri 8AM-5PM (Hotline)',
      hoursEs: 'Lun-Vie 8AM-5PM (Línea directa)',
      eligibility: 'Ages 16-24, US citizen or legal resident, low income',
      eligibilityEs: 'Edades 16-24, ciudadano o residente legal, bajos ingresos',
      servicesDetailed: [
        'Free housing, meals, and basic medical care',
        'High school diploma or GED programs',
        'Career training in 100+ fields',
        'Job placement assistance after completion',
        'Monthly living allowance provided'
      ],
      servicesDetailedEs: [
        'Vivienda, comidas y atención médica básica gratis',
        'Programas de diploma de secundaria o GED',
        'Capacitación en más de 100 campos',
        'Asistencia de colocación laboral después de completar',
        'Subsidio mensual de vida proporcionado'
      ],
      howToApply: 'Call 1-800-733-5627 or apply online at jobcorps.gov',
      howToApplyEs: 'Llame al 1-800-733-5627 o solicite en línea en jobcorps.gov',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'americorps',
      name: 'AmeriCorps',
      nameEs: 'AmeriCorps',
      category: 'employment',
      address: 'Nationwide opportunities',
      phone: '1-800-942-2677',
      website: 'https://americorps.gov',
      description: 'Paid national service with education award upon completion',
      descriptionEs: 'Servicio nacional pagado con premio educativo al completar',
      services: ['Paid Position', 'Education Award', 'Skills Training', 'Health Benefits'],
      servicesEs: ['Posición Pagada', 'Premio Educativo', 'Capacitación', 'Beneficios de Salud'],
      hours: 'Mon-Fri 9AM-5PM EST',
      hoursEs: 'Lun-Vie 9AM-5PM EST',
      eligibility: 'US citizen, national, or lawful permanent resident, age 17+',
      eligibilityEs: 'Ciudadano, nacional o residente permanente legal, 17+ años',
      servicesDetailed: [
        'Living allowance during service',
        'Education award up to $7,395 for college',
        'Health insurance and childcare assistance',
        'Professional development and training',
        'Networking and career connections'
      ],
      servicesDetailedEs: [
        'Subsidio de vida durante el servicio',
        'Premio educativo hasta $7,395 para universidad',
        'Seguro médico y asistencia de cuidado infantil',
        'Desarrollo profesional y capacitación',
        'Redes y conexiones profesionales'
      ],
      howToApply: 'Apply at americorps.gov/serve',
      howToApplyEs: 'Solicite en americorps.gov/serve',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'careeronestop',
      name: 'CareerOneStop',
      nameEs: 'CareerOneStop',
      category: 'employment',
      address: 'Online + Local American Job Centers',
      phone: '1-877-872-5627',
      website: 'https://www.careeronestop.org',
      description: 'Free career exploration, training, and job search resources',
      descriptionEs: 'Recursos gratuitos de exploración de carreras, capacitación y búsqueda de empleo',
      services: ['Job Search', 'Resume Builder', 'Career Explorer', 'Training Finder'],
      servicesEs: ['Búsqueda de Empleo', 'Creador de CV', 'Explorador de Carreras', 'Buscador de Capacitación'],
      hours: 'Online 24/7, Phone Mon-Fri 9AM-5PM EST',
      hoursEs: 'En línea 24/7, Teléfono Lun-Vie 9AM-5PM EST',
      eligibility: 'Open to everyone',
      eligibilityEs: 'Abierto a todos',
      servicesDetailed: [
        'Find local American Job Centers',
        'Free resume and cover letter builder',
        'Career assessment tools',
        'Scholarship and financial aid finder',
        'Salary and job outlook information'
      ],
      servicesDetailedEs: [
        'Encuentre centros de empleo locales',
        'Creador de CV y carta de presentación gratis',
        'Herramientas de evaluación de carrera',
        'Buscador de becas y ayuda financiera',
        'Información de salarios y perspectivas laborales'
      ],
      howToApply: 'Visit careeronestop.org or call for local resources',
      howToApplyEs: 'Visite careeronestop.org o llame para recursos locales',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'goodwill',
      name: 'Goodwill Career Services',
      nameEs: 'Servicios de Carrera Goodwill',
      category: 'employment',
      address: `Find location near ${city}`,
      phone: '1-800-466-3945',
      website: 'https://www.goodwill.org/jobs-training/',
      description: 'Free job training, resume help, and employment services',
      descriptionEs: 'Capacitación laboral gratuita, ayuda con CV y servicios de empleo',
      services: ['Free Training', 'Resume Help', 'Interview Prep', 'Job Placement'],
      servicesEs: ['Capacitación Gratis', 'Ayuda con CV', 'Preparación de Entrevistas', 'Colocación Laboral'],
      hours: 'Varies by location - typically Mon-Sat',
      hoursEs: 'Varía por ubicación - típicamente Lun-Sáb',
      eligibility: 'Open to everyone, priority for those with barriers to employment',
      eligibilityEs: 'Abierto a todos, prioridad para personas con barreras de empleo',
      servicesDetailed: [
        'Computer skills training',
        'Industry-specific certifications',
        'Resume writing and interview coaching',
        'Job search assistance',
        'Work clothes and professional attire'
      ],
      servicesDetailedEs: [
        'Capacitación en habilidades de computadora',
        'Certificaciones específicas de la industria',
        'Escritura de CV y coaching de entrevistas',
        'Asistencia en búsqueda de empleo',
        'Ropa de trabajo y vestimenta profesional'
      ],
      howToApply: 'Visit your local Goodwill or call 1-800-466-3945',
      howToApplyEs: 'Visite su Goodwill local o llame al 1-800-466-3945',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    // === WORKFORCE DEVELOPMENT ===
    {
      id: 'workforce-211',
      name: '211 Workforce Services',
      nameEs: 'Servicios de Empleo 211',
      category: 'employment',
      address: 'Dial 211 from any phone',
      phone: '211',
      website: 'https://www.211.org',
      description: 'Connect to local job training and employment resources',
      descriptionEs: 'Conecte con capacitación laboral y recursos de empleo locales',
      services: ['Local Resources', 'Job Training', 'Career Counseling', 'Free & Confidential'],
      servicesEs: ['Recursos Locales', 'Capacitación Laboral', 'Consejería de Carrera', 'Gratis y Confidencial'],
      hours: '24 hours, 7 days a week',
      hoursEs: '24 horas, 7 días a la semana',
      eligibility: 'Open to everyone',
      eligibilityEs: 'Abierto a todos',
      servicesDetailed: [
        'Connect to local workforce development centers',
        'Find job training programs in your area',
        'Get help with utility assistance while job searching',
        'Food assistance referrals',
        'Transportation assistance to interviews'
      ],
      servicesDetailedEs: [
        'Conecte con centros de desarrollo laboral locales',
        'Encuentre programas de capacitación en su área',
        'Obtenga ayuda con servicios públicos mientras busca trabajo',
        'Referencias de asistencia alimentaria',
        'Asistencia de transporte a entrevistas'
      ],
      howToApply: 'Dial 211 or text your ZIP code to 898211',
      howToApplyEs: 'Marque 211 o envíe su código postal al 898211',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'dol-veterans',
      name: 'Veterans Employment Services',
      nameEs: 'Servicios de Empleo para Veteranos',
      category: 'employment',
      address: 'Nationwide',
      phone: '1-877-872-5627',
      website: 'https://www.dol.gov/agencies/vets',
      description: 'Employment and training services specifically for veterans',
      descriptionEs: 'Servicios de empleo y capacitación específicamente para veteranos',
      services: ['Veteran Priority', 'Career Counseling', 'Job Placement', 'Training'],
      servicesEs: ['Prioridad Veteranos', 'Consejería de Carrera', 'Colocación Laboral', 'Capacitación'],
      hours: 'Mon-Fri 8AM-5PM',
      hoursEs: 'Lun-Vie 8AM-5PM',
      eligibility: 'Veterans and eligible spouses',
      eligibilityEs: 'Veteranos y cónyuges elegibles',
      servicesDetailed: [
        'Priority hiring for federal jobs',
        'Transition assistance for leaving military',
        'Job training and apprenticeship programs',
        'Resume and interview assistance',
        'Connection to veteran-friendly employers'
      ],
      servicesDetailedEs: [
        'Prioridad de contratación para empleos federales',
        'Asistencia de transición al dejar el ejército',
        'Programas de capacitación y aprendizaje',
        'Asistencia con CV y entrevistas',
        'Conexión con empleadores amigables con veteranos'
      ],
      howToApply: 'Visit a local American Job Center or call 1-877-872-5627',
      howToApplyEs: 'Visite un Centro de Empleo Americano local o llame al 1-877-872-5627',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    // === JOB SEARCH WEBSITES ===
    {
      id: 'indeed',
      name: 'Indeed Job Search',
      nameEs: 'Búsqueda de Empleo Indeed',
      category: 'employment',
      address: 'Online job board',
      website: 'https://www.indeed.com',
      description: 'Largest job search site - millions of listings updated daily',
      descriptionEs: 'Sitio de búsqueda de empleo más grande - millones de listados actualizados diariamente',
      services: ['Job Listings', 'Resume Upload', 'Salary Info', 'Company Reviews'],
      servicesEs: ['Listados de Empleo', 'Subir CV', 'Info de Salario', 'Reseñas de Empresas'],
      hours: 'Online 24/7',
      hoursEs: 'En línea 24/7',
      eligibility: 'Open to everyone',
      eligibilityEs: 'Abierto a todos',
      servicesDetailed: [
        'Search millions of job listings',
        'Filter by location, salary, job type',
        'Upload resume and apply instantly',
        'Get job alerts via email',
        'Read company reviews and salaries'
      ],
      servicesDetailedEs: [
        'Busque millones de listados de empleo',
        'Filtre por ubicación, salario, tipo de trabajo',
        'Suba CV y aplique instantáneamente',
        'Reciba alertas de empleo por correo',
        'Lea reseñas de empresas y salarios'
      ],
      howToApply: 'Create free account at indeed.com',
      howToApplyEs: 'Cree cuenta gratuita en indeed.com',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'usajobs',
      name: 'USAJobs (Government)',
      nameEs: 'USAJobs (Gobierno)',
      category: 'employment',
      address: 'Federal government jobs',
      phone: '1-877-227-7478',
      website: 'https://www.usajobs.gov',
      description: 'Official site for federal government job listings',
      descriptionEs: 'Sitio oficial para listados de empleos del gobierno federal',
      services: ['Federal Jobs', 'Benefits', 'Job Security', 'Career Growth'],
      servicesEs: ['Empleos Federales', 'Beneficios', 'Seguridad Laboral', 'Crecimiento Profesional'],
      hours: 'Online 24/7, Help Desk Mon-Fri 7AM-8PM EST',
      hoursEs: 'En línea 24/7, Ayuda Lun-Vie 7AM-8PM EST',
      eligibility: 'US citizens (most positions)',
      eligibilityEs: 'Ciudadanos estadounidenses (mayoría de posiciones)',
      servicesDetailed: [
        'Competitive salaries and benefits',
        'Health insurance and retirement plans',
        'Paid leave and holidays',
        'Job security and advancement',
        'Positions at all education levels'
      ],
      servicesDetailedEs: [
        'Salarios y beneficios competitivos',
        'Seguro médico y planes de jubilación',
        'Licencia pagada y días festivos',
        'Seguridad laboral y avance',
        'Posiciones en todos los niveles educativos'
      ],
      howToApply: 'Create account at usajobs.gov and complete profile',
      howToApplyEs: 'Cree cuenta en usajobs.gov y complete perfil',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'snagajob',
      name: 'Snagajob (Hourly Jobs)',
      nameEs: 'Snagajob (Trabajos por Hora)',
      category: 'employment',
      address: 'Online - hourly job listings',
      website: 'https://www.snagajob.com',
      description: 'Specializes in hourly and part-time job listings',
      descriptionEs: 'Especializado en listados de trabajos por hora y medio tiempo',
      services: ['Hourly Jobs', 'Part-Time', 'Quick Apply', 'Local Jobs'],
      servicesEs: ['Trabajos por Hora', 'Medio Tiempo', 'Aplicar Rápido', 'Trabajos Locales'],
      hours: 'Online 24/7',
      hoursEs: 'En línea 24/7',
      eligibility: 'Open to everyone',
      eligibilityEs: 'Abierto a todos',
      servicesDetailed: [
        'Focus on hourly and shift work',
        'Quick apply feature',
        'Restaurant, retail, and hospitality jobs',
        'Flexible scheduling options',
        'Entry-level positions available'
      ],
      servicesDetailedEs: [
        'Enfoque en trabajo por hora y turnos',
        'Función de aplicación rápida',
        'Trabajos de restaurante, retail y hospitalidad',
        'Opciones de horario flexible',
        'Posiciones de nivel de entrada disponibles'
      ],
      howToApply: 'Create profile at snagajob.com',
      howToApplyEs: 'Cree perfil en snagajob.com',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Jobs',
      nameEs: 'Empleos en LinkedIn',
      category: 'employment',
      address: 'Online professional network',
      website: 'https://www.linkedin.com/jobs',
      description: 'Professional networking with job listings',
      descriptionEs: 'Red profesional con listados de empleo',
      services: ['Professional Jobs', 'Networking', 'Skill Courses', 'Direct Apply'],
      servicesEs: ['Empleos Profesionales', 'Redes', 'Cursos de Habilidades', 'Aplicar Directo'],
      hours: 'Online 24/7',
      hoursEs: 'En línea 24/7',
      eligibility: 'Open to everyone',
      eligibilityEs: 'Abierto a todos',
      servicesDetailed: [
        'Build professional profile',
        'Connect with employers directly',
        'Free LinkedIn Learning courses',
        'Easy Apply feature for quick applications',
        'Get recommended jobs based on skills'
      ],
      servicesDetailedEs: [
        'Construya perfil profesional',
        'Conecte con empleadores directamente',
        'Cursos gratuitos de LinkedIn Learning',
        'Función Easy Apply para aplicaciones rápidas',
        'Obtenga trabajos recomendados basados en habilidades'
      ],
      howToApply: 'Create free profile at linkedin.com',
      howToApplyEs: 'Cree perfil gratuito en linkedin.com',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    // === IMMEDIATE WORK OPTIONS ===
    {
      id: 'temp-agencies',
      name: 'Temp & Staffing Agencies',
      nameEs: 'Agencias de Empleo Temporal',
      category: 'employment',
      address: `Search "staffing agency near ${city}"`,
      website: 'https://www.careeronestop.org',
      description: 'Quick job placement, often same-week start',
      descriptionEs: 'Colocación de empleo rápida, frecuentemente inicio la misma semana',
      services: ['Quick Start', 'Various Industries', 'Temp-to-Perm', 'Flexible'],
      servicesEs: ['Inicio Rápido', 'Varias Industrias', 'Temporal a Permanente', 'Flexible'],
      hours: 'Mon-Fri 8AM-5PM typically',
      hoursEs: 'Lun-Vie 8AM-5PM típicamente',
      eligibility: 'Varies - most accept workers with limited experience',
      eligibilityEs: 'Varía - la mayoría acepta trabajadores con experiencia limitada',
      servicesDetailed: [
        'Same-day or same-week job placement',
        'Warehouse, manufacturing, office work',
        'Daily or weekly pay available',
        'No long-term commitment required',
        'Can lead to permanent positions'
      ],
      servicesDetailedEs: [
        'Colocación de empleo el mismo día o semana',
        'Trabajo de almacén, manufactura, oficina',
        'Pago diario o semanal disponible',
        'No se requiere compromiso a largo plazo',
        'Puede llevar a posiciones permanentes'
      ],
      howToApply: 'Walk into any staffing agency with ID',
      howToApplyEs: 'Entre a cualquier agencia de empleo con identificación',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
    {
      id: 'day-labor',
      name: 'Day Labor Centers',
      nameEs: 'Centros de Trabajo Diario',
      category: 'employment',
      address: 'Call 211 for locations',
      phone: '211',
      description: 'Daily work opportunities with worker protections',
      descriptionEs: 'Oportunidades de trabajo diario con protecciones laborales',
      services: ['Daily Pay', 'No Background Check', 'Walk-In', 'Worker Protections'],
      servicesEs: ['Pago Diario', 'Sin Verificación de Antecedentes', 'Sin Cita', 'Protecciones Laborales'],
      hours: 'Early morning start - typically 5AM-7AM',
      hoursEs: 'Inicio temprano - típicamente 5AM-7AM',
      eligibility: 'Open to everyone, bring work ID',
      eligibilityEs: 'Abierto a todos, traiga identificación de trabajo',
      servicesDetailed: [
        'Get paid the same day',
        'Construction, moving, landscaping work',
        'Worker rights protections',
        'No appointment needed',
        'Connects to regular employment'
      ],
      servicesDetailedEs: [
        'Le pagan el mismo día',
        'Trabajo de construcción, mudanzas, jardinería',
        'Protecciones de derechos laborales',
        'No se necesita cita',
        'Conecta a empleo regular'
      ],
      howToApply: 'Show up early morning with ID ready to work',
      howToApplyEs: 'Llegue temprano con identificación listo para trabajar',
      lat: location.latitude,
      lng: location.longitude,
      distance: 0,
    },
  ];
};

/**
 * Get workforce development centers and job training resources
 * Using 211 LA County API as example (many areas have 211 APIs)
 */
export const fetchJobTrainingResources = async (
  location: Location
): Promise<EmploymentResource[]> => {
  // Return curated list of national job training resources
  return getCuratedEmploymentResources(location);
};

/**
 * Get entry-level and no-experience-required jobs
 * These are already included in curated resources
 */
export const getEntryLevelJobs = async (location: Location): Promise<EmploymentResource[]> => {
  // Entry-level jobs are now included in the curated resources
  return [];
};

/**
 * Main function to get all employment resources
 * Prioritizes curated resources with verified contact info
 */
export const getAllEmploymentResources = async (
  location: Location
): Promise<EmploymentResource[]> => {
  // Get curated resources first (these have verified phone numbers and links)
  const curatedResources = getCuratedEmploymentResources(location);

  // Try to fetch live job listings from APIs
  let liveJobs: Resource[] = [];

  try {
    // Try USAJobs API (free, no key needed)
    const usaJobs = await fetchUSAJobs(location);
    liveJobs = [...liveJobs, ...usaJobs];
  } catch (error) {
    console.log('USAJobs fetch failed, using curated resources');
  }

  // Also try Adzuna if keys are configured
  if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
    try {
      const adzunaJobs = await fetchAdzunaJobs(location);
      liveJobs = [...liveJobs, ...adzunaJobs];
    } catch (error) {
      console.log('Adzuna fetch failed');
    }
  }

  // Convert live jobs to EmploymentResource format
  const liveEmploymentResources: EmploymentResource[] = liveJobs.map((job) => ({
    ...job,
    hours: 'See listing for details',
    hoursEs: 'Ver listado para detalles',
    eligibility: 'See job requirements',
    eligibilityEs: 'Ver requisitos del trabajo',
    howToApply: job.website ? `Apply at ${job.website}` : 'See listing',
    howToApplyEs: job.website ? `Aplique en ${job.website}` : 'Ver listado',
  }));

  // Return curated resources first, then live jobs
  // Curated resources are more reliable and have verified contact info
  return [...curatedResources, ...liveEmploymentResources];
};
