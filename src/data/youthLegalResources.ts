/**
 * State-specific runaway laws and abuse reporting resources for minors
 * Information helps youth understand their legal situation and how to report abuse
 */

export interface StateYouthLaws {
  state: string;
  stateCode: string;
  runawayLaws: {
    isStatusOffense: boolean; // Is running away a "status offense" (only illegal for minors)?
    canBeDetained: boolean; // Can police detain a runaway?
    harboringLaw: boolean; // Is it illegal for adults to harbor runaways?
    ageOfMajority: number; // When you're legally an adult
    emancipationAge?: number; // Age you can petition for emancipation
    summary: string;
    summaryEs: string;
    keyPoints: string[];
    keyPointsEs: string[];
  };
  abuseReporting: {
    hotline: string;
    website: string;
    agency: string;
    agencyEs: string;
    canReportAnonymously: boolean;
    onlineReporting: boolean;
    textOption?: string;
  };
}

// State-specific youth legal resources
export const STATE_YOUTH_LAWS: Record<string, StateYouthLaws> = {
  AL: {
    state: 'Alabama',
    stateCode: 'AL',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 19,
      emancipationAge: 18,
      summary: 'In Alabama, running away is a status offense. Police can return you home or to a shelter. Adults who help you hide could face charges.',
      summaryEs: 'En Alabama, huir es una ofensa de estatus. La policía puede regresarte a casa o a un refugio. Los adultos que te ayuden a esconderte podrían enfrentar cargos.',
      keyPoints: [
        'Age of majority is 19 (one of the highest in the US)',
        'Police can detain runaways and return them home',
        'Harboring a runaway is illegal',
        'Youth shelters can provide safe temporary housing',
      ],
      keyPointsEs: [
        'La mayoría de edad es 19 (una de las más altas en EE.UU.)',
        'La policía puede detener fugitivos y regresarlos a casa',
        'Es ilegal albergar a un fugitivo',
        'Los refugios juveniles pueden proporcionar vivienda temporal segura',
      ],
    },
    abuseReporting: {
      hotline: '1-800-422-4453',
      website: 'https://dhr.alabama.gov/child-protective-services/',
      agency: 'Alabama Department of Human Resources',
      agencyEs: 'Departamento de Recursos Humanos de Alabama',
      canReportAnonymously: true,
      onlineReporting: false,
    },
  },
  AK: {
    state: 'Alaska',
    stateCode: 'AK',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Alaska, running away is a status offense. You can be placed in a crisis intervention center. At 16, you may petition for emancipation.',
      summaryEs: 'En Alaska, huir es una ofensa de estatus. Puedes ser colocado en un centro de intervención de crisis. A los 16, puedes solicitar emancipación.',
      keyPoints: [
        'Running away is a "child in need of aid" situation',
        'Crisis centers available instead of detention',
        'Emancipation possible at 16 with court approval',
        'Youth advocates can help navigate the system',
      ],
      keyPointsEs: [
        'Huir es una situación de "niño necesitado de ayuda"',
        'Centros de crisis disponibles en lugar de detención',
        'Emancipación posible a los 16 con aprobación del tribunal',
        'Defensores de jóvenes pueden ayudar a navegar el sistema',
      ],
    },
    abuseReporting: {
      hotline: '1-800-478-4444',
      website: 'https://dfcs.alaska.gov/ocs/Pages/default.aspx',
      agency: 'Alaska Office of Children\'s Services',
      agencyEs: 'Oficina de Servicios para Niños de Alaska',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  AZ: {
    state: 'Arizona',
    stateCode: 'AZ',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Arizona, running away is an "incorrigible" status offense. Police can take you to a shelter or back home. There are alternatives to detention.',
      summaryEs: 'En Arizona, huir es una ofensa de estatus "incorregible". La policía puede llevarte a un refugio o de vuelta a casa. Hay alternativas a la detención.',
      keyPoints: [
        'Classified as "incorrigible child" behavior',
        'Diversion programs available instead of court',
        'Emancipation available at 16',
        'Many youth-specific shelters in Phoenix and Tucson',
      ],
      keyPointsEs: [
        'Clasificado como comportamiento de "niño incorregible"',
        'Programas de diversión disponibles en lugar de tribunal',
        'Emancipación disponible a los 16',
        'Muchos refugios específicos para jóvenes en Phoenix y Tucson',
      ],
    },
    abuseReporting: {
      hotline: '1-888-767-2445',
      website: 'https://dcs.az.gov/report-child-abuse',
      agency: 'Arizona Department of Child Safety',
      agencyEs: 'Departamento de Seguridad Infantil de Arizona',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  CA: {
    state: 'California',
    stateCode: 'CA',
    runawayLaws: {
      isStatusOffense: false,
      canBeDetained: false,
      harboringLaw: false,
      ageOfMajority: 18,
      emancipationAge: 14,
      summary: 'California does NOT criminalize running away. Police cannot arrest you for being a runaway, but they can return you home or to a shelter for safety.',
      summaryEs: 'California NO criminaliza huir. La policía no puede arrestarte por ser fugitivo, pero pueden regresarte a casa o a un refugio por seguridad.',
      keyPoints: [
        'Running away is NOT a crime in California',
        'Police focus on safety, not punishment',
        'Emancipation possible as young as 14',
        'Many youth resources available statewide',
        'Covenant House and other shelters won\'t turn you in',
      ],
      keyPointsEs: [
        'Huir NO es un crimen en California',
        'La policía se enfoca en seguridad, no en castigo',
        'Emancipación posible desde los 14 años',
        'Muchos recursos juveniles disponibles en todo el estado',
        'Covenant House y otros refugios no te entregarán',
      ],
    },
    abuseReporting: {
      hotline: '1-800-422-4453',
      website: 'https://www.cdss.ca.gov/reporting/report-abuse',
      agency: 'California Department of Social Services',
      agencyEs: 'Departamento de Servicios Sociales de California',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  CO: {
    state: 'Colorado',
    stateCode: 'CO',
    runawayLaws: {
      isStatusOffense: false,
      canBeDetained: false,
      harboringLaw: false,
      ageOfMajority: 18,
      emancipationAge: 15,
      summary: 'Colorado decriminalized running away. You cannot be arrested or detained. Police may help connect you with services or return you home safely.',
      summaryEs: 'Colorado despenalizó huir. No puedes ser arrestado o detenido. La policía puede ayudar a conectarte con servicios o regresarte a casa de forma segura.',
      keyPoints: [
        'Running away is NOT illegal',
        'Cannot be detained or locked up',
        'Emancipation possible at 15',
        'Strong youth services network in Denver',
      ],
      keyPointsEs: [
        'Huir NO es ilegal',
        'No puedes ser detenido o encerrado',
        'Emancipación posible a los 15',
        'Fuerte red de servicios juveniles en Denver',
      ],
    },
    abuseReporting: {
      hotline: '1-844-264-5437',
      website: 'https://cdhs.colorado.gov/report-abuse-or-neglect',
      agency: 'Colorado Department of Human Services',
      agencyEs: 'Departamento de Servicios Humanos de Colorado',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  FL: {
    state: 'Florida',
    stateCode: 'FL',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Florida, running away is a status offense. Police can take you to a shelter or staff-secure facility. Parents can file a petition with the court.',
      summaryEs: 'En Florida, huir es una ofensa de estatus. La policía puede llevarte a un refugio o instalación segura. Los padres pueden presentar una petición ante el tribunal.',
      keyPoints: [
        'Truancy and runaway behavior are status offenses',
        'CINS/FINS programs provide alternatives to court',
        'Youth can be placed in staff-secure (not locked) shelters',
        'Emancipation available at 16',
        'Harboring a runaway is a misdemeanor',
      ],
      keyPointsEs: [
        'El ausentismo y huir son ofensas de estatus',
        'Programas CINS/FINS proporcionan alternativas al tribunal',
        'Los jóvenes pueden ser colocados en refugios seguros (no encerrados)',
        'Emancipación disponible a los 16',
        'Albergar a un fugitivo es un delito menor',
      ],
    },
    abuseReporting: {
      hotline: '1-800-962-2873',
      website: 'https://www.myflfamilies.com/service-programs/abuse-hotline/',
      agency: 'Florida Abuse Hotline',
      agencyEs: 'Línea de Abuso de Florida',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  GA: {
    state: 'Georgia',
    stateCode: 'GA',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Georgia, running away is considered "unruly" behavior. You may be referred to juvenile court. There are alternatives like family counseling.',
      summaryEs: 'En Georgia, huir se considera comportamiento "rebelde". Puedes ser referido a un tribunal de menores. Hay alternativas como consejería familiar.',
      keyPoints: [
        'Running away makes you an "unruly child" under law',
        'Juvenile court may order counseling or placement',
        'Emancipation possible at 16',
        'Strong youth services in Atlanta metro area',
      ],
      keyPointsEs: [
        'Huir te convierte en "niño rebelde" bajo la ley',
        'El tribunal de menores puede ordenar consejería o colocación',
        'Emancipación posible a los 16',
        'Fuertes servicios juveniles en el área metropolitana de Atlanta',
      ],
    },
    abuseReporting: {
      hotline: '1-855-422-4453',
      website: 'https://dfcs.georgia.gov/report-child-abuse',
      agency: 'Georgia Division of Family & Children Services',
      agencyEs: 'División de Servicios para Familias y Niños de Georgia',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  IL: {
    state: 'Illinois',
    stateCode: 'IL',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Illinois, running away is a status offense called "minor requiring authoritative intervention." There are many youth services, especially in Chicago.',
      summaryEs: 'En Illinois, huir es una ofensa de estatus llamada "menor que requiere intervención autoritaria." Hay muchos servicios juveniles, especialmente en Chicago.',
      keyPoints: [
        'Called "Minor Requiring Authoritative Intervention" (MRAI)',
        'Focus is on services, not punishment',
        'Strong network of youth shelters in Chicago',
        'Emancipation possible at 16',
      ],
      keyPointsEs: [
        'Llamado "Menor que Requiere Intervención Autoritaria" (MRAI)',
        'El enfoque es en servicios, no en castigo',
        'Fuerte red de refugios juveniles en Chicago',
        'Emancipación posible a los 16',
      ],
    },
    abuseReporting: {
      hotline: '1-800-252-2873',
      website: 'https://dcfs.illinois.gov/reporting/reporting.html',
      agency: 'Illinois DCFS',
      agencyEs: 'DCFS de Illinois',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  NY: {
    state: 'New York',
    stateCode: 'NY',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: false,
      harboringLaw: false,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In New York, running away is a "Person in Need of Supervision" (PINS) matter. You cannot be detained in a locked facility. Many services available.',
      summaryEs: 'En Nueva York, huir es un asunto de "Persona que Necesita Supervisión" (PINS). No puedes ser detenido en una instalación cerrada. Muchos servicios disponibles.',
      keyPoints: [
        'PINS process focuses on help, not punishment',
        'Cannot be placed in detention for running away',
        'Covenant House NYC is a major resource',
        'Many diversion programs available',
        'Strong youth advocate presence',
      ],
      keyPointsEs: [
        'El proceso PINS se enfoca en ayuda, no en castigo',
        'No puedes ser colocado en detención por huir',
        'Covenant House NYC es un recurso importante',
        'Muchos programas de diversión disponibles',
        'Fuerte presencia de defensores de jóvenes',
      ],
    },
    abuseReporting: {
      hotline: '1-800-342-3720',
      website: 'https://ocfs.ny.gov/programs/cps/',
      agency: 'New York State Central Register',
      agencyEs: 'Registro Central del Estado de Nueva York',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
  TX: {
    state: 'Texas',
    stateCode: 'TX',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: true,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Texas, running away is a status offense called "conduct indicating need for supervision." Police can detain you for up to 24 hours.',
      summaryEs: 'En Texas, huir es una ofensa de estatus llamada "conducta que indica necesidad de supervisión." La policía puede detenerte hasta por 24 horas.',
      keyPoints: [
        'Running away is "Conduct Indicating Need for Supervision" (CINS)',
        'Can be held up to 24 hours in non-secure facility',
        'Harboring law applies to adults',
        'Emancipation possible at 16 (or 17 if married)',
        'Many shelters in major cities',
      ],
      keyPointsEs: [
        'Huir es "Conducta que Indica Necesidad de Supervisión" (CINS)',
        'Puedes ser retenido hasta 24 horas en instalación no segura',
        'La ley de albergue aplica a adultos',
        'Emancipación posible a los 16 (o 17 si estás casado)',
        'Muchos refugios en ciudades principales',
      ],
    },
    abuseReporting: {
      hotline: '1-800-252-5400',
      website: 'https://www.txabusehotline.org/',
      agency: 'Texas Department of Family and Protective Services',
      agencyEs: 'Departamento de Servicios Protectores y Familiares de Texas',
      canReportAnonymously: true,
      onlineReporting: true,
      textOption: 'Text "REPORT" to 233733',
    },
  },
  WA: {
    state: 'Washington',
    stateCode: 'WA',
    runawayLaws: {
      isStatusOffense: true,
      canBeDetained: true,
      harboringLaw: false,
      ageOfMajority: 18,
      emancipationAge: 16,
      summary: 'In Washington, running away falls under "At-Risk Youth" laws. Parents can petition for help, but focus is on family reconciliation, not punishment.',
      summaryEs: 'En Washington, huir cae bajo las leyes de "Jóvenes en Riesgo". Los padres pueden solicitar ayuda, pero el enfoque es en reconciliación familiar, no en castigo.',
      keyPoints: [
        'Called "At-Risk Youth" (ARY) petition process',
        'Focus is on helping families',
        'No harboring law',
        'Strong services in Seattle area',
        'Emancipation possible at 16',
      ],
      keyPointsEs: [
        'Llamado proceso de petición de "Jóvenes en Riesgo" (ARY)',
        'El enfoque es en ayudar a las familias',
        'No hay ley de albergue',
        'Fuertes servicios en el área de Seattle',
        'Emancipación posible a los 16',
      ],
    },
    abuseReporting: {
      hotline: '1-866-363-4276',
      website: 'https://www.dcyf.wa.gov/safety/report-abuse',
      agency: 'Washington DCYF',
      agencyEs: 'DCYF de Washington',
      canReportAnonymously: true,
      onlineReporting: true,
    },
  },
};

// Default/fallback for states not yet added
export const DEFAULT_YOUTH_LAWS: Omit<StateYouthLaws, 'state' | 'stateCode'> = {
  runawayLaws: {
    isStatusOffense: true,
    canBeDetained: true,
    harboringLaw: true,
    ageOfMajority: 18,
    summary: 'Running away laws vary by state. In most states, it is a status offense (only illegal for minors). Call the National Runaway Safeline for help.',
    summaryEs: 'Las leyes sobre huir varían por estado. En la mayoría de los estados, es una ofensa de estatus (solo ilegal para menores). Llama a la Línea Nacional para Fugitivos para ayuda.',
    keyPoints: [
      'Laws vary by state - this is general information',
      'Call National Runaway Safeline: 1-800-786-2929 for specific help',
      'Youth shelters can help regardless of state laws',
      'You have the right to be safe',
    ],
    keyPointsEs: [
      'Las leyes varían por estado - esta es información general',
      'Llama a la Línea Nacional para Fugitivos: 1-800-786-2929 para ayuda específica',
      'Los refugios juveniles pueden ayudar independientemente de las leyes estatales',
      'Tienes derecho a estar seguro/a',
    ],
  },
  abuseReporting: {
    hotline: '1-800-422-4453',
    website: 'https://www.childhelp.org/hotline/',
    agency: 'Childhelp National Child Abuse Hotline',
    agencyEs: 'Línea Nacional de Abuso Infantil Childhelp',
    canReportAnonymously: true,
    onlineReporting: false,
  },
};

/**
 * Get youth laws for a specific state
 */
export const getStateYouthLaws = (stateCode: string): StateYouthLaws => {
  const upperCode = stateCode.toUpperCase();
  if (STATE_YOUTH_LAWS[upperCode]) {
    return STATE_YOUTH_LAWS[upperCode];
  }
  // Return default with the state code
  return {
    state: stateCode,
    stateCode: upperCode,
    ...DEFAULT_YOUTH_LAWS,
  };
};

/**
 * Abuse reporting quick info
 */
export const ABUSE_REPORTING_INFO = {
  title: 'How to Report Abuse',
  titleEs: 'Cómo Reportar Abuso',
  intro: 'If you are being hurt, neglected, or abused, you have the right to get help. Reporting is confidential and can be anonymous.',
  introEs: 'Si te están lastimando, descuidando o abusando, tienes derecho a obtener ayuda. El reporte es confidencial y puede ser anónimo.',
  nationalHotline: {
    name: 'Childhelp National Child Abuse Hotline',
    nameEs: 'Línea Nacional de Abuso Infantil Childhelp',
    phone: '1-800-422-4453',
    description: 'Available 24/7 in over 170 languages. Professional crisis counselors.',
    descriptionEs: 'Disponible 24/7 en más de 170 idiomas. Consejeros profesionales de crisis.',
  },
  types: [
    {
      type: 'Physical Abuse',
      typeEs: 'Abuso Físico',
      examples: 'Hitting, kicking, burning, or any physical harm',
      examplesEs: 'Golpear, patear, quemar o cualquier daño físico',
      icon: '🛑',
    },
    {
      type: 'Emotional Abuse',
      typeEs: 'Abuso Emocional',
      examples: 'Constant criticism, threats, rejection, or isolation',
      examplesEs: 'Crítica constante, amenazas, rechazo o aislamiento',
      icon: '💔',
    },
    {
      type: 'Neglect',
      typeEs: 'Negligencia',
      examples: 'Not providing food, shelter, medical care, or supervision',
      examplesEs: 'No proporcionar comida, refugio, atención médica o supervisión',
      icon: '🚫',
    },
    {
      type: 'Sexual Abuse',
      typeEs: 'Abuso Sexual',
      examples: 'Any sexual contact or behavior with a minor',
      examplesEs: 'Cualquier contacto o comportamiento sexual con un menor',
      icon: '⚠️',
    },
  ],
  steps: [
    {
      step: 1,
      title: 'You Are Not Alone',
      titleEs: 'No Estás Solo/a',
      description: 'What is happening to you is not your fault. Many people care and want to help.',
      descriptionEs: 'Lo que te está pasando no es tu culpa. Muchas personas se preocupan y quieren ayudar.',
    },
    {
      step: 2,
      title: 'Find a Safe Person',
      titleEs: 'Encuentra una Persona Segura',
      description: 'Tell a teacher, counselor, doctor, or another trusted adult what is happening.',
      descriptionEs: 'Cuéntale a un maestro, consejero, doctor u otro adulto de confianza lo que está pasando.',
    },
    {
      step: 3,
      title: 'Call the Hotline',
      titleEs: 'Llama a la Línea de Ayuda',
      description: 'Call 1-800-422-4453 anytime, 24/7. They can help you figure out what to do.',
      descriptionEs: 'Llama al 1-800-422-4453 en cualquier momento, 24/7. Pueden ayudarte a decidir qué hacer.',
    },
    {
      step: 4,
      title: 'You Can Report Anonymously',
      titleEs: 'Puedes Reportar Anónimamente',
      description: 'You don\'t have to give your name when you report. Your safety comes first.',
      descriptionEs: 'No tienes que dar tu nombre cuando reportas. Tu seguridad es lo primero.',
    },
  ],
  whatHappens: {
    title: 'What Happens When You Report',
    titleEs: 'Qué Pasa Cuando Reportas',
    points: [
      'A trained counselor will listen to you',
      'They will help you make a safety plan',
      'Child Protective Services may investigate',
      'The goal is to keep you safe',
      'You may be connected with support services',
    ],
    pointsEs: [
      'Un consejero capacitado te escuchará',
      'Te ayudarán a hacer un plan de seguridad',
      'Servicios de Protección Infantil puede investigar',
      'El objetivo es mantenerte seguro/a',
      'Puedes ser conectado con servicios de apoyo',
    ],
  },
  emergency: {
    title: 'In Immediate Danger?',
    titleEs: '¿En Peligro Inmediato?',
    message: 'If you are in immediate danger, call 911 right away.',
    messageEs: 'Si estás en peligro inmediato, llama al 911 de inmediato.',
  },
};

/**
 * Emancipation information for youth
 */
export const EMANCIPATION_INFO = {
  title: 'Emancipation: Becoming a Legal Adult Early',
  titleEs: 'Emancipación: Convertirse en Adulto Legal Antes',
  description: 'Emancipation is a legal process where a minor becomes a legal adult before turning 18. This means you can make your own decisions about where to live, medical care, and more.',
  descriptionEs: 'La emancipación es un proceso legal donde un menor se convierte en adulto legal antes de cumplir 18 años. Esto significa que puedes tomar tus propias decisiones sobre dónde vivir, atención médica y más.',
  requirements: [
    {
      title: 'Age Requirement',
      titleEs: 'Requisito de Edad',
      detail: 'Most states require you to be at least 16 (some allow 14-15)',
      detailEs: 'La mayoría de los estados requieren que tengas al menos 16 años (algunos permiten 14-15)',
    },
    {
      title: 'Financial Independence',
      titleEs: 'Independencia Financiera',
      detail: 'You must show you can support yourself financially',
      detailEs: 'Debes demostrar que puedes mantenerte financieramente',
    },
    {
      title: 'Living Situation',
      titleEs: 'Situación de Vivienda',
      detail: 'You need a stable place to live',
      detailEs: 'Necesitas un lugar estable para vivir',
    },
    {
      title: 'Maturity',
      titleEs: 'Madurez',
      detail: 'You must show you can make adult decisions',
      detailEs: 'Debes demostrar que puedes tomar decisiones de adulto',
    },
  ],
  warning: 'Emancipation is difficult and requires going to court. Talk to a lawyer or legal aid organization first. Many youth find that shelter services and support programs can help without needing emancipation.',
  warningEs: 'La emancipación es difícil y requiere ir a la corte. Habla primero con un abogado u organización de asistencia legal. Muchos jóvenes encuentran que los servicios de refugio y programas de apoyo pueden ayudar sin necesidad de emancipación.',
};
