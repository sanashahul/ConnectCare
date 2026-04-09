import { Question } from '../types';

export const healthcareQuestions: Question[] = [
  {
    id: 'health_1',
    category: 'healthcare',
    question: 'Do you currently have health insurance?',
    questionEs: '¿Tienes actualmente seguro médico?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes', labelEs: 'Sí' },
      { id: 'no', label: 'No', labelEs: 'No' },
      { id: 'unsure', label: "I'm not sure", labelEs: 'No estoy seguro' },
    ],
  },
  {
    id: 'health_2',
    category: 'healthcare',
    question: 'Do you have any chronic health conditions?',
    questionEs: '¿Tienes alguna condición de salud crónica?',
    type: 'multiple',
    options: [
      { id: 'diabetes', label: 'Diabetes', labelEs: 'Diabetes' },
      { id: 'heart', label: 'Heart disease', labelEs: 'Enfermedad del corazón' },
      { id: 'respiratory', label: 'Respiratory issues (asthma, COPD)', labelEs: 'Problemas respiratorios (asma, EPOC)' },
      { id: 'hypertension', label: 'High blood pressure', labelEs: 'Presión arterial alta' },
      { id: 'mental', label: 'Mental health condition', labelEs: 'Condición de salud mental' },
      { id: 'none', label: 'None', labelEs: 'Ninguna' },
      { id: 'other', label: 'Other', labelEs: 'Otra' },
    ],
  },
  {
    id: 'health_3',
    category: 'healthcare',
    question: 'Are you currently taking any medications?',
    questionEs: '¿Estás tomando algún medicamento actualmente?',
    type: 'yesno',
  },
  {
    id: 'health_5',
    category: 'healthcare',
    question: 'Do you need mental health support?',
    questionEs: '¿Necesitas apoyo de salud mental?',
    type: 'single',
    options: [
      { id: 'yes_urgent', label: 'Yes, urgently', labelEs: 'Sí, urgentemente' },
      { id: 'yes', label: 'Yes', labelEs: 'Sí' },
      { id: 'maybe', label: 'Maybe / I\'m not sure', labelEs: 'Tal vez / No estoy seguro' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'health_6',
    category: 'healthcare',
    question: 'Do you have dental care needs?',
    questionEs: '¿Tienes necesidades de atención dental?',
    type: 'single',
    options: [
      { id: 'yes_urgent', label: 'Yes, I have pain or urgent issues', labelEs: 'Sí, tengo dolor o problemas urgentes' },
      { id: 'yes', label: 'Yes, I need a checkup', labelEs: 'Sí, necesito un chequeo' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'health_7',
    category: 'healthcare',
    question: 'Do you have vision care needs?',
    questionEs: '¿Tienes necesidades de atención visual?',
    type: 'single',
    options: [
      { id: 'yes_glasses', label: 'Yes, I need glasses/contacts', labelEs: 'Sí, necesito lentes/contactos' },
      { id: 'yes_exam', label: 'Yes, I need an eye exam', labelEs: 'Sí, necesito un examen de la vista' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'health_8',
    category: 'healthcare',
    question: 'Are you pregnant or do you have children who need medical care?',
    questionEs: '¿Estás embarazada o tienes hijos que necesitan atención médica?',
    type: 'single',
    options: [
      { id: 'pregnant', label: 'I am pregnant', labelEs: 'Estoy embarazada' },
      { id: 'children', label: 'I have children who need care', labelEs: 'Tengo hijos que necesitan atención' },
      { id: 'both', label: 'Both', labelEs: 'Ambos' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'health_9',
    category: 'healthcare',
    question: 'Do you have any disabilities that affect your daily life?',
    questionEs: '¿Tienes alguna discapacidad que afecte tu vida diaria?',
    type: 'single',
    options: [
      { id: 'physical', label: 'Physical disability', labelEs: 'Discapacidad física' },
      { id: 'cognitive', label: 'Cognitive/developmental disability', labelEs: 'Discapacidad cognitiva/del desarrollo' },
      { id: 'sensory', label: 'Sensory disability (vision/hearing)', labelEs: 'Discapacidad sensorial (visión/audición)' },
      { id: 'multiple', label: 'Multiple disabilities', labelEs: 'Múltiples discapacidades' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'health_10',
    category: 'healthcare',
    question: 'Do you have substance use concerns you would like help with?',
    questionEs: '¿Tienes preocupaciones sobre uso de sustancias con las que te gustaría recibir ayuda?',
    type: 'single',
    options: [
      { id: 'yes_help', label: 'Yes, I want help', labelEs: 'Sí, quiero ayuda' },
      { id: 'yes_info', label: 'Yes, I want information', labelEs: 'Sí, quiero información' },
      { id: 'no', label: 'No', labelEs: 'No' },
      { id: 'prefer_not', label: 'Prefer not to say', labelEs: 'Prefiero no decir' },
    ],
  },
];

export const employmentQuestions: Question[] = [
  {
    id: 'employ_1',
    category: 'employment',
    question: 'What is your current employment status?',
    questionEs: '¿Cuál es tu situación laboral actual?',
    type: 'single',
    options: [
      { id: 'unemployed', label: 'Unemployed, looking for work', labelEs: 'Desempleado, buscando trabajo' },
      { id: 'part_time', label: 'Working part-time', labelEs: 'Trabajando medio tiempo' },
      { id: 'temp', label: 'Temporary/gig work', labelEs: 'Trabajo temporal/por encargo' },
      { id: 'full_time', label: 'Working full-time', labelEs: 'Trabajando tiempo completo' },
      { id: 'unable', label: 'Unable to work', labelEs: 'Incapaz de trabajar' },
    ],
  },
  {
    id: 'employ_2',
    category: 'employment',
    question: 'What is your highest level of education?',
    questionEs: '¿Cuál es tu nivel más alto de educación?',
    type: 'single',
    options: [
      { id: 'none', label: 'No formal education', labelEs: 'Sin educación formal' },
      { id: 'some_high', label: 'Some high school', labelEs: 'Algo de preparatoria' },
      { id: 'high_school', label: 'High school diploma/GED', labelEs: 'Diploma de preparatoria/GED' },
      { id: 'some_college', label: 'Some college', labelEs: 'Algo de universidad' },
      { id: 'associate', label: 'Associate degree', labelEs: 'Título asociado' },
      { id: 'bachelor', label: 'Bachelor\'s degree', labelEs: 'Licenciatura' },
      { id: 'graduate', label: 'Graduate degree', labelEs: 'Posgrado' },
    ],
  },
  {
    id: 'employ_3',
    category: 'employment',
    question: 'Do you have a valid government-issued ID?',
    questionEs: '¿Tienes una identificación oficial válida?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes', labelEs: 'Sí' },
      { id: 'expired', label: 'Yes, but it\'s expired', labelEs: 'Sí, pero está vencida' },
      { id: 'no', label: 'No', labelEs: 'No' },
      { id: 'in_progress', label: 'I\'m working on getting one', labelEs: 'Estoy trabajando en obtener una' },
    ],
  },
  {
    id: 'employ_4',
    category: 'employment',
    question: 'Do you have reliable transportation?',
    questionEs: '¿Tienes transporte confiable?',
    type: 'single',
    options: [
      { id: 'own_car', label: 'Yes, I have my own vehicle', labelEs: 'Sí, tengo mi propio vehículo' },
      { id: 'public', label: 'Yes, I can use public transit', labelEs: 'Sí, puedo usar transporte público' },
      { id: 'bike', label: 'Yes, I have a bike', labelEs: 'Sí, tengo bicicleta' },
      { id: 'limited', label: 'Limited transportation', labelEs: 'Transporte limitado' },
      { id: 'no', label: 'No reliable transportation', labelEs: 'Sin transporte confiable' },
    ],
  },
  {
    id: 'employ_5',
    category: 'employment',
    question: 'What type of work are you looking for?',
    questionEs: '¿Qué tipo de trabajo estás buscando?',
    type: 'multiple',
    options: [
      { id: 'food', label: 'Food service/Restaurant', labelEs: 'Servicio de alimentos/Restaurante' },
      { id: 'retail', label: 'Retail/Customer service', labelEs: 'Ventas/Servicio al cliente' },
      { id: 'warehouse', label: 'Warehouse/Labor', labelEs: 'Almacén/Trabajo manual' },
      { id: 'construction', label: 'Construction', labelEs: 'Construcción' },
      { id: 'healthcare', label: 'Healthcare', labelEs: 'Salud' },
      { id: 'office', label: 'Office/Administrative', labelEs: 'Oficina/Administrativo' },
      { id: 'tech', label: 'Technology', labelEs: 'Tecnología' },
      { id: 'any', label: 'Open to anything', labelEs: 'Abierto a cualquier cosa' },
    ],
  },
  {
    id: 'employ_6',
    category: 'employment',
    question: 'Do you have any work restrictions?',
    questionEs: '¿Tienes alguna restricción de trabajo?',
    type: 'multiple',
    options: [
      { id: 'physical', label: 'Physical limitations', labelEs: 'Limitaciones físicas' },
      { id: 'hours', label: 'Limited hours I can work', labelEs: 'Horario limitado' },
      { id: 'location', label: 'Location restrictions', labelEs: 'Restricciones de ubicación' },
      { id: 'legal', label: 'Legal/work authorization issues', labelEs: 'Problemas legales/autorización de trabajo' },
      { id: 'childcare', label: 'Childcare responsibilities', labelEs: 'Responsabilidades de cuidado de niños' },
      { id: 'none', label: 'No restrictions', labelEs: 'Sin restricciones' },
    ],
  },
  {
    id: 'employ_7',
    category: 'employment',
    question: 'What skills or certifications do you have?',
    questionEs: '¿Qué habilidades o certificaciones tienes?',
    type: 'multiple',
    options: [
      { id: 'computer', label: 'Computer/technology skills', labelEs: 'Habilidades de computación/tecnología' },
      { id: 'driving', label: 'Valid driver\'s license', labelEs: 'Licencia de conducir válida' },
      { id: 'forklift', label: 'Forklift certification', labelEs: 'Certificación de montacargas' },
      { id: 'food_handler', label: 'Food handler\'s card', labelEs: 'Tarjeta de manipulador de alimentos' },
      { id: 'cpr', label: 'CPR/First Aid', labelEs: 'RCP/Primeros auxilios' },
      { id: 'trade', label: 'Trade skills (plumbing, electrical, etc.)', labelEs: 'Habilidades de oficio (plomería, electricidad, etc.)' },
      { id: 'bilingual', label: 'Bilingual', labelEs: 'Bilingüe' },
      { id: 'none', label: 'None currently', labelEs: 'Ninguna actualmente' },
    ],
  },
  {
    id: 'employ_8',
    category: 'employment',
    question: 'Are you able to pass a background check?',
    questionEs: '¿Puedes pasar una verificación de antecedentes?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes', labelEs: 'Sí' },
      { id: 'no', label: 'No, I have a record', labelEs: 'No, tengo antecedentes' },
      { id: 'unsure', label: 'I\'m not sure', labelEs: 'No estoy seguro' },
      { id: 'expunged', label: 'I have a record but it may be expunged', labelEs: 'Tengo antecedentes pero pueden estar borrados' },
    ],
  },
  {
    id: 'employ_10',
    category: 'employment',
    question: 'Do you need job training or resume help?',
    questionEs: '¿Necesitas capacitación laboral o ayuda con tu currículum?',
    type: 'multiple',
    options: [
      { id: 'resume', label: 'Resume writing help', labelEs: 'Ayuda para escribir currículum' },
      { id: 'interview', label: 'Interview preparation', labelEs: 'Preparación para entrevistas' },
      { id: 'training', label: 'Job training programs', labelEs: 'Programas de capacitación laboral' },
      { id: 'computer', label: 'Computer skills training', labelEs: 'Capacitación en computación' },
      { id: 'english', label: 'English language classes', labelEs: 'Clases de inglés' },
      { id: 'none', label: 'No, I\'m ready to work', labelEs: 'No, estoy listo para trabajar' },
    ],
  },
];

export const housingQuestions: Question[] = [
  {
    id: 'housing_1',
    category: 'housing',
    question: 'What is your current living situation?',
    questionEs: '¿Cuál es tu situación de vivienda actual?',
    type: 'single',
    options: [
      { id: 'street', label: 'Living on the street/outdoors', labelEs: 'Viviendo en la calle/al aire libre' },
      { id: 'shelter', label: 'Staying in a shelter', labelEs: 'Quedándome en un refugio' },
      { id: 'vehicle', label: 'Living in a vehicle', labelEs: 'Viviendo en un vehículo' },
      { id: 'temp', label: 'Staying with friends/family temporarily', labelEs: 'Quedándome con amigos/familia temporalmente' },
      { id: 'hotel', label: 'Hotel/motel', labelEs: 'Hotel/motel' },
      { id: 'transitional', label: 'Transitional housing', labelEs: 'Vivienda de transición' },
    ],
  },
  {
    id: 'housing_2',
    category: 'housing',
    question: 'How long have you been without stable housing?',
    questionEs: '¿Cuánto tiempo llevas sin vivienda estable?',
    type: 'single',
    options: [
      { id: 'week', label: 'Less than a week', labelEs: 'Menos de una semana' },
      { id: 'month', label: 'Less than a month', labelEs: 'Menos de un mes' },
      { id: 'six_months', label: '1-6 months', labelEs: '1-6 meses' },
      { id: 'year', label: '6 months to 1 year', labelEs: '6 meses a 1 año' },
      { id: 'over_year', label: 'More than 1 year', labelEs: 'Más de 1 año' },
    ],
  },
  {
    id: 'housing_3',
    category: 'housing',
    question: 'Are you a veteran?',
    questionEs: '¿Eres veterano?',
    type: 'yesno',
  },
  {
    id: 'housing_4',
    category: 'housing',
    question: 'Do you have children staying with you?',
    questionEs: '¿Tienes hijos que se quedan contigo?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes', labelEs: 'Sí' },
      { id: 'no', label: 'No', labelEs: 'No' },
      { id: 'separated', label: 'Yes, but we\'re currently separated', labelEs: 'Sí, pero actualmente estamos separados' },
    ],
  },
  {
    id: 'housing_5',
    category: 'housing',
    question: 'Do you have pets?',
    questionEs: '¿Tienes mascotas?',
    type: 'single',
    options: [
      { id: 'dog', label: 'Yes, a dog', labelEs: 'Sí, un perro' },
      { id: 'cat', label: 'Yes, a cat', labelEs: 'Sí, un gato' },
      { id: 'other', label: 'Yes, other pet', labelEs: 'Sí, otra mascota' },
      { id: 'service', label: 'Yes, a service animal', labelEs: 'Sí, un animal de servicio' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'housing_6',
    category: 'housing',
    question: 'Do you have any source of income?',
    questionEs: '¿Tienes alguna fuente de ingresos?',
    type: 'multiple',
    options: [
      { id: 'job', label: 'Employment income', labelEs: 'Ingresos de empleo' },
      { id: 'ssi', label: 'SSI/SSDI', labelEs: 'SSI/SSDI' },
      { id: 'snap', label: 'SNAP/Food stamps', labelEs: 'SNAP/Cupones de alimentos' },
      { id: 'tanf', label: 'TANF/Cash assistance', labelEs: 'TANF/Asistencia en efectivo' },
      { id: 'va', label: 'VA benefits', labelEs: 'Beneficios de veterano' },
      { id: 'none', label: 'No income', labelEs: 'Sin ingresos' },
    ],
  },
  {
    id: 'housing_7',
    category: 'housing',
    question: 'Have you been evicted before?',
    questionEs: '¿Te han desalojado antes?',
    type: 'single',
    options: [
      { id: 'yes_recent', label: 'Yes, within the last 3 years', labelEs: 'Sí, en los últimos 3 años' },
      { id: 'yes_old', label: 'Yes, more than 3 years ago', labelEs: 'Sí, hace más de 3 años' },
      { id: 'no', label: 'No', labelEs: 'No' },
      { id: 'unsure', label: 'I\'m not sure', labelEs: 'No estoy seguro' },
    ],
  },
  {
    id: 'housing_8',
    category: 'housing',
    question: 'Do you have any housing vouchers?',
    questionEs: '¿Tienes algún vale de vivienda?',
    type: 'single',
    options: [
      { id: 'section8', label: 'Yes, Section 8', labelEs: 'Sí, Sección 8' },
      { id: 'vash', label: 'Yes, VASH (Veterans)', labelEs: 'Sí, VASH (Veteranos)' },
      { id: 'other', label: 'Yes, other voucher', labelEs: 'Sí, otro vale' },
      { id: 'waitlist', label: 'No, but I\'m on a waitlist', labelEs: 'No, pero estoy en lista de espera' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
  {
    id: 'housing_10',
    category: 'housing',
    question: 'Do you need ADA-accessible housing?',
    questionEs: '¿Necesitas vivienda accesible según ADA?',
    type: 'single',
    options: [
      { id: 'yes_wheelchair', label: 'Yes, wheelchair accessible', labelEs: 'Sí, accesible para silla de ruedas' },
      { id: 'yes_other', label: 'Yes, other accessibility needs', labelEs: 'Sí, otras necesidades de accesibilidad' },
      { id: 'no', label: 'No', labelEs: 'No' },
    ],
  },
];

export const getAllQuestions = (): Question[] => {
  return [...healthcareQuestions, ...employmentQuestions, ...housingQuestions];
};

export const getQuestionsByCategory = (category: 'healthcare' | 'employment' | 'housing'): Question[] => {
  switch (category) {
    case 'healthcare':
      return healthcareQuestions;
    case 'employment':
      return employmentQuestions;
    case 'housing':
      return housingQuestions;
    default:
      return [];
  }
};
