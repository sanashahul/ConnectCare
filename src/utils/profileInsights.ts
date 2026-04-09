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
  actionLabel: string;
  actionLabelEs: string;
  actionType: ActionType;
  actionPayload: string; // phone number, screen name, or URL
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
  };
};

// ============================================
// URGENT NEEDS
// ============================================

/**
 * Returns a priority-sorted list of urgent actions the user should take,
 * based on their intake answers. Drives the Dashboard "Urgent Needs" banner.
 */
export const getUrgentNeeds = (profile: UserProfile | null): UrgentNeed[] => {
  if (!profile) return [];
  const flags = getProfileFlags(profile);
  const needs: UrgentNeed[] = [];

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
      actionLabel: 'Call 211 for shelter',
      actionLabelEs: 'Llama al 211',
      actionType: 'call',
      actionPayload: '211',
      priority: 95,
      sourceQuestionId: 'housing_1',
    });
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
      actionPayload: 'Health',
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
      priority: 70,
      sourceQuestionId: 'health_6',
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
      actionLabel: 'Call HUD — 1-800-877-0246',
      actionLabelEs: 'Llama a HUD',
      actionType: 'call',
      actionPayload: '1-800-877-0246',
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
      actionPayload: 'Health',
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
      priority: 45,
      sourceQuestionId: 'housing_7',
    });
  }

  return needs.sort((a, b) => b.priority - a.priority);
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
