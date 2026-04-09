/**
 * Profile Insights
 *
 * Reads a UserProfile's intake-form answers and derives:
 *  - boolean flags for downstream filtering
 *  - an ordered list of urgent needs (for the Dashboard banner)
 *  - intake summaries per category (for the "Based on your intake" cards)
 *  - personalized ordering for each category's "For You" content
 *
 * This is the bridge that makes intake answers actually drive what the
 * user sees on their personalized dashboard.
 */

import { UserProfile, QuestionAnswer } from '../types';

// ============================================
// TYPES
// ============================================

export interface ProfileFlags {
  // Healthcare
  urgentMentalHealth: boolean;
  needsMentalHealth: boolean;
  hasMentalHealthCondition: boolean;
  urgentDental: boolean;
  uninsured: boolean;
  pregnant: boolean;
  hasChildrenNeedingCare: boolean;
  hasDisability: boolean;
  substanceUseHelpWanted: boolean;
  hasChronicCondition: boolean;
  needsVision: boolean;
  onMedications: boolean;
  // Housing
  unsheltered: boolean;
  livingInVehicle: boolean;
  inShelter: boolean;
  chronicallyHomeless: boolean;
  hasChildrenInHousehold: boolean;
  hasPets: boolean;
  veteran: boolean;
  hasVoucher: boolean;
  recentlyEvicted: boolean;
  needsADAHousing: boolean;
  noIncome: boolean;
  // Employment
  unemployed: boolean;
  hasNoID: boolean;
  noReliableTransportation: boolean;
  hasWorkAuthIssue: boolean;
  hasBackgroundIssue: boolean;
  needsResumeHelp: boolean;
  needsJobTraining: boolean;
  needsEnglishClasses: boolean;
  bilingual: boolean;
  /**
   * User reported less than a high school diploma / GED.
   * Drives the "Free GED programs" recommendation.
   */
  needsGED: boolean;
}

export type ActionType = 'call' | 'navigate' | 'url';

export interface UrgentNeed {
  id: string;
  category: 'healthcare' | 'housing' | 'employment' | 'general';
  icon: string;
  title: string;
  titleEs: string;
  subtitle: string;
  subtitleEs: string;
  // Primary action — the big button on the card (usually a phone call)
  actionLabel: string;
  actionLabelEs: string;
  actionType: ActionType;
  actionPayload: string; // phone number, screen name, or URL
  // Optional secondary action — a small "Explore in app" link that
  // navigates to the relevant category screen so the user can browse
  // local resources (clinics/shelters/jobs) directly in the app.
  exploreScreen?: 'Health' | 'Housing' | 'Jobs';
  priority: number; // higher = more urgent
  sourceQuestionId: string;
}

export interface IntakeSummaryItem {
  icon: string;
  label: string;
  labelEs: string;
  value: string;
  valueEs: string;
}

/**
 * A specific, actionable recommendation generated from the user's intake
 * answers. Shown in the "Based on your intake" section of category screens
 * (HealthScreen, HousingScreen, JobsScreen) — these are more specific than
 * the urgent-needs banner: e.g. "Free dental clinics near you" for someone
 * who said they need a dental checkup, or "Warehouse jobs — morning shifts"
 * for someone who wants warehouse work and can do mornings.
 */
export interface PersonalizedRecommendation {
  id: string;
  icon: string;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  /** Short explanation of why we're suggesting this — cites the intake answer. */
  reason: string;
  reasonEs: string;
  actionLabel: string;
  actionLabelEs: string;
  actionType: ActionType;
  actionPayload: string;
}

// ============================================
// HELPERS
// ============================================

const findAnswer = (
  answers: QuestionAnswer[],
  id: string,
): string | string[] | undefined => answers.find((a) => a.questionId === id)?.answer;

const eq = (a: string | string[] | undefined, val: string): boolean => {
  if (!a) return false;
  if (Array.isArray(a)) return a.includes(val);
  return a === val;
};

const arrIncludes = (
  a: string | string[] | undefined,
  val: string,
): boolean => Array.isArray(a) && a.includes(val);

// ============================================
// FLAGS
// ============================================

export const getProfileFlags = (profile: UserProfile | null): ProfileFlags => {
  const answers = profile?.answers || [];

  const health_1 = findAnswer(answers, 'health_1');
  const health_2 = findAnswer(answers, 'health_2');
  const health_3 = findAnswer(answers, 'health_3');
  const health_5 = findAnswer(answers, 'health_5');
  const health_6 = findAnswer(answers, 'health_6');
  const health_7 = findAnswer(answers, 'health_7');
  const health_8 = findAnswer(answers, 'health_8');
  const health_9 = findAnswer(answers, 'health_9');
  const health_10 = findAnswer(answers, 'health_10');

  const housing_1 = findAnswer(answers, 'housing_1');
  const housing_2 = findAnswer(answers, 'housing_2');
  const housing_3 = findAnswer(answers, 'housing_3');
  const housing_4 = findAnswer(answers, 'housing_4');
  const housing_5 = findAnswer(answers, 'housing_5');
  const housing_6 = findAnswer(answers, 'housing_6');
  const housing_7 = findAnswer(answers, 'housing_7');
  const housing_8 = findAnswer(answers, 'housing_8');
  const housing_10 = findAnswer(answers, 'housing_10');

  const employ_1 = findAnswer(answers, 'employ_1');
  const employ_3 = findAnswer(answers, 'employ_3');
  const employ_4 = findAnswer(answers, 'employ_4');
  const employ_6 = findAnswer(answers, 'employ_6');
  const employ_7 = findAnswer(answers, 'employ_7');
  const employ_8 = findAnswer(answers, 'employ_8');
  const employ_10 = findAnswer(answers, 'employ_10');

  return {
    // Healthcare
    urgentMentalHealth: eq(health_5, 'yes_urgent'),
    needsMentalHealth: eq(health_5, 'yes_urgent') || eq(health_5, 'yes'),
    hasMentalHealthCondition: arrIncludes(health_2, 'mental'),
    urgentDental: eq(health_6, 'yes_urgent'),
    uninsured: eq(health_1, 'no'),
    pregnant: eq(health_8, 'pregnant') || eq(health_8, 'both'),
    hasChildrenNeedingCare: eq(health_8, 'children') || eq(health_8, 'both'),
    hasDisability:
      health_9 !== undefined && !eq(health_9, 'no'),
    substanceUseHelpWanted:
      eq(health_10, 'yes_help') || eq(health_10, 'yes_info'),
    hasChronicCondition:
      Array.isArray(health_2) &&
      health_2.length > 0 &&
      !health_2.every((v) => v === 'none'),
    needsVision: eq(health_7, 'yes_glasses') || eq(health_7, 'yes_exam'),
    onMedications: eq(health_3, 'yes'),

    // Housing
    unsheltered: eq(housing_1, 'street') || eq(housing_1, 'vehicle'),
    livingInVehicle: eq(housing_1, 'vehicle'),
    inShelter: eq(housing_1, 'shelter'),
    chronicallyHomeless: eq(housing_2, 'over_year'),
    hasChildrenInHousehold:
      eq(housing_4, 'yes') || eq(housing_4, 'separated'),
    hasPets: housing_5 !== undefined && !eq(housing_5, 'no'),
    veteran: eq(housing_3, 'yes'),
    hasVoucher:
      eq(housing_8, 'section8') ||
      eq(housing_8, 'vash') ||
      eq(housing_8, 'other'),
    recentlyEvicted: eq(housing_7, 'yes_recent'),
    needsADAHousing:
      eq(housing_10, 'yes_wheelchair') || eq(housing_10, 'yes_other'),
    noIncome: arrIncludes(housing_6, 'none'),

    // Employment
    unemployed: eq(employ_1, 'unemployed'),
    hasNoID: eq(employ_3, 'no') || eq(employ_3, 'expired'),
    noReliableTransportation:
      eq(employ_4, 'no') || eq(employ_4, 'limited'),
    hasWorkAuthIssue: arrIncludes(employ_6, 'legal'),
    hasBackgroundIssue: eq(employ_8, 'no'),
    needsResumeHelp: arrIncludes(employ_10, 'resume'),
    needsJobTraining: arrIncludes(employ_10, 'training'),
    needsEnglishClasses: arrIncludes(employ_10, 'english'),
    bilingual: arrIncludes(employ_7, 'bilingual'),
    needsGED:
      eq(findAnswer(answers, 'employ_2'), 'none') ||
      eq(findAnswer(answers, 'employ_2'), 'some_high'),
  };
};

// ============================================
// URGENT NEEDS
// ============================================

/**
 * Returns a priority-sorted list of urgent actions the user should take,
 * based on their intake answers. Drives the Dashboard "Urgent Needs" banner.
 *
 * If `category` is provided, only needs for that category (plus 'general')
 * are returned — this lets category screens show a filtered banner.
 */
export const getUrgentNeeds = (
  profile: UserProfile | null,
  category?: 'healthcare' | 'housing' | 'employment',
): UrgentNeed[] => {
  if (!profile) return [];
  const flags = getProfileFlags(profile);
  const isMinor = profile.ageGroup === 'under18';
  const needs: UrgentNeed[] = [];

  // ============================================
  // YOUTH-SPECIFIC URGENT NEEDS (under 18)
  // ============================================
  // If the user is a minor, these youth-focused resources are ALWAYS
  // surfaced — having these one tap away is critical for runaway,
  // abuse, and crisis situations regardless of what specific intake
  // answers were given.
  if (isMinor) {
    needs.push({
      id: 'youth-crisis-text',
      category: 'general',
      icon: '💬',
      title: 'Free crisis text support (24/7)',
      titleEs: 'Apoyo de crisis por texto (24/7)',
      subtitle:
        'Text HOME to 741741 — free, confidential, available any time.',
      subtitleEs:
        'Envía HOME al 741741 — gratis, confidencial, a cualquier hora.',
      actionLabel: 'Text HOME to 741741',
      actionLabelEs: 'Enviar HOME al 741741',
      actionType: 'url',
      actionPayload: 'sms:741741?body=HOME',
      priority: 88,
      sourceQuestionId: 'age',
    });

    needs.push({
      id: 'youth-runaway-safeline',
      category: 'general',
      icon: '🏃',
      title: 'National Runaway Safeline',
      titleEs: 'Línea Nacional para Fugitivos',
      subtitle:
        'Safe, confidential help 24/7 — even if you’re not running away.',
      subtitleEs:
        'Ayuda segura y confidencial 24/7 — aunque no estés huyendo.',
      actionLabel: 'Call 1-800-786-2929',
      actionLabelEs: 'Llama al 1-800-786-2929',
      actionType: 'call',
      actionPayload: '1-800-786-2929',
      priority: 82,
      sourceQuestionId: 'age',
    });

    needs.push({
      id: 'youth-childhelp',
      category: 'general',
      icon: '🆘',
      title: 'Childhelp (abuse hotline)',
      titleEs: 'Childhelp (línea de abuso)',
      subtitle:
        'If you are being hurt or feel unsafe, call 24/7 — free and confidential.',
      subtitleEs:
        'Si te están lastimando o te sientes inseguro, llama 24/7 — gratis.',
      actionLabel: 'Call 1-800-422-4453',
      actionLabelEs: 'Llama al 1-800-422-4453',
      actionType: 'call',
      actionPayload: '1-800-422-4453',
      priority: 80,
      sourceQuestionId: 'age',
    });

    needs.push({
      id: 'youth-trevor-project',
      category: 'general',
      icon: '🌈',
      title: 'Trevor Project (LGBTQ+)',
      titleEs: 'Proyecto Trevor (LGBTQ+)',
      subtitle:
        'Free crisis support for LGBTQ+ youth — 24/7, text or call.',
      subtitleEs:
        'Apoyo gratuito para jóvenes LGBTQ+ — 24/7, texto o llamada.',
      actionLabel: 'Call 1-866-488-7386',
      actionLabelEs: 'Llama al 1-866-488-7386',
      actionType: 'call',
      actionPayload: '1-866-488-7386',
      priority: 76,
      sourceQuestionId: 'age',
    });
  }

  if (flags.urgentMentalHealth) {
    needs.push({
      id: 'urgent-mental-health',
      category: 'healthcare',
      icon: '💚',
      title: 'Urgent mental health support',
      titleEs: 'Apoyo urgente de salud mental',
      subtitle:
        'You told us you need help now. Talk to a trained counselor free, 24/7.',
      subtitleEs:
        'Nos dijiste que necesitas ayuda ahora. Habla con un consejero gratis, 24/7.',
      actionLabel: 'Call 988 — Crisis Lifeline',
      actionLabelEs: 'Llama al 988',
      actionType: 'call',
      actionPayload: '988',
      priority: 100,
      sourceQuestionId: 'health_5',
    });
  }

  if (flags.unsheltered) {
    // Youth 16-24 get routed to Covenant House Nineline first — it's a
    // youth-specific crisis and shelter referral line that knows how to
    // place minors safely, whereas 211 shelter listings often only serve
    // adults or families.
    if (isMinor) {
      needs.push({
        id: 'youth-unsheltered',
        category: 'housing',
        icon: flags.livingInVehicle ? '🚗' : '🛏️',
        title: flags.livingInVehicle
          ? 'Unsafe place to stay (under 18)'
          : 'You’re unsheltered (under 18)',
        titleEs: flags.livingInVehicle
          ? 'Lugar inseguro (menor de 18)'
          : 'Sin refugio (menor de 18)',
        subtitle:
          'Covenant House Nineline places youth safely — 24/7, confidential.',
        subtitleEs:
          'Covenant House Nineline ayuda a jóvenes — 24/7, confidencial.',
        actionLabel: 'Call Nineline — 1-800-999-9999',
        actionLabelEs: 'Llama Nineline — 1-800-999-9999',
        actionType: 'call',
        actionPayload: '1-800-999-9999',
        priority: 99,
        sourceQuestionId: 'housing_1',
      });
    } else {
      needs.push({
        id: 'unsheltered',
        category: 'housing',
        icon: flags.livingInVehicle ? '🚗' : '🛏️',
        title: flags.livingInVehicle
          ? 'You’re living in your vehicle'
          : 'You’re unsheltered tonight',
        titleEs: flags.livingInVehicle
          ? 'Estás viviendo en tu vehículo'
          : 'Estás sin refugio esta noche',
        subtitle: 'Find a safe place to sleep. Shelter referrals available now.',
        subtitleEs: 'Encuentra un lugar seguro. Referencias de refugio ahora.',
        actionLabel: 'Call 211 (press 6 for shelter)',
        actionLabelEs: 'Llama al 211',
        actionType: 'call',
        actionPayload: '211',
        exploreScreen: 'Housing',
        priority: 95,
        sourceQuestionId: 'housing_1',
      });
    }
  }

  if (flags.hasChildrenInHousehold && (flags.unsheltered || flags.inShelter)) {
    needs.push({
      id: 'family-homeless',
      category: 'housing',
      icon: '👨‍👩‍👧',
      title: 'Family-friendly shelter',
      titleEs: 'Refugio para familias',
      subtitle:
        'Family Promise keeps families together and has rooms for children.',
      subtitleEs:
        'Family Promise mantiene familias juntas y tiene espacio para niños.',
      actionLabel: 'Call Family Promise',
      actionLabelEs: 'Llama a Family Promise',
      actionType: 'call',
      actionPayload: '908-273-1100',
      exploreScreen: 'Housing',
      priority: 92,
      sourceQuestionId: 'housing_4',
    });
  }

  if (flags.pregnant && flags.uninsured) {
    needs.push({
      id: 'pregnant-uninsured',
      category: 'healthcare',
      icon: '🤰',
      title: 'Free prenatal care',
      titleEs: 'Atención prenatal gratis',
      subtitle:
        'You’re pregnant and uninsured — Medicaid covers prenatal care in every state.',
      subtitleEs:
        'Estás embarazada y sin seguro — Medicaid cubre atención prenatal.',
      actionLabel: 'Call 211 for Medicaid help',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Health',
      priority: 90,
      sourceQuestionId: 'health_8',
    });
  }

  if (flags.veteran && (flags.unsheltered || flags.inShelter)) {
    needs.push({
      id: 'veteran-homeless',
      category: 'housing',
      icon: '🎖️',
      title: 'Veteran housing support',
      titleEs: 'Apoyo de vivienda para veteranos',
      subtitle:
        'You qualify for VA homeless services like HUD-VASH and SSVF.',
      subtitleEs:
        'Calificas para servicios VA como HUD-VASH y SSVF.',
      actionLabel: 'Call VA — 1-877-424-3838',
      actionLabelEs: 'Llama a VA',
      actionType: 'call',
      actionPayload: '1-877-424-3838',
      exploreScreen: 'Housing',
      priority: 85,
      sourceQuestionId: 'housing_3',
    });
  }

  if (flags.substanceUseHelpWanted) {
    needs.push({
      id: 'substance-use',
      category: 'healthcare',
      icon: '🤝',
      title: 'Substance use support',
      titleEs: 'Apoyo con uso de sustancias',
      subtitle:
        'SAMHSA offers free, confidential 24/7 treatment referrals.',
      subtitleEs:
        'SAMHSA ofrece referencias de tratamiento gratis, 24/7.',
      actionLabel: 'Call SAMHSA — 1-800-662-4357',
      actionLabelEs: 'Llama a SAMHSA',
      actionType: 'call',
      actionPayload: '1-800-662-4357',
      priority: 78,
      sourceQuestionId: 'health_10',
    });
  }

  if (
    flags.needsMentalHealth &&
    !flags.urgentMentalHealth &&
    !needs.some((n) => n.id === 'urgent-mental-health')
  ) {
    needs.push({
      id: 'mental-health-support',
      category: 'healthcare',
      icon: '💚',
      title: 'Mental health support',
      titleEs: 'Apoyo de salud mental',
      subtitle:
        'You asked for mental health help. Community counseling is available.',
      subtitleEs:
        'Pediste ayuda de salud mental. Consejería comunitaria disponible.',
      actionLabel: 'Find counseling near you',
      actionLabelEs: 'Buscar consejería cerca',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
      exploreScreen: 'Health',
      priority: 72,
      sourceQuestionId: 'health_5',
    });
  }

  if (flags.urgentDental) {
    needs.push({
      id: 'urgent-dental',
      category: 'healthcare',
      icon: '🦷',
      title: 'Urgent dental pain',
      titleEs: 'Dolor dental urgente',
      subtitle: 'Free and low-cost emergency dental care is available.',
      subtitleEs: 'Hay atención dental de emergencia gratis/bajo costo.',
      actionLabel: 'Call 211 for dental clinics',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Health',
      priority: 70,
      sourceQuestionId: 'health_6',
    });
  } else if (findAnswer(profile.answers, 'health_6') === 'yes') {
    // Regular dental checkup needed (non-urgent)
    needs.push({
      id: 'dental-checkup',
      category: 'healthcare',
      icon: '🦷',
      title: 'Dental checkup needed',
      titleEs: 'Chequeo dental necesario',
      subtitle:
        'Community health centers often have free/sliding-scale dental clinics.',
      subtitleEs:
        'Los centros de salud comunitarios tienen clínicas dentales gratis o de bajo costo.',
      actionLabel: 'Find dental clinics near you',
      actionLabelEs: 'Buscar clínicas dentales',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
      exploreScreen: 'Health',
      priority: 42,
      sourceQuestionId: 'health_6',
    });
  }

  if (flags.needsVision) {
    const visionAnswer = findAnswer(profile.answers, 'health_7');
    needs.push({
      id: 'vision-care',
      category: 'healthcare',
      icon: '👓',
      title:
        visionAnswer === 'yes_glasses'
          ? 'Free glasses/contacts'
          : 'Free eye exam',
      titleEs:
        visionAnswer === 'yes_glasses'
          ? 'Lentes/contactos gratis'
          : 'Examen de la vista gratis',
      subtitle:
        'Lions Club, VSP Eyes of Hope, and OneSight offer free vision care nationally.',
      subtitleEs:
        'Lions Club, VSP Eyes of Hope y OneSight ofrecen atención visual gratis a nivel nacional.',
      actionLabel: 'Call 211 for vision care',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Health',
      priority: 52,
      sourceQuestionId: 'health_7',
    });
  }

  if (flags.onMedications && flags.uninsured) {
    needs.push({
      id: 'prescription-help',
      category: 'healthcare',
      icon: '💊',
      title: 'Prescription assistance',
      titleEs: 'Asistencia con recetas',
      subtitle:
        'You take medications but have no insurance — NeedyMeds, GoodRx, and Rx Outreach offer free/discount meds.',
      subtitleEs:
        'Tomas medicamentos pero no tienes seguro — NeedyMeds, GoodRx y Rx Outreach ofrecen descuentos.',
      actionLabel: 'Call 211 for Rx help',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Health',
      priority: 65,
      sourceQuestionId: 'health_3',
    });
  }

  if (flags.hasChronicCondition && flags.uninsured) {
    needs.push({
      id: 'chronic-care',
      category: 'healthcare',
      icon: '🫀',
      title: 'Chronic care without insurance',
      titleEs: 'Atención crónica sin seguro',
      subtitle:
        'FQHCs offer ongoing care for diabetes, heart disease, and other chronic conditions.',
      subtitleEs:
        'Los FQHCs ofrecen atención continua para diabetes, enfermedad cardíaca y otras condiciones crónicas.',
      actionLabel: 'Find an FQHC near you',
      actionLabelEs: 'Buscar FQHC cercano',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
      exploreScreen: 'Health',
      priority: 63,
      sourceQuestionId: 'health_2',
    });
  }

  if (flags.hasChildrenNeedingCare) {
    needs.push({
      id: 'childrens-healthcare',
      category: 'healthcare',
      icon: '👶',
      title: 'Children’s healthcare (CHIP)',
      titleEs: 'Salud infantil (CHIP)',
      subtitle:
        'Children’s Health Insurance Program (CHIP) covers kids even if parents don’t qualify for Medicaid.',
      subtitleEs:
        'CHIP cubre a niños aunque los padres no califiquen para Medicaid.',
      actionLabel: 'Call CHIP — 1-877-543-7669',
      actionLabelEs: 'Llama a CHIP',
      actionType: 'call',
      actionPayload: '1-877-543-7669',
      exploreScreen: 'Health',
      priority: 58,
      sourceQuestionId: 'health_8',
    });
  }

  if (flags.needsADAHousing) {
    needs.push({
      id: 'ada-housing',
      category: 'housing',
      icon: '♿',
      title: 'Accessible housing needs',
      titleEs: 'Necesidades de vivienda accesible',
      subtitle:
        'HUD helps you find ADA-accessible housing in your area.',
      subtitleEs:
        'HUD ayuda a encontrar vivienda accesible ADA en tu área.',
      actionLabel: 'Call HUD Fair Housing — 1-800-669-9777',
      actionLabelEs: 'Llama a HUD Fair Housing',
      actionType: 'call',
      actionPayload: '1-800-669-9777',
      exploreScreen: 'Housing',
      priority: 60,
      sourceQuestionId: 'housing_10',
    });
  }

  if (flags.uninsured && !flags.pregnant) {
    needs.push({
      id: 'uninsured',
      category: 'healthcare',
      icon: '🏥',
      title: 'No health insurance',
      titleEs: 'Sin seguro médico',
      subtitle:
        'FQHCs serve everyone — sliding-scale fees regardless of income.',
      subtitleEs:
        'FQHCs atienden a todos — tarifas ajustadas a tus ingresos.',
      actionLabel: 'Find a free clinic near you',
      actionLabelEs: 'Buscar clínica cercana',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
      exploreScreen: 'Health',
      priority: 55,
      sourceQuestionId: 'health_1',
    });
  }

  if (flags.hasNoID && flags.unemployed) {
    needs.push({
      id: 'no-id',
      category: 'employment',
      icon: '🪪',
      title: 'Get a valid ID',
      titleEs: 'Obtener una identificación',
      subtitle:
        'Most jobs require a valid ID. Free help getting one is available.',
      subtitleEs:
        'La mayoría de trabajos requieren ID. Hay ayuda gratis para obtenerla.',
      actionLabel: 'Call 211 for ID help',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Jobs',
      priority: 50,
      sourceQuestionId: 'employ_3',
    });
  }

  if (flags.recentlyEvicted) {
    needs.push({
      id: 'recent-eviction',
      category: 'housing',
      icon: '⚠️',
      title: 'Recent eviction on record',
      titleEs: 'Desalojo reciente',
      subtitle:
        'HUD housing counselors can help with second-chance housing.',
      subtitleEs:
        'Consejeros de HUD pueden ayudar con vivienda de segunda oportunidad.',
      actionLabel: 'Call 211 for housing counsel',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      exploreScreen: 'Housing',
      priority: 45,
      sourceQuestionId: 'housing_7',
    });
  }

  // Sort by priority (highest first)
  const sorted = needs.sort((a, b) => b.priority - a.priority);

  // If a category filter was passed, return only items in that category
  // plus any 'general' items (like youth crisis hotlines that apply
  // everywhere). Otherwise return everything.
  if (category) {
    return sorted.filter(
      (n) => n.category === category || n.category === 'general',
    );
  }
  return sorted;
};

// ============================================
// PERSONALIZED "FOR YOU" ORDERING
// ============================================

/**
 * Returns an ordered list of FOR_YOU content IDs (hfy1..hfy4 etc.)
 * prioritized based on the user's intake answers.
 */
export const getHealthcareForYouOrder = (
  profile: UserProfile | null,
): string[] => {
  const flags = getProfileFlags(profile);
  const order: string[] = [];
  // HealthScreen HEALTH_FOR_YOU IDs:
  //   hfy1 Medicaid, hfy2 Free clinics, hfy3 Mental health, hfy4 Rx
  if (
    flags.urgentMentalHealth ||
    flags.needsMentalHealth ||
    flags.hasMentalHealthCondition
  ) {
    order.push('hfy3');
  }
  if (flags.uninsured) {
    order.push('hfy1');
    order.push('hfy2');
  }
  if (flags.onMedications) order.push('hfy4');
  (['hfy1', 'hfy2', 'hfy3', 'hfy4'] as const).forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });
  return order;
};

export const getHousingForYouOrder = (
  profile: UserProfile | null,
): string[] => {
  const flags = getProfileFlags(profile);
  const order: string[] = [];
  // HousingScreen HOUSING_FOR_YOU IDs:
  //   hfy1 Section 8, hfy2 Emergency shelter, hfy3 Rental help, hfy4 Tenant rights
  if (flags.unsheltered || flags.inShelter || flags.livingInVehicle) {
    order.push('hfy2');
  }
  if (flags.recentlyEvicted || flags.noIncome) order.push('hfy3');
  if (flags.hasVoucher) order.push('hfy1');
  (['hfy1', 'hfy2', 'hfy3', 'hfy4'] as const).forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });
  return order;
};

export const getJobsForYouOrder = (
  profile: UserProfile | null,
): string[] => {
  const flags = getProfileFlags(profile);
  const order: string[] = [];
  // JobsScreen JOBS_FOR_YOU IDs:
  //   jfy1 Resume, jfy2 Interview, jfy3 Work auth, jfy4 Training
  if (flags.needsResumeHelp) order.push('jfy1');
  if (flags.hasWorkAuthIssue) order.push('jfy3');
  if (flags.needsJobTraining) order.push('jfy4');
  (['jfy1', 'jfy2', 'jfy3', 'jfy4'] as const).forEach((id) => {
    if (!order.includes(id)) order.push(id);
  });
  return order;
};

// ============================================
// INTAKE SUMMARIES (for "Based on your intake" cards)
// ============================================

export const getHealthcareSummary = (
  profile: UserProfile | null,
): IntakeSummaryItem[] => {
  const flags = getProfileFlags(profile);
  const items: IntakeSummaryItem[] = [];
  if (flags.uninsured) {
    items.push({
      icon: '🚫',
      label: 'Insurance',
      labelEs: 'Seguro',
      value: 'No coverage',
      valueEs: 'Sin cobertura',
    });
  }
  if (flags.urgentMentalHealth) {
    items.push({
      icon: '💚',
      label: 'Mental health',
      labelEs: 'Salud mental',
      value: 'Urgent',
      valueEs: 'Urgente',
    });
  } else if (flags.needsMentalHealth) {
    items.push({
      icon: '💚',
      label: 'Mental health',
      labelEs: 'Salud mental',
      value: 'Support wanted',
      valueEs: 'Apoyo deseado',
    });
  }
  if (flags.pregnant) {
    items.push({
      icon: '🤰',
      label: 'Pregnancy',
      labelEs: 'Embarazo',
      value: 'Yes',
      valueEs: 'Sí',
    });
  }
  if (flags.hasChildrenNeedingCare) {
    items.push({
      icon: '👶',
      label: 'Children',
      labelEs: 'Niños',
      value: 'Need care',
      valueEs: 'Necesitan atención',
    });
  }
  if (flags.hasDisability) {
    items.push({
      icon: '♿',
      label: 'Disability',
      labelEs: 'Discapacidad',
      value: 'Yes',
      valueEs: 'Sí',
    });
  }
  if (flags.substanceUseHelpWanted) {
    items.push({
      icon: '🤝',
      label: 'Substance use',
      labelEs: 'Sustancias',
      value: 'Wants help',
      valueEs: 'Quiere ayuda',
    });
  }
  if (flags.urgentDental) {
    items.push({
      icon: '🦷',
      label: 'Dental',
      labelEs: 'Dental',
      value: 'Urgent pain',
      valueEs: 'Dolor urgente',
    });
  }
  if (flags.onMedications) {
    items.push({
      icon: '💊',
      label: 'Medications',
      labelEs: 'Medicamentos',
      value: 'Currently taking',
      valueEs: 'Tomando',
    });
  }
  return items;
};

export const getHousingSummary = (
  profile: UserProfile | null,
): IntakeSummaryItem[] => {
  const flags = getProfileFlags(profile);
  const items: IntakeSummaryItem[] = [];
  if (flags.livingInVehicle) {
    items.push({
      icon: '🚗',
      label: 'Situation',
      labelEs: 'Situación',
      value: 'Living in vehicle',
      valueEs: 'En vehículo',
    });
  } else if (flags.unsheltered) {
    items.push({
      icon: '🛏️',
      label: 'Situation',
      labelEs: 'Situación',
      value: 'Unsheltered',
      valueEs: 'Sin refugio',
    });
  } else if (flags.inShelter) {
    items.push({
      icon: '🏠',
      label: 'Situation',
      labelEs: 'Situación',
      value: 'In shelter',
      valueEs: 'En refugio',
    });
  }
  if (flags.chronicallyHomeless) {
    items.push({
      icon: '📅',
      label: 'Duration',
      labelEs: 'Duración',
      value: 'Over 1 year',
      valueEs: 'Más de 1 año',
    });
  }
  if (flags.veteran) {
    items.push({
      icon: '🎖️',
      label: 'Veteran',
      labelEs: 'Veterano',
      value: 'Yes',
      valueEs: 'Sí',
    });
  }
  if (flags.hasChildrenInHousehold) {
    items.push({
      icon: '👨‍👩‍👧',
      label: 'Children',
      labelEs: 'Niños',
      value: 'With you',
      valueEs: 'Contigo',
    });
  }
  if (flags.hasPets) {
    items.push({
      icon: '🐾',
      label: 'Pets',
      labelEs: 'Mascotas',
      value: 'Yes',
      valueEs: 'Sí',
    });
  }
  if (flags.hasVoucher) {
    items.push({
      icon: '🎫',
      label: 'Voucher',
      labelEs: 'Vale',
      value: 'Has one',
      valueEs: 'Tiene',
    });
  }
  if (flags.recentlyEvicted) {
    items.push({
      icon: '⚠️',
      label: 'Eviction',
      labelEs: 'Desalojo',
      value: 'Recent',
      valueEs: 'Reciente',
    });
  }
  if (flags.needsADAHousing) {
    items.push({
      icon: '♿',
      label: 'ADA needs',
      labelEs: 'ADA',
      value: 'Yes',
      valueEs: 'Sí',
    });
  }
  if (flags.noIncome) {
    items.push({
      icon: '💵',
      label: 'Income',
      labelEs: 'Ingresos',
      value: 'None',
      valueEs: 'Ninguno',
    });
  }
  return items;
};

export const getEmploymentSummary = (
  profile: UserProfile | null,
): IntakeSummaryItem[] => {
  const flags = getProfileFlags(profile);
  const items: IntakeSummaryItem[] = [];
  if (flags.unemployed) {
    items.push({
      icon: '💼',
      label: 'Status',
      labelEs: 'Estado',
      value: 'Unemployed',
      valueEs: 'Desempleado',
    });
  }
  if (flags.hasNoID) {
    items.push({
      icon: '🪪',
      label: 'ID',
      labelEs: 'ID',
      value: 'No valid ID',
      valueEs: 'Sin ID válida',
    });
  }
  if (flags.noReliableTransportation) {
    items.push({
      icon: '🚌',
      label: 'Transport',
      labelEs: 'Transporte',
      value: 'Limited',
      valueEs: 'Limitado',
    });
  }
  if (flags.hasBackgroundIssue) {
    items.push({
      icon: '📄',
      label: 'Background',
      labelEs: 'Antecedentes',
      value: 'Has record',
      valueEs: 'Tiene',
    });
  }
  if (flags.hasWorkAuthIssue) {
    items.push({
      icon: '⚖️',
      label: 'Work auth',
      labelEs: 'Autorización',
      value: 'Needs help',
      valueEs: 'Necesita ayuda',
    });
  }
  if (flags.needsResumeHelp) {
    items.push({
      icon: '📝',
      label: 'Resume',
      labelEs: 'Currículum',
      value: 'Needs help',
      valueEs: 'Necesita ayuda',
    });
  }
  if (flags.needsJobTraining) {
    items.push({
      icon: '🎓',
      label: 'Training',
      labelEs: 'Capacitación',
      value: 'Wants training',
      valueEs: 'Quiere',
    });
  }
  if (flags.needsEnglishClasses) {
    items.push({
      icon: '🗣️',
      label: 'English',
      labelEs: 'Inglés',
      value: 'Needs classes',
      valueEs: 'Necesita clases',
    });
  }
  if (flags.bilingual) {
    items.push({
      icon: '🌐',
      label: 'Language',
      labelEs: 'Idioma',
      value: 'Bilingual',
      valueEs: 'Bilingüe',
    });
  }
  return items;
};

// ============================================
// PERSONALIZED RECOMMENDATIONS (per category)
// ============================================

const EMPLOY_5_JOB_TYPES: Record<
  string,
  { en: string; es: string; icon: string; description: string; descriptionEs: string }
> = {
  food: {
    icon: '🍽️',
    en: 'Food service & restaurant jobs',
    es: 'Trabajos de servicio de alimentos',
    description:
      'Restaurants and cafeterias hire entry-level with quick turnaround.',
    descriptionEs:
      'Restaurantes y cafeterías contratan nivel de entrada rápidamente.',
  },
  retail: {
    icon: '🛒',
    en: 'Retail & customer service',
    es: 'Ventas y servicio al cliente',
    description:
      'Retail stores hire year-round with flexible schedules.',
    descriptionEs:
      'Tiendas minoristas contratan todo el año con horarios flexibles.',
  },
  warehouse: {
    icon: '📦',
    en: 'Warehouse & manual labor',
    es: 'Almacén y trabajo manual',
    description:
      'Warehouses often pay $18-22/hr and hire with no experience.',
    descriptionEs:
      'Los almacenes pagan $18-22/hora y contratan sin experiencia.',
  },
  construction: {
    icon: '🔨',
    en: 'Construction & skilled trades',
    es: 'Construcción y oficios',
    description:
      'Day-labor centers and union halls connect workers to construction jobs.',
    descriptionEs:
      'Centros de trabajo diario y uniones conectan a trabajos de construcción.',
  },
  healthcare: {
    icon: '🏥',
    en: 'Healthcare entry-level jobs',
    es: 'Trabajos de salud (nivel de entrada)',
    description:
      'CNA, home health aide, and medical assistant roles — training programs often free.',
    descriptionEs:
      'CNA, asistente de salud en casa, asistente médico — capacitación a menudo gratis.',
  },
  office: {
    icon: '💼',
    en: 'Office & administrative',
    es: 'Oficina y administrativo',
    description:
      'Admin and data-entry roles are a good fit for entry-level office work.',
    descriptionEs:
      'Roles administrativos y entrada de datos son buenos para empezar.',
  },
  tech: {
    icon: '💻',
    en: 'Technology jobs',
    es: 'Trabajos de tecnología',
    description:
      'Free coding bootcamps and IT training programs can lead to entry-level tech work.',
    descriptionEs:
      'Bootcamps de programación gratis y capacitación en TI pueden llevar a trabajos tech.',
  },
};

export const getEmploymentRecommendations = (
  profile: UserProfile | null,
): PersonalizedRecommendation[] => {
  if (!profile) return [];
  const flags = getProfileFlags(profile);
  const answers = profile.answers || [];
  const recs: PersonalizedRecommendation[] = [];

  // Recommend specific job types based on what the user said they want
  const jobTypes = findAnswer(answers, 'employ_5');
  if (Array.isArray(jobTypes)) {
    jobTypes.forEach((type) => {
      const info = EMPLOY_5_JOB_TYPES[type];
      if (!info) return;
      recs.push({
        id: `jobs-type-${type}`,
        icon: info.icon,
        title: info.en,
        titleEs: info.es,
        description: info.description,
        descriptionEs: info.descriptionEs,
        reason: 'You said this is the type of work you want',
        reasonEs: 'Dijiste que este es el tipo de trabajo que quieres',
        actionLabel: 'Search these jobs',
        actionLabelEs: 'Buscar estos trabajos',
        actionType: 'navigate',
        actionPayload: 'Jobs:search',
      });
    });
  }

  if (flags.hasNoID) {
    recs.push({
      id: 'jobs-get-id',
      icon: '🪪',
      title: 'Get a valid ID first',
      titleEs: 'Primero obtén una identificación',
      description:
        'Almost every job requires a valid government-issued ID. Free ID help is available through 211 and local nonprofits.',
      descriptionEs:
        'Casi todos los trabajos requieren identificación válida. Ayuda gratis al 211 y organizaciones locales.',
      reason: 'You said you don’t have a valid ID',
      reasonEs: 'Dijiste que no tienes ID válida',
      actionLabel: 'Call 211 for ID help',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  if (flags.hasBackgroundIssue) {
    recs.push({
      id: 'jobs-second-chance',
      icon: '🤝',
      title: 'Second-chance employers',
      titleEs: 'Empleadores de segunda oportunidad',
      description:
        'Goodwill, Homeboy Industries, and fair-chance employers actively hire people with records. Many states also have "ban the box" laws.',
      descriptionEs:
        'Goodwill, Homeboy Industries y empleadores "fair-chance" contratan activamente personas con antecedentes.',
      reason: 'You said you have a record',
      reasonEs: 'Dijiste que tienes antecedentes',
      actionLabel: 'Call Goodwill — 1-800-664-6577',
      actionLabelEs: 'Llama a Goodwill',
      actionType: 'call',
      actionPayload: '1-800-664-6577',
    });
  }

  if (flags.needsResumeHelp) {
    recs.push({
      id: 'jobs-resume-help',
      icon: '📝',
      title: 'Free resume writing help',
      titleEs: 'Ayuda gratis con el currículum',
      description:
        'CareerOneStop has a free resume builder. Public libraries offer free printing and resume help.',
      descriptionEs:
        'CareerOneStop tiene un constructor de CV gratis. Las bibliotecas ofrecen ayuda e impresión gratis.',
      reason: 'You said you need resume help',
      reasonEs: 'Dijiste que necesitas ayuda con el CV',
      actionLabel: 'Call CareerOneStop — 1-877-872-5627',
      actionLabelEs: 'Llama a CareerOneStop',
      actionType: 'call',
      actionPayload: '1-877-872-5627',
    });
  }

  if (flags.needsGED) {
    recs.push({
      id: 'jobs-ged',
      icon: '🎓',
      title: 'Free GED / high school programs',
      titleEs: 'Programas gratis de GED / preparatoria',
      description:
        'A GED opens access to most jobs and training programs. Public libraries, community colleges, and Job Corps all offer free GED prep.',
      descriptionEs:
        'Un GED abre acceso a la mayoría de trabajos y programas. Las bibliotecas, colegios comunitarios y Job Corps ofrecen preparación gratis.',
      reason: 'You said you haven’t finished high school',
      reasonEs: 'Dijiste que no has terminado la preparatoria',
      actionLabel: 'Call Job Corps — 1-800-733-5627',
      actionLabelEs: 'Llama a Job Corps',
      actionType: 'call',
      actionPayload: '1-800-733-5627',
    });
  }

  if (flags.needsJobTraining) {
    recs.push({
      id: 'jobs-training',
      icon: '🎓',
      title: 'Free job training: Job Corps',
      titleEs: 'Capacitación laboral gratis: Job Corps',
      description:
        'Ages 16-24: free education and career training, plus housing and meals included.',
      descriptionEs:
        'Edades 16-24: educación y capacitación gratis, más vivienda y comida incluidas.',
      reason: 'You said you want job training',
      reasonEs: 'Dijiste que quieres capacitación',
      actionLabel: 'Call Job Corps — 1-800-733-5627',
      actionLabelEs: 'Llama a Job Corps',
      actionType: 'call',
      actionPayload: '1-800-733-5627',
    });
  }

  if (flags.needsEnglishClasses) {
    recs.push({
      id: 'jobs-english-classes',
      icon: '🗣️',
      title: 'Free English (ESL) classes',
      titleEs: 'Clases de inglés gratis (ESL)',
      description:
        'Public libraries, community colleges, and nonprofits offer free ESL classes. Call 211 for local options.',
      descriptionEs:
        'Bibliotecas, colegios comunitarios y organizaciones ofrecen ESL gratis. Llama al 211.',
      reason: 'You said you want English classes',
      reasonEs: 'Dijiste que quieres clases de inglés',
      actionLabel: 'Call 211 for ESL classes',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  if (flags.bilingual) {
    recs.push({
      id: 'jobs-bilingual',
      icon: '🌐',
      title: 'Bilingual job opportunities',
      titleEs: 'Trabajos bilingües',
      description:
        'Healthcare, customer service, and translation jobs often pay a premium for bilingual workers.',
      descriptionEs:
        'Salud, servicio al cliente y traducción a menudo pagan extra por trabajadores bilingües.',
      reason: 'You said you’re bilingual',
      reasonEs: 'Dijiste que eres bilingüe',
      actionLabel: 'Browse bilingual jobs',
      actionLabelEs: 'Ver trabajos bilingües',
      actionType: 'navigate',
      actionPayload: 'Jobs:search',
    });
  }

  if (flags.noReliableTransportation) {
    recs.push({
      id: 'jobs-remote-close',
      icon: '🚌',
      title: 'Work close to home',
      titleEs: 'Trabajo cerca de casa',
      description:
        'Look for jobs within walking distance or on public transit lines. Remote and work-from-home roles are also worth searching.',
      descriptionEs:
        'Busca trabajos a distancia caminable o en líneas de transporte público. Trabajos remotos también.',
      reason: 'You said transportation is limited',
      reasonEs: 'Dijiste que el transporte es limitado',
      actionLabel: 'Search local jobs',
      actionLabelEs: 'Buscar trabajos locales',
      actionType: 'navigate',
      actionPayload: 'Jobs:search',
    });
  }

  return recs;
};

export const getHealthcareRecommendations = (
  profile: UserProfile | null,
): PersonalizedRecommendation[] => {
  if (!profile) return [];
  const flags = getProfileFlags(profile);
  const recs: PersonalizedRecommendation[] = [];

  if (flags.uninsured) {
    recs.push({
      id: 'health-medicaid',
      icon: '🪪',
      title: 'Apply for Medicaid',
      titleEs: 'Aplica para Medicaid',
      description:
        'Medicaid covers doctor visits, hospital care, prescriptions, and more. Eligibility is based on income.',
      descriptionEs:
        'Medicaid cubre visitas al médico, hospital, recetas y más. Elegibilidad basada en ingresos.',
      reason: 'You said you don’t have insurance',
      reasonEs: 'Dijiste que no tienes seguro',
      actionLabel: 'Visit healthcare.gov',
      actionLabelEs: 'Visita healthcare.gov',
      actionType: 'url',
      actionPayload: 'https://www.healthcare.gov/medicaid-chip/',
    });

    recs.push({
      id: 'health-fqhc',
      icon: '🏥',
      title: 'Free community health centers (FQHCs)',
      titleEs: 'Centros de salud comunitarios gratis (FQHCs)',
      description:
        'FQHCs serve everyone regardless of ability to pay. Primary care, dental, mental health, and pharmacy on sliding scale.',
      descriptionEs:
        'Los FQHCs atienden a todos sin importar ingresos. Atención primaria, dental, mental y farmacia.',
      reason: 'You said you don’t have insurance',
      reasonEs: 'Dijiste que no tienes seguro',
      actionLabel: 'Find FQHCs near you',
      actionLabelEs: 'Buscar FQHCs cerca',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
    });
  }

  if (flags.urgentMentalHealth) {
    recs.push({
      id: 'health-988',
      icon: '💚',
      title: '988 Suicide & Crisis Lifeline',
      titleEs: '988 Línea de Crisis',
      description:
        '24/7 free and confidential support. Call or text 988 — trained counselors in English and Spanish.',
      descriptionEs:
        'Apoyo gratuito y confidencial 24/7. Llama o envía texto a 988.',
      reason: 'You said you need urgent mental health support',
      reasonEs: 'Dijiste que necesitas apoyo urgente de salud mental',
      actionLabel: 'Call 988',
      actionLabelEs: 'Llama al 988',
      actionType: 'call',
      actionPayload: '988',
    });
  } else if (flags.needsMentalHealth || flags.hasMentalHealthCondition) {
    recs.push({
      id: 'health-community-mh',
      icon: '💚',
      title: 'Community mental health centers',
      titleEs: 'Centros de salud mental comunitarios',
      description:
        'Community mental health centers offer therapy, psychiatry, and group support on a sliding scale.',
      descriptionEs:
        'Centros comunitarios ofrecen terapia, psiquiatría y apoyo grupal con tarifa ajustada.',
      reason: 'You said you want mental health support',
      reasonEs: 'Dijiste que quieres apoyo de salud mental',
      actionLabel: 'Call SAMHSA — 1-800-662-4357',
      actionLabelEs: 'Llama a SAMHSA',
      actionType: 'call',
      actionPayload: '1-800-662-4357',
    });
  }

  if (flags.urgentDental) {
    recs.push({
      id: 'health-dental-urgent',
      icon: '🦷',
      title: 'Free emergency dental clinics',
      titleEs: 'Clínicas dentales de emergencia gratis',
      description:
        'Dental schools offer free/low-cost emergency care. Some FQHCs have walk-in dental clinics for pain.',
      descriptionEs:
        'Las escuelas dentales ofrecen atención de emergencia. Algunos FQHCs tienen clínicas dentales para dolor.',
      reason: 'You said you have urgent dental pain',
      reasonEs: 'Dijiste que tienes dolor dental urgente',
      actionLabel: 'Call 211 for dental clinics',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  } else if (findAnswer(profile.answers, 'health_6') === 'yes') {
    recs.push({
      id: 'health-dental-checkup',
      icon: '🦷',
      title: 'Free dental checkup',
      titleEs: 'Chequeo dental gratis',
      description:
        'FQHCs and dental schools offer free or low-cost cleanings, x-rays, and checkups.',
      descriptionEs:
        'Los FQHCs y escuelas dentales ofrecen limpieza, rayos X y chequeos gratis o baratos.',
      reason: 'You said you need a dental checkup',
      reasonEs: 'Dijiste que necesitas un chequeo dental',
      actionLabel: 'Find dental clinics',
      actionLabelEs: 'Buscar clínicas dentales',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
    });
  }

  if (flags.needsVision) {
    const visionAnswer = findAnswer(profile.answers, 'health_7');
    recs.push({
      id: 'health-vision',
      icon: '👓',
      title:
        visionAnswer === 'yes_glasses'
          ? 'Free glasses programs'
          : 'Free eye exams',
      titleEs:
        visionAnswer === 'yes_glasses'
          ? 'Programas de lentes gratis'
          : 'Exámenes de la vista gratis',
      description:
        'Lions Club Sight First, VSP Eyes of Hope, OneSight, and New Eyes provide free eye exams and glasses nationally.',
      descriptionEs:
        'Lions Club, VSP Eyes of Hope, OneSight y New Eyes ofrecen exámenes y lentes gratis en todo el país.',
      reason: 'You said you need vision care',
      reasonEs: 'Dijiste que necesitas atención visual',
      actionLabel: 'Call 211 for vision programs',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  if (flags.pregnant) {
    recs.push({
      id: 'health-prenatal',
      icon: '🤰',
      title: 'Free prenatal care (Medicaid)',
      titleEs: 'Atención prenatal gratis (Medicaid)',
      description:
        'Medicaid covers prenatal care in every state. Most states also cover 60 days postpartum.',
      descriptionEs:
        'Medicaid cubre atención prenatal en todos los estados. Muchos estados cubren 60 días después del parto.',
      reason: 'You said you’re pregnant',
      reasonEs: 'Dijiste que estás embarazada',
      actionLabel: 'Apply at healthcare.gov',
      actionLabelEs: 'Aplica en healthcare.gov',
      actionType: 'url',
      actionPayload: 'https://www.healthcare.gov/medicaid-chip/',
    });
  }

  if (flags.hasChildrenNeedingCare) {
    recs.push({
      id: 'health-chip',
      icon: '👶',
      title: 'Children’s healthcare (CHIP)',
      titleEs: 'Salud infantil (CHIP)',
      description:
        'CHIP covers kids in families who earn too much for Medicaid but can’t afford private insurance.',
      descriptionEs:
        'CHIP cubre a niños de familias que ganan demasiado para Medicaid pero no pueden pagar seguro privado.',
      reason: 'You said your children need care',
      reasonEs: 'Dijiste que tus hijos necesitan atención',
      actionLabel: 'Call CHIP — 1-877-543-7669',
      actionLabelEs: 'Llama a CHIP',
      actionType: 'call',
      actionPayload: '1-877-543-7669',
    });
  }

  if (flags.hasChronicCondition) {
    recs.push({
      id: 'health-chronic-care',
      icon: '🫀',
      title: 'Chronic disease management',
      titleEs: 'Manejo de enfermedades crónicas',
      description:
        'FQHCs have chronic care programs for diabetes, heart disease, asthma, and high blood pressure.',
      descriptionEs:
        'Los FQHCs tienen programas para diabetes, enfermedad cardíaca, asma e hipertensión.',
      reason: 'You said you have a chronic condition',
      reasonEs: 'Dijiste que tienes una condición crónica',
      actionLabel: 'Find an FQHC',
      actionLabelEs: 'Buscar FQHC',
      actionType: 'navigate',
      actionPayload: 'Health:clinics',
    });
  }

  if (flags.onMedications) {
    recs.push({
      id: 'health-rx-help',
      icon: '💊',
      title: 'Prescription savings',
      titleEs: 'Ahorros en recetas',
      description:
        'GoodRx and NeedyMeds offer free coupons. Walmart has a $4 generics program. Manufacturers offer free meds through patient assistance.',
      descriptionEs:
        'GoodRx y NeedyMeds ofrecen cupones gratis. Walmart tiene un programa de $4 para genéricos.',
      reason: 'You said you take medications',
      reasonEs: 'Dijiste que tomas medicamentos',
      actionLabel: 'Visit GoodRx.com',
      actionLabelEs: 'Visita GoodRx.com',
      actionType: 'url',
      actionPayload: 'https://www.goodrx.com/',
    });
  }

  if (flags.substanceUseHelpWanted) {
    recs.push({
      id: 'health-samhsa',
      icon: '🤝',
      title: 'SAMHSA 24/7 helpline',
      titleEs: 'Línea SAMHSA 24/7',
      description:
        'Free, confidential 24/7 helpline in English and Spanish for substance use treatment referrals. They connect you to local treatment, housing, and support.',
      descriptionEs:
        'Línea gratuita y confidencial 24/7 en inglés y español. Conectan con tratamiento local, vivienda y apoyo.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Call 1-800-662-4357',
      actionLabelEs: 'Llama al 1-800-662-4357',
      actionType: 'call',
      actionPayload: '1-800-662-4357',
    });

    recs.push({
      id: 'health-findtreatment',
      icon: '🏥',
      title: 'FindTreatment.gov locator',
      titleEs: 'Localizador FindTreatment.gov',
      description:
        'Search SAMHSA\'s official directory of 14,000+ state-licensed treatment facilities. Filter by detox, inpatient, outpatient, and what they charge.',
      descriptionEs:
        'Busca el directorio oficial SAMHSA de más de 14,000 centros de tratamiento. Filtra por detox, interno, externo y costo.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Visit FindTreatment.gov',
      actionLabelEs: 'Visita FindTreatment.gov',
      actionType: 'url',
      actionPayload: 'https://findtreatment.gov/',
    });

    recs.push({
      id: 'health-mat',
      icon: '💊',
      title: 'Medication-Assisted Treatment (MAT)',
      titleEs: 'Tratamiento asistido por medicamentos (MAT)',
      description:
        'MAT uses medications like buprenorphine, methadone, or naltrexone combined with counseling. Highly effective for opioid and alcohol use disorders.',
      descriptionEs:
        'MAT usa medicamentos como buprenorfina, metadona o naltrexona combinados con consejería. Muy efectivo para opioides y alcohol.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Call SAMHSA for MAT referrals',
      actionLabelEs: 'Llama a SAMHSA',
      actionType: 'call',
      actionPayload: '1-800-662-4357',
    });

    recs.push({
      id: 'health-aa-na',
      icon: '🤝',
      title: 'Free AA / NA meetings',
      titleEs: 'Reuniones gratuitas AA / NA',
      description:
        'Alcoholics Anonymous (AA) and Narcotics Anonymous (NA) hold free, anonymous peer-support meetings daily in most cities and online.',
      descriptionEs:
        'AA y NA tienen reuniones gratuitas y anónimas de apoyo entre pares todos los días en la mayoría de las ciudades y en línea.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Find meetings at aa.org',
      actionLabelEs: 'Buscar reuniones en aa.org',
      actionType: 'url',
      actionPayload: 'https://www.aa.org/find-aa',
    });

    recs.push({
      id: 'health-harm-reduction',
      icon: '🛡️',
      title: 'Harm reduction services',
      titleEs: 'Servicios de reducción de daños',
      description:
        'Free naloxone (Narcan) to reverse opioid overdoses, clean supplies, and drug-checking are available through harm reduction programs in most states.',
      descriptionEs:
        'Naloxona (Narcan) gratis para revertir sobredosis de opioides, suministros limpios y pruebas de drogas en programas de reducción de daños.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Call 211 for local harm reduction',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  return recs;
};

export const getHousingRecommendations = (
  profile: UserProfile | null,
): PersonalizedRecommendation[] => {
  if (!profile) return [];
  const flags = getProfileFlags(profile);
  const isMinor = profile.ageGroup === 'under18';
  const recs: PersonalizedRecommendation[] = [];

  if (flags.unsheltered || flags.inShelter) {
    if (isMinor) {
      recs.push({
        id: 'housing-covenant-house',
        icon: '🛏️',
        title: 'Covenant House Nineline (youth 16-24)',
        titleEs: 'Covenant House Nineline (jóvenes 16-24)',
        description:
          '24/7 placement line for homeless youth. Knows how to place minors safely and connects to local shelters.',
        descriptionEs:
          'Línea 24/7 para jóvenes sin hogar. Conoce cómo ubicar menores con seguridad.',
        reason: 'You’re under 18 and need shelter',
        reasonEs: 'Eres menor de 18 y necesitas refugio',
        actionLabel: 'Call Nineline — 1-800-999-9999',
        actionLabelEs: 'Llama Nineline',
        actionType: 'call',
        actionPayload: '1-800-999-9999',
      });
    } else {
      recs.push({
        id: 'housing-211-shelter',
        icon: '🛏️',
        title: 'Emergency shelter tonight',
        titleEs: 'Refugio de emergencia esta noche',
        description:
          'Dial 211 and press 6 for homeless services. They have real-time shelter bed availability and can place you tonight.',
        descriptionEs:
          'Marca 211 y presiona 6. Tienen disponibilidad de camas en tiempo real.',
        reason: 'You said you’re without stable shelter',
        reasonEs: 'Dijiste que no tienes refugio estable',
        actionLabel: 'Call 211',
        actionLabelEs: 'Llama al 211',
        actionType: 'call',
        actionPayload: '211',
      });
    }
  }

  if (flags.hasChildrenInHousehold && (flags.unsheltered || flags.inShelter)) {
    recs.push({
      id: 'housing-family-promise',
      icon: '👨‍👩‍👧',
      title: 'Family Promise (family shelter)',
      titleEs: 'Family Promise (refugio familiar)',
      description:
        'Family Promise keeps families together in shelter and has 200+ affiliates nationwide.',
      descriptionEs:
        'Family Promise mantiene familias juntas con 200+ afiliados en todo el país.',
      reason: 'You said you have children with you',
      reasonEs: 'Dijiste que tienes hijos contigo',
      actionLabel: 'Call Family Promise',
      actionLabelEs: 'Llama a Family Promise',
      actionType: 'call',
      actionPayload: '908-273-1100',
    });
  }

  if (flags.veteran) {
    recs.push({
      id: 'housing-hud-vash',
      icon: '🎖️',
      title: 'HUD-VASH housing voucher',
      titleEs: 'Vale de vivienda HUD-VASH',
      description:
        'HUD-VASH combines rental assistance with VA case management. Available to any homeless veteran.',
      descriptionEs:
        'HUD-VASH combina asistencia de alquiler con gestión de casos del VA para veteranos sin hogar.',
      reason: 'You said you’re a veteran',
      reasonEs: 'Dijiste que eres veterano',
      actionLabel: 'Call VA — 1-877-424-3838',
      actionLabelEs: 'Llama a VA',
      actionType: 'call',
      actionPayload: '1-877-424-3838',
    });
  }

  if (flags.hasPets) {
    recs.push({
      id: 'housing-pet-friendly',
      icon: '🐾',
      title: 'Pet-friendly shelter options',
      titleEs: 'Refugios que aceptan mascotas',
      description:
        'RedRover Relief and local humane societies can help keep you and your pet together. Some shelters now accept pets.',
      descriptionEs:
        'RedRover Relief y sociedades humanitarias locales ayudan a mantenerte con tu mascota.',
      reason: 'You said you have pets',
      reasonEs: 'Dijiste que tienes mascotas',
      actionLabel: 'Call 211 for pet-friendly shelters',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  if (flags.recentlyEvicted) {
    recs.push({
      id: 'housing-second-chance',
      icon: '⚠️',
      title: 'Second-chance housing programs',
      titleEs: 'Vivienda de segunda oportunidad',
      description:
        'HUD housing counselors help with eviction recovery and second-chance landlords who rent to those with eviction records.',
      descriptionEs:
        'Consejeros HUD ayudan con recuperación de desalojo y propietarios que alquilan con antecedentes.',
      reason: 'You said you had a recent eviction',
      reasonEs: 'Dijiste que tuviste un desalojo reciente',
      actionLabel: 'Call HUD — 1-800-569-4287',
      actionLabelEs: 'Llama a HUD',
      actionType: 'call',
      actionPayload: '1-800-569-4287',
    });
  }

  if (flags.noIncome) {
    recs.push({
      id: 'housing-emergency-rental',
      icon: '💵',
      title: 'Emergency rental assistance',
      titleEs: 'Asistencia de emergencia de alquiler',
      description:
        'Catholic Charities, Salvation Army, and St. Vincent de Paul offer one-time rental assistance to prevent eviction.',
      descriptionEs:
        'Catholic Charities, Salvation Army y St. Vincent de Paul ofrecen asistencia de alquiler una vez.',
      reason: 'You said you have no income',
      reasonEs: 'Dijiste que no tienes ingresos',
      actionLabel: 'Call Catholic Charities',
      actionLabelEs: 'Llama a Catholic Charities',
      actionType: 'call',
      actionPayload: '1-800-919-9338',
    });
  }

  if (flags.hasVoucher) {
    recs.push({
      id: 'housing-use-voucher',
      icon: '🎫',
      title: 'Use your housing voucher',
      titleEs: 'Usa tu vale de vivienda',
      description:
        'GoSection8.com and AffordableHousing.com list landlords who accept Section 8 vouchers.',
      descriptionEs:
        'GoSection8.com y AffordableHousing.com listan propietarios que aceptan Sección 8.',
      reason: 'You said you have a housing voucher',
      reasonEs: 'Dijiste que tienes un vale de vivienda',
      actionLabel: 'Visit GoSection8.com',
      actionLabelEs: 'Visita GoSection8.com',
      actionType: 'url',
      actionPayload: 'https://www.gosection8.com/',
    });
  }

  if (flags.substanceUseHelpWanted) {
    recs.push({
      id: 'housing-oxford',
      icon: '🏡',
      title: 'Oxford House (recovery housing)',
      titleEs: 'Oxford House (vivienda de recuperación)',
      description:
        'Oxford House runs 3,000+ self-supporting sober homes in 44 states. No time limits, affordable weekly rent, democratically run by residents.',
      descriptionEs:
        'Oxford House tiene más de 3,000 casas sobrias auto-sostenidas en 44 estados. Sin límite de tiempo, alquiler semanal asequible.',
      reason: 'You said you want help with substance use',
      reasonEs: 'Dijiste que quieres ayuda con sustancias',
      actionLabel: 'Call Oxford House — 1-800-689-6411',
      actionLabelEs: 'Llama a Oxford House',
      actionType: 'call',
      actionPayload: '1-800-689-6411',
    });
  }

  if (flags.chronicallyHomeless) {
    recs.push({
      id: 'housing-psh',
      icon: '🏢',
      title: 'Permanent supportive housing',
      titleEs: 'Vivienda permanente con apoyo',
      description:
        'Permanent Supportive Housing (PSH) combines affordable housing with case management for those chronically homeless.',
      descriptionEs:
        'PSH combina vivienda asequible con gestión de casos para quienes llevan mucho tiempo sin hogar.',
      reason: 'You said you’ve been without housing over 1 year',
      reasonEs: 'Dijiste que llevas más de 1 año sin vivienda',
      actionLabel: 'Call 211 to ask about PSH',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
    });
  }

  return recs;
};

// ============================================
// NATURAL-LANGUAGE SITUATION SUMMARY (for AI context)
// ============================================

/**
 * Builds a short plain-text summary of the user's situation from their
 * intake flags, for injection into the Groq AI system prompt. This lets
 * the AI give context-aware responses that reinforce (rather than
 * contradict) the recommendations we've already surfaced in the app.
 *
 * Example output:
 *   "uninsured; currently unsheltered; a veteran; needs urgent mental
 *    health support; wants substance use help; has a pet; looking for
 *    warehouse or food service work; needs help getting a valid ID;
 *    bilingual"
 */
export const getSituationSummary = (
  profile: UserProfile | null,
): string => {
  if (!profile) return '';
  const flags = getProfileFlags(profile);
  const parts: string[] = [];

  // Healthcare
  if (flags.urgentMentalHealth) parts.push('needs URGENT mental health support');
  else if (flags.needsMentalHealth) parts.push('wants mental health support');
  if (flags.hasMentalHealthCondition) parts.push('has a mental health condition');
  if (flags.uninsured) parts.push('uninsured');
  if (flags.pregnant) parts.push('currently pregnant');
  if (flags.hasChildrenNeedingCare) parts.push('has children needing healthcare');
  if (flags.hasDisability) parts.push('has a disability');
  if (flags.substanceUseHelpWanted) parts.push('wants substance use support');
  if (flags.hasChronicCondition) parts.push('has a chronic health condition');
  if (flags.urgentDental) parts.push('has URGENT dental pain');
  if (flags.needsVision) parts.push('needs vision care');
  if (flags.onMedications) parts.push('currently takes medications');

  // Housing
  if (flags.livingInVehicle) parts.push('currently living in a vehicle');
  else if (flags.unsheltered) parts.push('currently unsheltered');
  else if (flags.inShelter) parts.push('currently staying in a shelter');
  if (flags.chronicallyHomeless) parts.push('without stable housing for over a year');
  if (flags.veteran) parts.push('a veteran');
  if (flags.hasChildrenInHousehold) parts.push('has children with them');
  if (flags.hasPets) parts.push('has pets');
  if (flags.hasVoucher) parts.push('has a housing voucher');
  if (flags.recentlyEvicted) parts.push('recent eviction on record');
  if (flags.needsADAHousing) parts.push('needs ADA-accessible housing');
  if (flags.noIncome) parts.push('no income');

  // Employment
  if (flags.unemployed) parts.push('unemployed');
  const jobTypes = findAnswer(profile.answers, 'employ_5');
  if (Array.isArray(jobTypes) && jobTypes.length > 0) {
    const jobLabels: Record<string, string> = {
      food: 'food service',
      retail: 'retail',
      warehouse: 'warehouse',
      construction: 'construction',
      healthcare: 'healthcare',
      office: 'office',
      tech: 'tech',
      any: 'anything',
    };
    const wanted = jobTypes
      .map((t) => jobLabels[t])
      .filter(Boolean)
      .join('/');
    if (wanted) parts.push(`looking for ${wanted} work`);
  }
  if (flags.hasNoID) parts.push('needs a valid ID');
  if (flags.noReliableTransportation) parts.push('limited transportation');
  if (flags.hasWorkAuthIssue) parts.push('work authorization issues');
  if (flags.hasBackgroundIssue) parts.push('has a criminal record');
  if (flags.needsResumeHelp) parts.push('needs resume help');
  if (flags.needsJobTraining) parts.push('wants job training');
  if (flags.needsEnglishClasses) parts.push('wants English classes');
  if (flags.bilingual) parts.push('bilingual');

  // Demographic
  if (profile.ageGroup === 'under18') parts.push('under 18 years old');

  return parts.join('; ');
};

/**
 * Returns up to 5 top-priority urgent-action titles the app has already
 * surfaced for this user. Used in the AI system prompt so the assistant
 * can reference them by name instead of guessing at alternatives.
 */
export const getTopUrgentActions = (
  profile: UserProfile | null,
  limit: number = 5,
): string[] => {
  const needs = getUrgentNeeds(profile).slice(0, limit);
  return needs.map((n) => `${n.title} — ${n.actionLabel}`);
};

/**
 * Returns the titles of the top personalized recommendations across all
 * categories, so the AI knows what concrete next steps we're suggesting.
 */
export const getTopRecommendations = (
  profile: UserProfile | null,
  limit: number = 8,
): string[] => {
  if (!profile) return [];
  const all: PersonalizedRecommendation[] = [
    ...getHealthcareRecommendations(profile),
    ...getHousingRecommendations(profile),
    ...getEmploymentRecommendations(profile),
  ];
  return all.slice(0, limit).map((r) => `${r.title} — ${r.actionLabel}`);
};
