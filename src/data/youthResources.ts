/**
 * Youth-specific resources for minors (under 18)
 * Special hotlines, shelters, and support services
 */

export interface YouthHotline {
  id: string;
  name: string;
  nameEs: string;
  phone: string;
  description: string;
  descriptionEs: string;
  available: string;
  availableEs: string;
  icon: string;
}

export interface YouthTip {
  id: string;
  title: string;
  titleEs: string;
  content: string;
  contentEs: string;
  icon: string;
  category: 'safety' | 'support' | 'rights' | 'resources';
}

export const YOUTH_HOTLINES: YouthHotline[] = [
  {
    id: 'runaway',
    name: 'National Runaway Safeline',
    nameEs: 'Línea Nacional para Fugitivos',
    phone: '1-800-786-2929',
    description: 'Free, confidential support for youth thinking about running away, or already on the streets. They can help you make a plan and find safe options.',
    descriptionEs: 'Apoyo gratuito y confidencial para jóvenes que piensan en huir o que ya están en la calle. Pueden ayudarte a hacer un plan y encontrar opciones seguras.',
    available: '24/7',
    availableEs: '24/7',
    icon: '🏃',
  },
  {
    id: 'covenant',
    name: 'Covenant House Nineline',
    nameEs: 'Línea de Covenant House',
    phone: '1-800-999-9999',
    description: 'Crisis support for homeless and at-risk youth. They offer shelter, resources, and someone to talk to.',
    descriptionEs: 'Apoyo de crisis para jóvenes sin hogar y en riesgo. Ofrecen refugio, recursos y alguien con quien hablar.',
    available: '24/7',
    availableEs: '24/7',
    icon: '🏠',
  },
  {
    id: 'childhelp',
    name: 'Childhelp National Hotline',
    nameEs: 'Línea Nacional Childhelp',
    phone: '1-800-422-4453',
    description: 'If you are being abused or neglected, professional counselors can help. Calls are confidential.',
    descriptionEs: 'Si estás siendo abusado/a o descuidado/a, consejeros profesionales pueden ayudar. Las llamadas son confidenciales.',
    available: '24/7',
    availableEs: '24/7',
    icon: '💚',
  },
  {
    id: 'crisis-text',
    name: 'Crisis Text Line',
    nameEs: 'Línea de Texto de Crisis',
    phone: 'Text HOME to 741741',
    description: 'Free 24/7 support via text message. Just text HOME to 741741 to connect with a trained crisis counselor.',
    descriptionEs: 'Apoyo gratuito 24/7 por mensaje de texto. Envía HOME al 741741 para conectar con un consejero de crisis.',
    available: '24/7',
    availableEs: '24/7',
    icon: '💬',
  },
  {
    id: 'lgbtq',
    name: 'Trevor Project (LGBTQ+)',
    nameEs: 'Proyecto Trevor (LGBTQ+)',
    phone: '1-866-488-7386',
    description: 'Crisis support for LGBTQ+ young people. You are not alone and there are people who care.',
    descriptionEs: 'Apoyo de crisis para jóvenes LGBTQ+. No estás solo/a y hay personas que se preocupan.',
    available: '24/7',
    availableEs: '24/7',
    icon: '🌈',
  },
  {
    id: '988',
    name: '988 Suicide & Crisis Lifeline',
    nameEs: '988 Línea de Crisis y Suicidio',
    phone: '988',
    description: 'Free, confidential support for anyone in emotional distress or suicidal crisis. You matter.',
    descriptionEs: 'Apoyo gratuito y confidencial para cualquiera en angustia emocional o crisis suicida. Tú importas.',
    available: '24/7',
    availableEs: '24/7',
    icon: '❤️',
  },
];

export const YOUTH_SAFETY_TIPS: YouthTip[] = [
  {
    id: 'think-first',
    title: 'Think Before You Leave',
    titleEs: 'Piensa Antes de Irte',
    content: 'Running away might seem like the only option, but life on the streets is very dangerous for young people. There are safer ways to get help. Call the Runaway Safeline first.',
    contentEs: 'Huir puede parecer la única opción, pero la vida en la calle es muy peligrosa para los jóvenes. Hay formas más seguras de obtener ayuda. Llama primero a la Línea para Fugitivos.',
    icon: '🤔',
    category: 'safety',
  },
  {
    id: 'trusted-adult',
    title: 'Find a Trusted Adult',
    titleEs: 'Encuentra un Adulto de Confianza',
    content: 'A teacher, school counselor, coach, or relative can help you. You don\'t have to face this alone.',
    contentEs: 'Un maestro, consejero escolar, entrenador o familiar puede ayudarte. No tienes que enfrentar esto solo/a.',
    icon: '👨‍👩‍👧',
    category: 'support',
  },
  {
    id: 'your-rights',
    title: 'Know Your Rights',
    titleEs: 'Conoce Tus Derechos',
    content: 'You have the right to be safe. If someone is hurting you, it\'s not your fault. Abuse is never okay, and there are people who will believe you.',
    contentEs: 'Tienes derecho a estar seguro/a. Si alguien te está lastimando, no es tu culpa. El abuso nunca está bien, y hay personas que te creerán.',
    icon: '⚖️',
    category: 'rights',
  },
  {
    id: 'youth-shelters',
    title: 'Youth Shelters Are Different',
    titleEs: 'Los Refugios Juveniles Son Diferentes',
    content: 'There are special shelters just for young people. They\'re safer than adult shelters and have staff who understand what you\'re going through.',
    contentEs: 'Hay refugios especiales solo para jóvenes. Son más seguros que los refugios para adultos y tienen personal que entiende lo que estás pasando.',
    icon: '🏠',
    category: 'resources',
  },
  {
    id: 'stay-connected',
    title: 'Stay Connected',
    titleEs: 'Mantente Conectado/a',
    content: 'If possible, keep your phone charged and have emergency contacts saved. Tell a friend where you are.',
    contentEs: 'Si es posible, mantén tu teléfono cargado y guarda contactos de emergencia. Dile a un amigo dónde estás.',
    icon: '📱',
    category: 'safety',
  },
  {
    id: 'school-help',
    title: 'School Can Help',
    titleEs: 'La Escuela Puede Ayudar',
    content: 'Many schools have programs to help students in crisis, including free meals, counseling, and connections to resources. Talk to a counselor.',
    contentEs: 'Muchas escuelas tienen programas para ayudar a estudiantes en crisis, incluyendo comidas gratis, consejería y conexiones a recursos.',
    icon: '🏫',
    category: 'resources',
  },
];

export const YOUTH_JOB_RESOURCES = {
  title: 'Job Training for Youth',
  titleEs: 'Capacitación Laboral para Jóvenes',
  programs: [
    {
      id: 'jobcorps',
      name: 'Job Corps',
      nameEs: 'Job Corps',
      description: 'Free education and job training for young people ages 16-24. Includes housing, meals, and healthcare.',
      descriptionEs: 'Educación gratuita y capacitación laboral para jóvenes de 16-24 años. Incluye vivienda, comidas y atención médica.',
      phone: '1-800-733-5627',
      website: 'https://www.jobcorps.gov',
    },
    {
      id: 'youthbuild',
      name: 'YouthBuild',
      nameEs: 'YouthBuild',
      description: 'Construction training and education for youth 16-24. Earn money while learning valuable skills.',
      descriptionEs: 'Capacitación en construcción y educación para jóvenes de 16-24. Gana dinero mientras aprendes habilidades valiosas.',
      phone: '1-617-623-9900',
      website: 'https://youthbuild.org',
    },
    {
      id: 'americorps',
      name: 'AmeriCorps',
      nameEs: 'AmeriCorps',
      description: 'Service programs for young people that provide education awards and valuable experience.',
      descriptionEs: 'Programas de servicio para jóvenes que proporcionan becas educativas y experiencia valiosa.',
      phone: '1-800-942-2677',
      website: 'https://americorps.gov',
    },
  ],
};

export const YOUTH_SHELTER_RESOURCES = {
  title: 'Youth Shelters',
  titleEs: 'Refugios para Jóvenes',
  description: 'Special shelters just for young people - safer than adult shelters with staff who understand your situation.',
  descriptionEs: 'Refugios especiales solo para jóvenes - más seguros que los refugios para adultos con personal que entiende tu situación.',
  shelters: [
    {
      id: 'covenant-house',
      name: 'Covenant House',
      nameEs: 'Covenant House',
      description: 'Safe shelter for homeless youth ages 18-24. Also helps younger teens in some locations.',
      descriptionEs: 'Refugio seguro para jóvenes sin hogar de 18-24 años. También ayuda a adolescentes más jóvenes en algunas ubicaciones.',
      phone: '1-800-999-9999',
      website: 'https://www.covenanthouse.org',
    },
    {
      id: 'standupforkids',
      name: 'StandUp for Kids',
      nameEs: 'StandUp for Kids',
      description: 'Street outreach program helping homeless and at-risk youth nationwide.',
      descriptionEs: 'Programa de alcance callejero que ayuda a jóvenes sin hogar y en riesgo en todo el país.',
      phone: '1-800-365-4543',
      website: 'https://www.standupforkids.org',
    },
    {
      id: 'national-safe-place',
      name: 'National Safe Place',
      nameEs: 'Lugar Seguro Nacional',
      description: 'Look for the yellow Safe Place sign at libraries, fire stations, and businesses. Staff will help you get to safety.',
      descriptionEs: 'Busca el letrero amarillo de Lugar Seguro en bibliotecas, estaciones de bomberos y negocios. El personal te ayudará a llegar a un lugar seguro.',
      phone: '1-888-290-7233',
      website: 'https://www.nationalsafeplace.org',
    },
  ],
  tips: [
    {
      title: 'Youth shelters are different',
      titleEs: 'Los refugios juveniles son diferentes',
      text: 'Staff at youth shelters are trained to help young people. They understand what you\'re going through.',
      textEs: 'El personal de los refugios juveniles está capacitado para ayudar a jóvenes. Entienden lo que estás pasando.',
    },
    {
      title: 'Call before you go',
      titleEs: 'Llama antes de ir',
      text: 'Youth shelters may have limited beds. Call ahead to check availability.',
      textEs: 'Los refugios juveniles pueden tener camas limitadas. Llama con anticipación para verificar disponibilidad.',
    },
  ],
};

export const getYouthMessage = (isSpanish: boolean): string => {
  if (isSpanish) {
    return `🌟 Vemos que eres menor de 18 años. Queremos que sepas que no estás solo/a y hay personas que quieren ayudarte.

Si estás pensando en huir de casa, por favor llama primero a la Línea Nacional para Fugitivos: 1-800-786-2929. Pueden ayudarte a encontrar opciones más seguras.

Esta app te mostrará recursos especiales para jóvenes, incluyendo refugios juveniles, programas de capacitación y líneas de ayuda confidenciales.`;
  }

  return `🌟 We see you're under 18. We want you to know that you're not alone and there are people who want to help.

If you're thinking about running away, please call the National Runaway Safeline first: 1-800-786-2929. They can help you find safer options.

This app will show you special resources for young people, including youth shelters, training programs, and confidential help lines.`;
};
