import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { sendMessageToAI, AIMessage } from '../../services/aiService';
import { YOUTH_HOTLINES, getYouthMessage } from '../../data/youthResources';
import { getStateYouthLaws, ABUSE_REPORTING_INFO, EMANCIPATION_INFO } from '../../data/youthLegalResources';
import { useScrollToTop } from '../../components/ScrollToTopButton';
import { LanguageToggle } from '../../components/LanguageToggle';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { openAI?: boolean } };
};

// ============================================
// INTELLIGENT AI CASE MANAGER ENGINE
// ============================================

// Intent patterns for natural language understanding
interface IntentPattern {
  intent: string;
  patterns: RegExp[];
  keywords: string[];
  priority: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Emergency/Crisis detection (highest priority)
  {
    intent: 'emergency',
    patterns: [
      /\b(emergency|crisis|danger|unsafe|hurt|abuse|violence|dying|suicide|kill)\b/i,
      /\b(emergencia|crisis|peligro|abuso|violencia|suicidio)\b/i,
    ],
    keywords: ['help now', 'urgent', 'emergency', 'danger', 'crisis', 'unsafe', 'hurt me', 'hitting', 'abuse'],
    priority: 100,
  },
  // Shelter/Housing needs
  {
    intent: 'shelter',
    patterns: [
      /\b(shelter|sleep|bed|overnight|stay|roof|homeless|street)\b/i,
      /\b(refugio|dormir|cama|quedarse|techo|calle)\b/i,
      /where.*(stay|sleep|go)/i,
      /need.*(place|shelter|bed)/i,
    ],
    keywords: ['shelter', 'sleep', 'bed', 'homeless', 'street', 'overnight', 'place to stay', 'nowhere to go'],
    priority: 80,
  },
  // Section 8 / Voucher housing
  {
    intent: 'section8',
    patterns: [
      /\b(section\s*8|voucher|hcv|public\s*housing|subsidized|affordable\s*housing)\b/i,
      /\b(sección\s*8|vivienda\s*pública|subsidio|vivienda\s*asequible)\b/i,
      /how.*(apply|get).*(housing|apartment|section)/i,
    ],
    keywords: ['section 8', 'voucher', 'public housing', 'affordable', 'subsidized', 'hud', 'waitlist'],
    priority: 75,
  },
  // Healthcare/Clinic needs
  {
    intent: 'clinic',
    patterns: [
      /\b(clinic|doctor|hospital|health|sick|medicine|medical|prescription|dental|teeth)\b/i,
      /\b(clínica|doctor|hospital|salud|enfermo|medicina|médico|dental|dientes)\b/i,
      /need.*(doctor|medical|health|see\s*someone)/i,
      /feel.*(sick|ill|bad|pain)/i,
    ],
    keywords: ['doctor', 'clinic', 'health', 'sick', 'medicine', 'hospital', 'dental', 'prescription', 'checkup'],
    priority: 70,
  },
  // Mental health
  {
    intent: 'mentalhealth',
    patterns: [
      /\b(depress|anxiety|mental|counseling|therapist|stress|overwhelm|sad|lonely)\b/i,
      /\b(depresión|ansiedad|mental|consejería|terapeuta|estrés|triste|solo)\b/i,
      /feel.*(sad|alone|depressed|anxious|stressed|overwhelmed)/i,
    ],
    keywords: ['depressed', 'anxiety', 'mental health', 'counseling', 'therapist', 'stressed', 'overwhelmed', 'sad'],
    priority: 75,
  },
  // Employment/Jobs
  {
    intent: 'job',
    patterns: [
      /\b(job|work|employ|hire|career|resume|interview|income)\b/i,
      /\b(trabajo|empleo|contratar|carrera|currículum|entrevista|ingreso)\b/i,
      /need.*(job|work|money|income)/i,
      /looking\s*for.*(job|work)/i,
    ],
    keywords: ['job', 'work', 'employment', 'hire', 'career', 'resume', 'interview', 'income'],
    priority: 65,
  },
  // Food assistance
  {
    intent: 'food',
    patterns: [
      /\b(food|hungry|eat|meal|pantry|snap|ebt|groceries)\b/i,
      /\b(comida|hambre|comer|despensa|snap|alimentos)\b/i,
      /need.*(food|eat|meal)/i,
    ],
    keywords: ['food', 'hungry', 'eat', 'meal', 'pantry', 'snap', 'ebt', 'groceries', 'food stamps'],
    priority: 70,
  },
  // Documents/ID
  {
    intent: 'documents',
    patterns: [
      /\b(id|identification|license|birth\s*certificate|social\s*security|passport|document)\b/i,
      /\b(identificación|licencia|acta.*nacimiento|seguro\s*social|pasaporte|documento)\b/i,
      /lost.*(id|document|license)/i,
      /need.*(id|document|license)/i,
    ],
    keywords: ['id', 'identification', 'license', 'birth certificate', 'social security', 'document', 'passport'],
    priority: 60,
  },
  // 211 / General resources
  {
    intent: '211',
    patterns: [
      /\b(211|resources|help|services|assistance)\b/i,
      /\b(recursos|ayuda|servicios|asistencia)\b/i,
      /what.*(help|services|resources)/i,
    ],
    keywords: ['211', 'resources', 'help', 'services', 'assistance', 'support'],
    priority: 50,
  },
  // Greeting
  {
    intent: 'greeting',
    patterns: [
      /^(hi|hello|hey|good\s*(morning|afternoon|evening)|hola|buenos?\s*(días?|tardes?|noches?))/i,
    ],
    keywords: ['hi', 'hello', 'hey', 'good morning', 'hola'],
    priority: 40,
  },
  // Thanks
  {
    intent: 'thanks',
    patterns: [
      /\b(thank|thanks|gracias|appreciate)\b/i,
    ],
    keywords: ['thank', 'thanks', 'gracias', 'appreciate'],
    priority: 30,
  },
  // How are you / small talk
  {
    intent: 'smalltalk',
    patterns: [
      /how\s*are\s*you/i,
      /what'?s?\s*up/i,
      /cómo\s*estás/i,
    ],
    keywords: ['how are you', 'whats up'],
    priority: 20,
  },
];

// Intelligent intent detection
const detectIntent = (message: string): { intent: string; confidence: number } => {
  const lowerMessage = message.toLowerCase().trim();
  let bestMatch = { intent: 'unknown', confidence: 0 };

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;

    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        score += 40;
        break;
      }
    }

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += 20;
      }
    }

    // Apply priority weighting
    score = score * (pattern.priority / 100);

    if (score > bestMatch.confidence) {
      bestMatch = { intent: pattern.intent, confidence: score };
    }
  }

  return bestMatch;
};

// Context-aware response generator
interface ConversationContext {
  lastIntent: string;
  messageCount: number;
  mentionedTopics: string[];
  userName?: string;
  userLocation?: string;
  userNeeds?: string[];
}

// AI Case Manager quick topics
const AI_TOPICS = [
  { id: 'shelter', label: 'Find Shelter', labelEs: 'Buscar Refugio', icon: '🏠', category: 'housing' },
  { id: 'section8', label: 'Apply Section 8', labelEs: 'Aplicar Sección 8', icon: '🏢', category: 'housing' },
  { id: 'clinic', label: 'Free Clinic', labelEs: 'Clínica Gratis', icon: '🏥', category: 'healthcare' },
  { id: 'mentalhealth', label: 'Mental Health', labelEs: 'Salud Mental', icon: '💚', category: 'healthcare' },
  { id: 'job', label: 'Find Jobs', labelEs: 'Buscar Trabajo', icon: '💼', category: 'employment' },
  { id: 'food', label: 'Food Help', labelEs: 'Ayuda Comida', icon: '🍽️', category: 'general' },
  { id: 'documents', label: 'Get ID/Docs', labelEs: 'Obtener ID', icon: '🪪', category: 'general' },
  { id: '211', label: 'Call 211', labelEs: 'Llamar 211', icon: '📞', category: 'general' },
];

// Suggested to-do items for each topic
const TOPIC_TODOS: Record<string, { en: string; es: string }[]> = {
  shelter: [
    { en: 'Call 211 for shelter info', es: 'Llamar al 211 para info de refugio' },
    { en: 'Visit local shelter before 5pm', es: 'Visitar refugio local antes de las 5pm' },
    { en: 'Call HUD Housing Counselor: 1-800-569-4287', es: 'Llamar Consejero HUD: 1-800-569-4287' },
  ],
  section8: [
    { en: 'Find your local PHA (Public Housing Authority)', es: 'Encontrar tu PHA local (Autoridad de Vivienda Pública)' },
    { en: 'Call 211 to check if waitlist is open', es: 'Llamar al 211 para verificar si la lista de espera está abierta' },
    { en: 'Gather documents: ID, Social Security, proof of income', es: 'Reunir documentos: ID, Seguro Social, prueba de ingresos' },
    { en: 'Submit application when waitlist opens', es: 'Enviar solicitud cuando la lista abra' },
    { en: 'Apply to multiple PHAs to increase chances', es: 'Aplicar a múltiples PHAs para aumentar oportunidades' },
  ],
  clinic: [
    { en: 'Call 211 for free clinics nearby', es: 'Llamar al 211 para clínicas gratis' },
    { en: 'Visit findahealthcenter.hrsa.gov', es: 'Visitar findahealthcenter.hrsa.gov' },
    { en: 'Gather documents for clinic visit', es: 'Reunir documentos para visita a clínica' },
  ],
  mentalhealth: [
    { en: 'Call 988 Suicide & Crisis Lifeline', es: 'Llamar al 988 Línea de Crisis' },
    { en: 'Text HOME to 741741 for crisis support', es: 'Enviar HOME al 741741 para apoyo' },
    { en: 'Find a community mental health center', es: 'Encontrar centro de salud mental comunitario' },
    { en: 'Ask about sliding-scale counseling', es: 'Preguntar sobre consejería con tarifa reducida' },
  ],
  job: [
    { en: 'Update resume at library', es: 'Actualizar currículum en biblioteca' },
    { en: 'Visit workforce development center', es: 'Visitar centro de desarrollo laboral' },
    { en: 'Search jobs on Indeed.com', es: 'Buscar trabajos en Indeed.com' },
  ],
  food: [
    { en: 'Call 211 for food banks', es: 'Llamar al 211 para bancos de comida' },
    { en: 'Apply for SNAP benefits', es: 'Aplicar para beneficios SNAP' },
    { en: 'Find local food pantry', es: 'Encontrar despensa de comida local' },
  ],
  documents: [
    { en: 'Contact vital records for birth certificate', es: 'Contactar registro civil para acta de nacimiento' },
    { en: 'Visit SSA.gov for Social Security card', es: 'Visitar SSA.gov para tarjeta de Seguro Social' },
    { en: 'Go to DMV for state ID', es: 'Ir al DMV para ID estatal' },
    { en: 'Ask 211 about free ID assistance programs', es: 'Preguntar al 211 sobre programas de asistencia para ID' },
  ],
  '211': [
    { en: 'Call 211 for resources', es: 'Llamar al 211 para recursos' },
    { en: 'Text ZIP code to 898-211', es: 'Enviar código postal al 898-211' },
  ],
  emergency: [
    { en: 'Call 911 for immediate danger', es: 'Llamar al 911 para peligro inmediato' },
    { en: 'Call 988 for mental health crisis', es: 'Llamar al 988 para crisis de salud mental' },
    { en: 'Call National DV Hotline: 1-800-799-7233', es: 'Llamar Línea de Violencia Doméstica: 1-800-799-7233' },
  ],
};

// ============================================
// INTELLIGENT RESPONSE GENERATOR
// ============================================

interface AIResponseContext {
  intent: string;
  isSpanish: boolean;
  userName?: string;
  userLocation?: string;
  messageCount: number;
  previousTopics: string[];
}

// Get time-appropriate greeting
const getTimeGreeting = (isSpanish: boolean): string => {
  const hour = new Date().getHours();
  if (hour < 12) return isSpanish ? 'Buenos días' : 'Good morning';
  if (hour < 18) return isSpanish ? 'Buenas tardes' : 'Good afternoon';
  return isSpanish ? 'Buenas noches' : 'Good evening';
};

// Empathetic response prefixes
const getEmpathyPrefix = (intent: string, isSpanish: boolean): string => {
  const prefixes: Record<string, { en: string[]; es: string[] }> = {
    shelter: {
      en: [
        "I understand finding a safe place to stay is urgent.",
        "Finding shelter is so important, and I'm here to help.",
        "Let me help you find somewhere safe to stay.",
      ],
      es: [
        "Entiendo que encontrar un lugar seguro es urgente.",
        "Encontrar refugio es muy importante, y estoy aquí para ayudarte.",
        "Déjame ayudarte a encontrar un lugar seguro.",
      ],
    },
    clinic: {
      en: [
        "Your health matters, and there are options even without insurance.",
        "I'm glad you're taking care of your health.",
        "Let me help you find affordable healthcare.",
      ],
      es: [
        "Tu salud importa, y hay opciones incluso sin seguro.",
        "Me alegra que cuides tu salud.",
        "Déjame ayudarte a encontrar atención médica accesible.",
      ],
    },
    mentalhealth: {
      en: [
        "I'm really glad you reached out. Your mental health matters.",
        "It takes courage to ask for help. You're not alone.",
        "Thank you for sharing. Let me connect you with support.",
      ],
      es: [
        "Me alegra mucho que hayas contactado. Tu salud mental importa.",
        "Se necesita valor para pedir ayuda. No estás solo/a.",
        "Gracias por compartir. Déjame conectarte con apoyo.",
      ],
    },
    food: {
      en: [
        "Everyone deserves to have enough to eat.",
        "There's no shame in needing food assistance.",
        "Let me help you find food resources.",
      ],
      es: [
        "Todos merecen tener suficiente para comer.",
        "No hay vergüenza en necesitar asistencia alimentaria.",
        "Déjame ayudarte a encontrar recursos de comida.",
      ],
    },
    job: {
      en: [
        "Finding work can be challenging, but there are resources.",
        "Let's work together to find job opportunities.",
        "There are programs that can help with employment.",
      ],
      es: [
        "Encontrar trabajo puede ser difícil, pero hay recursos.",
        "Trabajemos juntos para encontrar oportunidades de empleo.",
        "Hay programas que pueden ayudar con el empleo.",
      ],
    },
    emergency: {
      en: [
        "I'm here for you. Your safety is the priority right now.",
        "Thank you for reaching out. Let me connect you with immediate help.",
      ],
      es: [
        "Estoy aquí para ti. Tu seguridad es la prioridad ahora.",
        "Gracias por contactar. Déjame conectarte con ayuda inmediata.",
      ],
    },
  };

  const intentPrefixes = prefixes[intent];
  if (!intentPrefixes) return '';

  const options = isSpanish ? intentPrefixes.es : intentPrefixes.en;
  return options[Math.floor(Math.random() * options.length)] + '\n\n';
};

// Follow-up suggestions based on topic
const getFollowUpSuggestions = (intent: string, isSpanish: boolean): string[] => {
  const suggestions: Record<string, { en: string[]; es: string[] }> = {
    shelter: {
      en: ['Do you also need food?', 'Would you like help with IDs?', 'Need mental health support?'],
      es: ['¿También necesitas comida?', '¿Necesitas ayuda con identificación?', '¿Necesitas apoyo de salud mental?'],
    },
    clinic: {
      en: ['Need help with prescriptions?', 'Looking for mental health care?', 'Need dental care too?'],
      es: ['¿Necesitas ayuda con recetas?', '¿Buscas atención de salud mental?', '¿También necesitas atención dental?'],
    },
    mentalhealth: {
      en: ['Are you in a safe place?', 'Do you have someone to talk to?', 'Need help with basic needs too?'],
      es: ['¿Estás en un lugar seguro?', '¿Tienes a alguien con quien hablar?', '¿Necesitas ayuda con necesidades básicas?'],
    },
    job: {
      en: ['Need help with your resume?', 'Looking for job training?', 'Need work clothes?'],
      es: ['¿Necesitas ayuda con tu currículum?', '¿Buscas capacitación laboral?', '¿Necesitas ropa de trabajo?'],
    },
    food: {
      en: ['Do you need help with SNAP?', 'Need other resources too?', 'Looking for hot meals?'],
      es: ['¿Necesitas ayuda con SNAP?', '¿Necesitas otros recursos?', '¿Buscas comidas calientes?'],
    },
    section8: {
      en: ['Need help gathering documents?', 'Want to know about other housing?', 'Need shelter while you wait?'],
      es: ['¿Necesitas ayuda reuniendo documentos?', '¿Quieres saber sobre otra vivienda?', '¿Necesitas refugio mientras esperas?'],
    },
  };

  const intentSuggestions = suggestions[intent];
  return intentSuggestions ? (isSpanish ? intentSuggestions.es : intentSuggestions.en) : [];
};

// Main intelligent response generator
const generateAIResponse = (context: AIResponseContext): string => {
  const { intent, isSpanish, userName, userLocation, messageCount } = context;

  // Get empathetic prefix for first response on a topic
  const empathy = messageCount <= 2 ? getEmpathyPrefix(intent, isSpanish) : '';
  const locationStr = userLocation ? (isSpanish ? ` en ${userLocation}` : ` in ${userLocation}`) : '';
  const nameStr = userName || (isSpanish ? 'amigo/a' : 'friend');

  const responses: Record<string, { en: string; es: string }> = {
    emergency: {
      en: `🚨 ${empathy}If you're in immediate danger, please call 911 now.

📞 CRISIS RESOURCES (24/7):
• Emergency: 911
• Suicide & Crisis Lifeline: 988
• National DV Hotline: 1-800-799-7233
• Crisis Text Line: Text HOME to 741741

💚 You matter. Help is available right now.

What type of emergency are you experiencing? I can provide more specific resources.`,
      es: `🚨 ${empathy}Si estás en peligro inmediato, llama al 911 ahora.

📞 RECURSOS DE CRISIS (24/7):
• Emergencia: 911
• Línea de Crisis y Suicidio: 988
• Línea Nacional de VD: 1-800-799-7233
• Línea de Texto de Crisis: Envía HOLA al 741741

💚 Tú importas. La ayuda está disponible ahora mismo.

¿Qué tipo de emergencia estás experimentando? Puedo darte recursos más específicos.`,
    },
    shelter: {
      en: `${empathy}Here's how to find shelter${locationStr}:

📞 CALL NOW:
• 211 - Dial and press 6 for homeless services (24/7)
• HUD Housing Counselor: 1-800-569-4287

🏠 IN THIS APP:
Go to Housing tab → "Find Housing" to see shelters near you with hours and contact info.

⏰ IMPORTANT TIPS:
• Most shelters have check-in between 5-8pm
• Call ahead to reserve a bed
• Bring ID if you have it (not always required)
• Some shelters are gender-specific

💡 Can't get through? Text your ZIP code to 898-211 for a callback.

Would you like me to help with anything else?`,
      es: `${empathy}Así puedes encontrar refugio${locationStr}:

📞 LLAMA AHORA:
• 211 - Marca y presiona 6 para servicios de personas sin hogar (24/7)
• Consejero de Vivienda HUD: 1-800-569-4287

🏠 EN ESTA APP:
Ve a Vivienda → "Buscar Vivienda" para ver refugios cercanos con horarios y contacto.

⏰ CONSEJOS IMPORTANTES:
• La mayoría de refugios reciben entre 5-8pm
• Llama antes para reservar una cama
• Trae ID si tienes (no siempre requerido)
• Algunos refugios son por género

💡 ¿No puedes comunicarte? Envía tu código postal al 898-211.

¿Te puedo ayudar con algo más?`,
    },
    section8: {
      en: `${empathy}Here's how to apply for Section 8 (Housing Choice Voucher):

📋 STEP 1: Find Your Local PHA
• Visit hud.gov → search "PHA contact"
• Or call 211 to find your local office${locationStr}

📋 STEP 2: Check Waitlist Status
• Waitlists open periodically (varies by location)
• Some PHAs accept online pre-applications

📋 STEP 3: Gather Documents
✓ Photo ID for all adults
✓ Social Security cards for everyone
✓ Birth certificates
✓ Proof of income (last 3 months)
✓ Bank statements

📋 STEP 4: Apply
• Online, in person, or by mail
• Keep copies of everything!

💡 PRO TIP: Apply to MULTIPLE PHAs to increase your chances. Each county/city has its own waitlist.

📱 The Housing tab has detailed guides for each program!`,
      es: `${empathy}Así puedes aplicar para la Sección 8 (Vale de Vivienda):

📋 PASO 1: Encuentra Tu PHA Local
• Visita hud.gov → busca "contacto PHA"
• O llama al 211 para encontrar tu oficina${locationStr}

📋 PASO 2: Verifica Estado de Lista de Espera
• Las listas abren periódicamente (varía por ubicación)
• Algunos PHAs aceptan pre-aplicaciones en línea

📋 PASO 3: Reúne Documentos
✓ ID con foto para todos los adultos
✓ Tarjetas de Seguro Social para todos
✓ Actas de nacimiento
✓ Prueba de ingresos (últimos 3 meses)
✓ Estados de cuenta bancarios

📋 PASO 4: Aplica
• En línea, en persona, o por correo
• ¡Guarda copias de todo!

💡 CONSEJO: Aplica a MÚLTIPLES PHAs para aumentar tus oportunidades. Cada condado/ciudad tiene su propia lista.

📱 ¡La pestaña Vivienda tiene guías detalladas para cada programa!`,
    },
    clinic: {
      en: `${empathy}Here's how to get free or low-cost healthcare:

🏥 FEDERALLY QUALIFIED HEALTH CENTERS (FQHCs)
These serve EVERYONE regardless of ability to pay or insurance status.
• Visit: findahealthcenter.hrsa.gov
• Or call 211 for locations${locationStr}

💰 SLIDING SCALE FEES
Most community health centers charge based on your income - could be $0-$40 for a visit.

📱 IN THIS APP:
Go to Health tab → See clinics near you with hours, services, and contact info.

📋 WHAT TO BRING:
• ID (if you have it)
• Proof of income (for sliding scale)
• List of current medications
• Insurance card (if you have one)

🦷 NEED DENTAL?
Many FQHCs offer dental services too. Ask when you call.

💡 No ID? No insurance? You can still be seen!`,
      es: `${empathy}Así puedes obtener atención médica gratuita o de bajo costo:

🏥 CENTROS DE SALUD FEDERALMENTE CALIFICADOS (FQHCs)
Atienden a TODOS sin importar capacidad de pago o seguro.
• Visita: findahealthcenter.hrsa.gov
• O llama al 211 para ubicaciones${locationStr}

💰 TARIFAS SEGÚN INGRESOS
La mayoría de centros cobran según tus ingresos - puede ser $0-$40 por visita.

📱 EN ESTA APP:
Ve a Salud → Ve clínicas cercanas con horarios, servicios y contacto.

📋 QUÉ LLEVAR:
• ID (si tienes)
• Prueba de ingresos (para tarifa reducida)
• Lista de medicamentos actuales
• Tarjeta de seguro (si tienes)

🦷 ¿NECESITAS DENTAL?
Muchos FQHCs ofrecen servicios dentales. Pregunta al llamar.

💡 ¿Sin ID? ¿Sin seguro? ¡Igual te pueden atender!`,
    },
    mentalhealth: {
      en: `${empathy}💚 Your mental health matters. Here are free and low-cost options:

📞 24/7 CRISIS SUPPORT:
• 988 Suicide & Crisis Lifeline (call or text)
• Crisis Text Line: Text HOME to 741741
• SAMHSA Helpline: 1-800-662-4357

🏥 ONGOING CARE:
• Community Mental Health Centers offer sliding-scale therapy
• FQHCs often have behavioral health services
• Call 211 to find services${locationStr}

💻 FREE ONLINE RESOURCES:
• 7cups.com - Free online chat support
• Many apps offer free mood tracking and exercises

💡 TIPS:
• It's okay to ask for help
• If one resource doesn't fit, try another
• You can start with your primary care doctor

Remember: Healing isn't linear, and reaching out is a sign of strength. 💚`,
      es: `${empathy}💚 Tu salud mental importa. Aquí hay opciones gratuitas y de bajo costo:

📞 APOYO DE CRISIS 24/7:
• 988 Línea de Crisis y Suicidio (llama o envía texto)
• Línea de Texto de Crisis: Envía HOLA al 741741
• Línea SAMHSA: 1-800-662-4357

🏥 ATENCIÓN CONTINUA:
• Centros de Salud Mental Comunitarios ofrecen terapia con tarifa reducida
• Los FQHCs frecuentemente tienen servicios de salud mental
• Llama al 211 para encontrar servicios${locationStr}

💻 RECURSOS EN LÍNEA GRATUITOS:
• 7cups.com - Chat de apoyo gratuito
• Muchas apps ofrecen seguimiento del ánimo gratis

💡 CONSEJOS:
• Está bien pedir ayuda
• Si un recurso no funciona, prueba otro
• Puedes empezar con tu doctor de cabecera

Recuerda: La recuperación no es lineal, y pedir ayuda es una señal de fortaleza. 💚`,
    },
    job: {
      en: `${empathy}Here's how to find work:

💻 JOB SEARCH SITES:
• Indeed.com - Largest job board
• LinkedIn.com - Great for networking
• USAJobs.gov - Government jobs
• Snagajob.com - Hourly & part-time

📍 IN-PERSON RESOURCES:
• Workforce Development Centers${locationStr ? ` ${locationStr}` : ''} - Free career help
• Public libraries - Free resume help & computer access
• Goodwill Career Centers - Job training

⚡ QUICK-HIRE INDUSTRIES:
• Warehouse (Amazon, UPS, FedEx)
• Food service (restaurants, catering)
• Retail (Target, Walmart)
• Cleaning services
• Delivery (DoorDash, Instacart)

📝 TIPS:
• Libraries help with resumes for FREE
• Many employers don't require IDs upfront
• Apply to multiple places at once

Need help with your resume or interview prep? Ask me!`,
      es: `${empathy}Así puedes encontrar trabajo:

💻 SITIOS DE BÚSQUEDA DE EMPLEO:
• Indeed.com - La bolsa de trabajo más grande
• LinkedIn.com - Excelente para networking
• USAJobs.gov - Trabajos del gobierno
• Snagajob.com - Trabajos por hora

📍 RECURSOS EN PERSONA:
• Centros de Desarrollo Laboral${locationStr ? ` ${locationStr}` : ''} - Ayuda gratuita
• Bibliotecas públicas - Ayuda con currículum y computadoras gratis
• Centros de Carrera Goodwill - Capacitación laboral

⚡ INDUSTRIAS DE CONTRATACIÓN RÁPIDA:
• Almacén (Amazon, UPS, FedEx)
• Servicio de comida (restaurantes)
• Retail (Target, Walmart)
• Servicios de limpieza
• Entregas (DoorDash, Instacart)

📝 CONSEJOS:
• Las bibliotecas ayudan con currículos GRATIS
• Muchos empleadores no requieren ID al inicio
• Aplica a varios lugares a la vez

¿Necesitas ayuda con tu currículum o preparación para entrevistas? ¡Pregúntame!`,
    },
    food: {
      en: `${empathy}Here's how to get food assistance:

🍽️ IMMEDIATE FOOD HELP:
• Call 211 for food banks${locationStr}
• FeedingAmerica.org/find-your-local-foodbank
• Many churches serve free meals (especially weekends)

📋 SNAP (FOOD STAMPS):
• Apply at your local social services office
• Or online at your state's benefits website
• Can provide $200+ per month for groceries

🏪 FOOD PANTRIES:
• Usually NO ID or proof of income required
• Can visit multiple pantries in your area
• Call ahead for hours

🍲 FREE MEAL PROGRAMS:
• Salvation Army
• Community centers
• Many churches (call 211 for schedule)

💡 TIP: Don't be shy about using these resources - they exist because communities want to help. You deserve to eat.`,
      es: `${empathy}Así puedes obtener asistencia alimentaria:

🍽️ AYUDA INMEDIATA:
• Llama al 211 para bancos de comida${locationStr}
• FeedingAmerica.org/find-your-local-foodbank
• Muchas iglesias sirven comidas gratis

📋 SNAP (CUPONES DE COMIDA):
• Aplica en tu oficina local de servicios sociales
• O en línea en el sitio de beneficios de tu estado
• Puede dar $200+ al mes para alimentos

🏪 DESPENSAS DE COMIDA:
• Usualmente NO requieren ID ni prueba de ingresos
• Puedes visitar varias despensas en tu área
• Llama antes por los horarios

🍲 PROGRAMAS DE COMIDAS GRATIS:
• Ejército de Salvación
• Centros comunitarios
• Muchas iglesias (llama al 211 por horarios)

💡 CONSEJO: No tengas pena de usar estos recursos - existen porque la comunidad quiere ayudar. Mereces comer.`,
    },
    documents: {
      en: `${empathy}Here's how to get or replace important documents:

🪪 BIRTH CERTIFICATE:
• Contact vital records in your birth state
• Fee: Usually $10-30
• Can often order online at vitalchek.com

📋 SOCIAL SECURITY CARD:
• FREE at ssa.gov or local SSA office
• Need: Birth certificate or another ID
• Takes 2-4 weeks by mail

🚗 STATE ID / DRIVER'S LICENSE:
• Visit your local DMV
• Need: Proof of identity + address
• Fee varies by state ($10-35)

💡 FREE HELP:
• Call 211 - Many areas have ID assistance programs
• Some shelters help with document replacement
• Legal aid offices may help for free

📱 IN THIS APP:
Add these to your to-do list so you can track your progress!

Don't have ANY ID? Start with birth certificate, then SSN card, then state ID.`,
      es: `${empathy}Así puedes obtener o reemplazar documentos importantes:

🪪 ACTA DE NACIMIENTO:
• Contacta el registro civil del estado donde naciste
• Costo: Usualmente $10-30
• A veces puedes ordenar en línea

📋 TARJETA DE SEGURO SOCIAL:
• GRATIS en ssa.gov o oficina local de SSA
• Necesitas: Acta de nacimiento u otra ID
• Toma 2-4 semanas por correo

🚗 ID ESTATAL / LICENCIA:
• Visita tu DMV local
• Necesitas: Prueba de identidad + dirección
• Costo varía por estado ($10-35)

💡 AYUDA GRATUITA:
• Llama al 211 - Muchas áreas tienen programas de asistencia con ID
• Algunos refugios ayudan con documentos
• Oficinas de ayuda legal pueden ayudar gratis

📱 EN ESTA APP:
¡Agrega estos a tu lista de tareas para seguir tu progreso!

¿No tienes NINGUNA ID? Empieza con acta de nacimiento, luego tarjeta SSN, luego ID estatal.`,
    },
    '211': {
      en: `211 is your connection to local help - FREE and confidential, 24/7.

📞 HOW TO REACH 211:
• Dial 211 from any phone
• Text your ZIP code to 898-211
• Visit 211.org

🤝 THEY CAN HELP WITH:
• Emergency shelter
• Food assistance & food banks
• Utility bill help
• Healthcare resources
• Mental health services
• Job resources
• Childcare assistance
• Veteran services
• Senior services
• And much more!

💡 TIPS:
• Have your location ready (ZIP code helps)
• Ask about ALL your needs - they know many resources
• Ask for referrals if first option doesn't work
• Many areas have specialized 211 for specific needs

211 operators are trained to help - they're on your side!`,
      es: `211 es tu conexión con ayuda local - GRATIS y confidencial, 24/7.

📞 CÓMO CONTACTAR AL 211:
• Marca 211 desde cualquier teléfono
• Envía tu código postal al 898-211
• Visita 211.org

🤝 PUEDEN AYUDARTE CON:
• Refugio de emergencia
• Asistencia alimentaria
• Ayuda con facturas de servicios
• Recursos de salud
• Servicios de salud mental
• Recursos de empleo
• Asistencia con cuidado infantil
• Servicios para veteranos
• Servicios para adultos mayores
• ¡Y mucho más!

💡 CONSEJOS:
• Ten tu ubicación lista (código postal ayuda)
• Pregunta por TODAS tus necesidades
• Pide referencias si la primera opción no funciona
• Muchas áreas tienen 211 especializado

¡Los operadores de 211 están entrenados para ayudar - están de tu lado!`,
    },
    greeting: {
      en: `${getTimeGreeting(false)}, ${nameStr}! 👋

I'm your AI Case Manager, here to help you find resources for:

🏠 Housing & Shelter
🏥 Healthcare & Mental Health
💼 Jobs & Employment
🍽️ Food Assistance
🪪 IDs & Documents
📞 And more through 211

What can I help you with today? You can tap a topic below or just type your question.`,
      es: `¡${getTimeGreeting(true)}, ${nameStr}! 👋

Soy tu Gestor de Caso AI, aquí para ayudarte a encontrar recursos para:

🏠 Vivienda y Refugio
🏥 Salud y Salud Mental
💼 Trabajo y Empleo
🍽️ Asistencia Alimentaria
🪪 IDs y Documentos
📞 Y más a través del 211

¿En qué puedo ayudarte hoy? Puedes tocar un tema abajo o simplemente escribir tu pregunta.`,
    },
    thanks: {
      en: `You're welcome! 💚 I'm glad I could help.

Is there anything else you need assistance with? Remember, you can always:
• Tap the topic buttons for quick help
• Type any question
• Go to the Health or Housing tabs for more details

You've got this! I'm here whenever you need me.`,
      es: `¡De nada! 💚 Me alegra poder ayudarte.

¿Hay algo más en lo que pueda asistirte? Recuerda, siempre puedes:
• Tocar los botones de temas para ayuda rápida
• Escribir cualquier pregunta
• Ir a las pestañas de Salud o Vivienda para más detalles

¡Tú puedes! Estoy aquí cuando me necesites.`,
    },
    smalltalk: {
      en: `I'm doing well, thank you for asking! 😊

I'm here and ready to help you find resources. What's on your mind today?

You can ask me about housing, healthcare, jobs, food, documents, or anything else you need help with.`,
      es: `¡Estoy bien, gracias por preguntar! 😊

Estoy aquí y listo para ayudarte a encontrar recursos. ¿Qué tienes en mente hoy?

Puedes preguntarme sobre vivienda, salud, trabajo, comida, documentos, o cualquier otra cosa que necesites.`,
    },
    unknown: {
      en: `I want to make sure I help you with the right information.

Could you tell me more about what you're looking for? For example:
• "I need a place to sleep tonight"
• "Where can I see a doctor for free?"
• "How do I get food stamps?"
• "I lost my ID"

Or tap one of the topic buttons below!`,
      es: `Quiero asegurarme de darte la información correcta.

¿Puedes contarme más sobre lo que buscas? Por ejemplo:
• "Necesito un lugar para dormir esta noche"
• "¿Dónde puedo ver un doctor gratis?"
• "¿Cómo obtengo cupones de comida?"
• "Perdí mi ID"

¡O toca uno de los botones de tema abajo!`,
    },
  };

  const response = responses[intent] || responses.unknown;
  return isSpanish ? response.es : response.en;
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'typing';
  content: string;
  topicId?: string; // Track which topic this response is for
  followUpSuggestions?: string[];
}

// Typing Indicator Component
const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const translateY = (dot: Animated.Value) =>
    dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    });

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: translateY(dot1) }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: translateY(dot2) }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: translateY(dot3) }] }]} />
      </View>
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  bubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
  },
});

/**
 * LinkableText Component
 * Parses text and makes URLs, phone numbers clickable
 */
interface LinkableTextProps {
  text: string;
  style?: any;
  linkColor?: string;
}

const LinkableText: React.FC<LinkableTextProps> = ({ text, style, linkColor = '#7C3AED' }) => {
  // Parse the text into segments with URLs and phone numbers
  const parseText = (input: string): Array<{ type: 'text' | 'url' | 'phone'; value: string }> => {
    const segments: Array<{ type: 'text' | 'url' | 'phone'; value: string }> = [];

    // Pattern to match URLs (with and without http)
    const urlPattern = /https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
    // Pattern for phone numbers (avoiding lookbehind for Hermes compatibility)
    const phonePattern = /\b(?:1-)?(?:\d{3}[-.]?)?\d{3}[-.]?\d{4}\b|\b(?:211|988|911|741741)\b/g;

    // Combined pattern for both URLs and phone numbers
    const combinedPattern = new RegExp(
      `(${urlPattern.source})|(${phonePattern.source})`,
      'gi'
    );

    let lastIndex = 0;
    let match;

    while ((match = combinedPattern.exec(input)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: input.slice(lastIndex, match.index) });
      }

      // Determine if it's a URL or phone
      const matchedValue = match[0];
      if (/^(https?:\/\/|www\.|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/i.test(matchedValue)) {
        segments.push({ type: 'url', value: matchedValue });
      } else {
        segments.push({ type: 'phone', value: matchedValue });
      }

      lastIndex = match.index + matchedValue.length;
    }

    // Add remaining text
    if (lastIndex < input.length) {
      segments.push({ type: 'text', value: input.slice(lastIndex) });
    }

    return segments;
  };

  const handleLinkPress = async (type: 'url' | 'phone', value: string) => {
    try {
      if (type === 'url') {
        // Add https:// if not present
        let url = value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        await Linking.openURL(url);
      } else {
        // Phone number
        const cleanNumber = value.replace(/[^\d]/g, '');
        await Linking.openURL(`tel:${cleanNumber}`);
      }
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  const segments = parseText(text);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Text key={index}>{segment.value}</Text>;
        } else {
          return (
            <Text
              key={index}
              style={{ color: linkColor, textDecorationLine: 'underline' }}
              onPress={() => handleLinkPress(segment.type, segment.value)}
            >
              {segment.value}
            </Text>
          );
        }
      })}
    </Text>
  );
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [showAI, setShowAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [editingTodoDescription, setEditingTodoDescription] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [youthTab, setYouthTab] = useState<'hotlines' | 'laws' | 'abuse'>('hotlines');
  const [youthBannerExpanded, setYouthBannerExpanded] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    lastIntent: '',
    messageCount: 0,
    mentionedTopics: [],
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const { button: scrollToTopButton, handleScroll } = useScrollToTop(mainScrollRef);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;
  const categories = userProfile?.selectedCategories || [];

  // Auto-open the AI modal when navigated to from a FloatingAIButton
  // on any screen (route params carry openAI=true).
  useEffect(() => {
    if (route?.params?.openAI) {
      setShowAI(true);
      navigation.setParams?.({ openAI: false } as never);
    }
  }, [route?.params?.openAI]);

  const handleAITopic = async (topicId: string) => {
    const topic = AI_TOPICS.find((t) => t.id === topicId);
    if (!topic) return;

    setCurrentTopic(topicId);

    // Create a natural message for the topic
    const topicMessages: Record<string, { en: string; es: string }> = {
      shelter: { en: 'I need help finding a shelter', es: 'Necesito ayuda para encontrar un refugio' },
      section8: { en: 'How do I apply for Section 8 housing?', es: '¿Cómo puedo aplicar para vivienda Sección 8?' },
      clinic: { en: 'I need to find a free or low-cost clinic', es: 'Necesito encontrar una clínica gratis o de bajo costo' },
      mentalhealth: { en: 'I need mental health support', es: 'Necesito apoyo de salud mental' },
      job: { en: 'I need help finding a job', es: 'Necesito ayuda para encontrar trabajo' },
      food: { en: 'I need help getting food', es: 'Necesito ayuda para conseguir comida' },
      documents: { en: 'I need help getting ID or documents', es: 'Necesito ayuda para obtener identificación o documentos' },
      '211': { en: 'What resources are available through 211?', es: '¿Qué recursos están disponibles a través del 211?' },
    };

    const messageText = topicMessages[topicId]
      ? (isSpanish ? topicMessages[topicId].es : topicMessages[topicId].en)
      : (isSpanish ? topic.labelEs : topic.label);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
    };

    // Add user message and show typing indicator
    setChatMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build conversation history for AI context
      const aiHistory: AIMessage[] = chatMessages
        .filter(msg => msg.type === 'user' || msg.type === 'ai')
        .slice(-6)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'model' as const,
          content: msg.content,
        }));

      // Call the real Groq AI
      const responseContent = await sendMessageToAI(
        messageText,
        aiHistory,
        {
          name: userProfile?.name,
          city: userProfile?.location?.city,
          state: userProfile?.location?.state,
          language: isSpanish ? 'es' : 'en',
          ageGroup: userProfile?.ageGroup,
          isMinor: userProfile?.ageGroup === 'under18',
        }
      );

      setIsTyping(false);

      // Update conversation context
      const newContext: ConversationContext = {
        lastIntent: topicId,
        messageCount: conversationContext.messageCount + 1,
        mentionedTopics: [...new Set([...conversationContext.mentionedTopics, topicId])],
        userName: userProfile?.name,
        userLocation: userProfile?.location?.city,
      };
      setConversationContext(newContext);

      const followUps = getFollowUpSuggestions(topicId, isSpanish);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: responseContent,
        topicId: topicId,
        followUpSuggestions: followUps.length > 0 ? followUps : undefined,
      };

      setChatMessages(prev => [...prev, aiResponse]);

      // Scroll to bottom after AI responds
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);

      // Fallback to local response if Groq fails
      const responseContent = generateAIResponse({
        intent: topicId,
        isSpanish,
        userName: userProfile?.name,
        userLocation: userProfile?.location?.city,
        messageCount: conversationContext.messageCount + 1,
        previousTopics: conversationContext.mentionedTopics,
      });

      const followUps = getFollowUpSuggestions(topicId, isSpanish);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: responseContent,
        topicId: topicId,
        followUpSuggestions: followUps.length > 0 ? followUps : undefined,
      };

      setChatMessages(prev => [...prev, aiResponse]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleAddTodo = (title: string, description?: string) => {
    if (!title.trim()) return;

    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: title.trim(),
        description: description?.trim() || undefined,
        completed: false,
        category: currentTopic as any || 'general',
      },
    });

    setNewTodoDescription('');
    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish ? 'Tarea agregada a tu lista' : 'Task added to your to-do list',
      [{ text: 'OK' }]
    );
  };

  const handleSaveTodoDescription = () => {
    if (!selectedTodo) return;
    dispatch({
      type: 'UPDATE_TODO_DESCRIPTION',
      payload: {
        todoId: selectedTodo.id,
        description: editingTodoDescription.trim(),
      },
    });
    setSelectedTodo(null);
    setEditingTodoDescription('');
  };

  const handleQuickAddTodo = (todo: { en: string; es: string }) => {
    handleAddTodo(isSpanish ? todo.es : todo.en);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const messageText = userInput.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
    };

    // Add user message and show typing indicator
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Use intelligent intent detection for follow-up suggestions
    const { intent, confidence } = detectIntent(messageText);
    const detectedIntent = confidence > 15 ? intent : 'unknown';

    try {
      // Build conversation history for AI context
      const aiHistory: AIMessage[] = chatMessages
        .filter(msg => msg.type === 'user' || msg.type === 'ai')
        .slice(-6) // Keep last 6 messages for context
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'model' as const,
          content: msg.content,
        }));

      // Call the real AI
      const responseContent = await sendMessageToAI(
        messageText,
        aiHistory,
        {
          name: userProfile?.name,
          city: userProfile?.location?.city,
          state: userProfile?.location?.state,
          language: isSpanish ? 'es' : 'en',
          ageGroup: userProfile?.ageGroup,
          isMinor: userProfile?.ageGroup === 'under18',
        }
      );

      setIsTyping(false);
      setCurrentTopic(detectedIntent !== 'unknown' ? detectedIntent : null);

      // Update conversation context
      const newContext: ConversationContext = {
        lastIntent: detectedIntent,
        messageCount: conversationContext.messageCount + 1,
        mentionedTopics: detectedIntent !== 'unknown' && detectedIntent !== 'greeting' && detectedIntent !== 'thanks' && detectedIntent !== 'smalltalk'
          ? [...new Set([...conversationContext.mentionedTopics, detectedIntent])]
          : conversationContext.mentionedTopics,
        userName: userProfile?.name,
        userLocation: userProfile?.location?.city,
      };
      setConversationContext(newContext);

      const followUps = getFollowUpSuggestions(detectedIntent, isSpanish);

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: responseContent,
        topicId: detectedIntent !== 'unknown' && detectedIntent !== 'greeting' && detectedIntent !== 'thanks' && detectedIntent !== 'smalltalk'
          ? detectedIntent
          : undefined,
        followUpSuggestions: followUps.length > 0 ? followUps : undefined,
      };

      setChatMessages(prev => [...prev, aiResponse]);

      // Scroll to bottom after AI responds
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);

      // Fallback to local response on error
      const fallbackResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: isSpanish
          ? 'Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta de nuevo o llama al 211 para ayuda inmediata.'
          : 'Sorry, I had trouble processing your message. Please try again or call 211 for immediate help.',
      };
      setChatMessages(prev => [...prev, fallbackResponse]);
    }
  };

  const renderCategoryGrid = () => {
    const allCategories = [
      { id: 'healthcare', icon: '🏥', label: 'Health', labelEs: 'Salud', color: '#F0FDFA', iconBg: '#CCFBF1', screen: 'Health' },
      { id: 'employment', icon: '💼', label: 'Jobs', labelEs: 'Empleo', color: '#FFF7ED', iconBg: '#FFEDD5', screen: 'Jobs' },
      { id: 'housing', icon: '🏠', label: 'Housing', labelEs: 'Vivienda', color: '#F5F3FF', iconBg: '#EDE9FE', screen: 'Housing' },
    ];

    // Filter to show only selected categories, but always show AI
    const displayCategories = allCategories.filter((cat) => categories.includes(cat.id as any));

    return (
      <View style={styles.categoryGrid}>
        {displayCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: category.color }]}
            onPress={() => navigation.navigate(category.screen)}
          >
            <View style={[styles.categoryIconContainer, { backgroundColor: category.iconBg }]}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
            </View>
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryLabel}>
                {isSpanish ? category.labelEs : category.label}
              </Text>
            </View>
            <Text style={styles.categoryChevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* My Case Manager - at end */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.caseManagerCard]}
          onPress={() => navigation.navigate('CaseManager')}
        >
          <View style={[styles.categoryIconContainer, { backgroundColor: '#E0F2FE' }]}>
            <Text style={styles.categoryIcon}>👤</Text>
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={styles.categoryLabel}>
              {isSpanish ? 'Mi Gestor' : 'My Case Manager'}
            </Text>
            <Text style={styles.categorySubLabel}>
              {isSpanish ? 'Conectar y colaborar' : 'Connect & collaborate'}
            </Text>
          </View>
          <Text style={styles.categoryChevron}>›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTodos = () => {
    const todos = userProfile?.todos || [];
    const pendingTodos = todos.filter((t) => !t.completed);
    const completedCount = todos.filter((t) => t.completed).length;

    // Group pending todos by category so long lists are scannable
    const groups: Record<string, typeof pendingTodos> = {};
    pendingTodos.forEach((t) => {
      const key = t.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const groupMeta: Record<string, { label: string; labelEs: string; icon: string }> = {
      healthcare: { label: 'Health', labelEs: 'Salud', icon: '🏥' },
      housing: { label: 'Housing', labelEs: 'Vivienda', icon: '🏠' },
      employment: { label: 'Jobs', labelEs: 'Empleo', icon: '💼' },
      documents: { label: 'Documents', labelEs: 'Documentos', icon: '🪪' },
      benefits: { label: 'Benefits', labelEs: 'Beneficios', icon: '💵' },
      education: { label: 'Education', labelEs: 'Educación', icon: '🎓' },
      other: { label: 'Other', labelEs: 'Otros', icon: '📋' },
    };
    const groupOrder = ['healthcare', 'housing', 'employment', 'documents', 'benefits', 'education', 'other'];

    return (
      <View style={styles.todosSection}>
        <View style={styles.todoHeader}>
          <View>
            <Text style={styles.todoHeaderTitle}>
              {isSpanish ? 'Mi Lista de Tareas' : 'My To-Do List'}
            </Text>
            <Text style={styles.todoHeaderSubtitle}>
              {pendingTodos.length > 0
                ? (isSpanish ? `${pendingTodos.length} pendiente${pendingTodos.length > 1 ? 's' : ''}` : `${pendingTodos.length} pending`)
                : (isSpanish ? '¡Todo hecho!' : 'All done!')}
              {completedCount > 0 && ` • ${completedCount} ${isSpanish ? 'completado' : 'done'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addTodoButton}
            onPress={() => setShowAddTodo(true)}
          >
            <Text style={styles.addTodoButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {pendingTodos.length === 0 ? (
          <View style={styles.emptyTodos}>
            <Text style={styles.emptyTodosEmoji}>✨</Text>
            <Text style={styles.emptyTodosText}>
              {isSpanish
                ? 'Usa el AI Case Manager para agregar tareas'
                : 'Use AI Case Manager to add tasks'}
            </Text>
          </View>
        ) : (
          <>
            {groupOrder.flatMap((groupKey) => {
              const items = groups[groupKey];
              if (!items || items.length === 0) return [];
              const meta = groupMeta[groupKey] || groupMeta.other;
              return [
                <View key={`group-${groupKey}`} style={styles.todoGroupHeader}>
                  <Text style={styles.todoGroupIcon}>{meta.icon}</Text>
                  <Text style={styles.todoGroupLabel}>
                    {isSpanish ? meta.labelEs : meta.label}
                  </Text>
                  <Text style={styles.todoGroupCount}>{items.length}</Text>
                </View>,
                ...items.map((todo) => (
              <View key={todo.id} style={styles.todoItemContainer}>
                <TouchableOpacity
                  style={styles.todoItem}
                  onPress={() => {
                    setSelectedTodo(todo);
                    setEditingTodoDescription(todo.description || '');
                  }}
                >
                  <TouchableOpacity
                    style={styles.todoCheckbox}
                    onPress={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
                  >
                    <Text style={styles.todoCheckmark}></Text>
                  </TouchableOpacity>
                  <View style={styles.todoContent}>
                    <Text style={styles.todoText}>{todo.title}</Text>
                    {todo.description && (
                      <Text style={styles.todoDescriptionPreview} numberOfLines={1}>
                        📝 {todo.description}
                      </Text>
                    )}
                    {/* Resource type badge */}
                    {todo.resourceType && (
                      <View style={[
                        styles.todoResourceBadge,
                        todo.resourceType === 'job' && { backgroundColor: '#FFF7ED' },
                        todo.resourceType === 'housing' && { backgroundColor: '#F5F3FF' },
                        todo.resourceType === 'clinic' && { backgroundColor: '#F0FDFA' },
                      ]}>
                        <Text style={[
                          styles.todoResourceBadgeText,
                          todo.resourceType === 'job' && { color: '#EA580C' },
                          todo.resourceType === 'housing' && { color: '#7C3AED' },
                          todo.resourceType === 'clinic' && { color: '#0D9488' },
                        ]}>
                          {todo.resourceType === 'job' ? '💼' : todo.resourceType === 'housing' ? '🏠' : '🏥'}
                          {' '}
                          {todo.resourceType === 'job'
                            ? (isSpanish ? 'Empleo' : 'Job')
                            : todo.resourceType === 'housing'
                              ? (isSpanish ? 'Vivienda' : 'Housing')
                              : (isSpanish ? 'Salud' : 'Health')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.todoDeleteButton}
                    onPress={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}
                  >
                  <Text style={styles.todoDeleteText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Action buttons for linked resources */}
              {(todo.resourceUrl || todo.resourcePhone) && (
                <View style={styles.todoActions}>
                  {todo.resourcePhone && (
                    <TouchableOpacity
                      style={styles.todoActionButton}
                      onPress={() => Linking.openURL(`tel:${todo.resourcePhone}`)}
                    >
                      <Text style={styles.todoActionButtonText}>
                        📞 {isSpanish ? 'Llamar' : 'Call'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {todo.resourceUrl && (
                    <TouchableOpacity
                      style={[styles.todoActionButton, styles.todoActionButtonPrimary]}
                      onPress={() => Linking.openURL(todo.resourceUrl!)}
                    >
                      <Text style={styles.todoActionButtonTextPrimary}>
                        🌐 {isSpanish ? 'Ir al sitio' : 'Go to site'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
                )),
              ];
            })}
          </>
        )}
      </View>
    );
  };

  const renderAddTodoModal = () => (
    <Modal visible={showAddTodo} animationType="slide" transparent>
      <View style={styles.addTodoOverlay}>
        <View style={styles.addTodoModal}>
          <View style={styles.addTodoHeader}>
            <Text style={styles.addTodoTitle}>
              {isSpanish ? 'Nueva Tarea' : 'New Task'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddTodo(false);
              setNewTodoText('');
              setNewTodoDescription('');
            }}>
              <Text style={styles.addTodoClose}>×</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.addTodoInput}
            value={newTodoText}
            onChangeText={setNewTodoText}
            placeholder={isSpanish ? 'Escribe tu tarea...' : 'Enter your task...'}
            placeholderTextColor="#94A3B8"
            autoFocus
          />
          <TextInput
            style={styles.addTodoDescriptionInput}
            value={newTodoDescription}
            onChangeText={setNewTodoDescription}
            placeholder={isSpanish ? 'Descripción (opcional)...' : 'Description (optional)...'}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.addTodoSubmit,
              !newTodoText.trim() && styles.addTodoSubmitDisabled,
            ]}
            onPress={() => {
              if (newTodoText.trim()) {
                handleAddTodo(newTodoText, newTodoDescription);
                setNewTodoText('');
                setNewTodoDescription('');
                setShowAddTodo(false);
              }
            }}
            disabled={!newTodoText.trim()}
          >
            <Text style={styles.addTodoSubmitText}>
              {isSpanish ? 'Agregar' : 'Add Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderTodoDetailModal = () => (
    <Modal visible={!!selectedTodo} animationType="slide" transparent>
      <View style={styles.addTodoOverlay}>
        <View style={styles.addTodoModal}>
          <View style={styles.addTodoHeader}>
            <Text style={styles.addTodoTitle}>
              {isSpanish ? 'Detalle de Tarea' : 'Task Detail'}
            </Text>
            <TouchableOpacity onPress={() => {
              setSelectedTodo(null);
              setEditingTodoDescription('');
            }}>
              <Text style={styles.addTodoClose}>×</Text>
            </TouchableOpacity>
          </View>

          {selectedTodo && (
            <>
              <Text style={styles.todoDetailTitle}>{selectedTodo.title}</Text>

              <Text style={styles.todoDetailLabel}>
                {isSpanish ? 'Descripción / Notas' : 'Description / Notes'}
              </Text>
              <TextInput
                style={styles.todoDetailDescriptionInput}
                value={editingTodoDescription}
                onChangeText={setEditingTodoDescription}
                placeholder={isSpanish ? 'Agregar notas...' : 'Add notes...'}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.todoDetailButtons}>
                <TouchableOpacity
                  style={styles.todoDetailSecondaryButton}
                  onPress={() => {
                    dispatch({ type: 'TOGGLE_TODO', payload: selectedTodo.id });
                    setSelectedTodo(null);
                  }}
                >
                  <Text style={styles.todoDetailSecondaryButtonText}>
                    {selectedTodo.completed
                      ? (isSpanish ? 'Marcar Pendiente' : 'Mark Pending')
                      : (isSpanish ? 'Completar' : 'Complete')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.todoDetailPrimaryButton}
                  onPress={handleSaveTodoDescription}
                >
                  <Text style={styles.todoDetailPrimaryButtonText}>
                    {isSpanish ? 'Guardar' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const handleCloseAI = () => {
    setShowAI(false);
    setChatMessages([]);
    setCurrentTopic(null);
    setIsTyping(false);
    setConversationContext({
      lastIntent: '',
      messageCount: 0,
      mentionedTopics: [],
    });
  };

  const renderAIModal = () => (
    <Modal visible={showAI} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.aiContainer}>
        <View style={styles.aiHeader}>
          <TouchableOpacity onPress={handleCloseAI} style={styles.aiCloseButton}>
            <Text style={styles.aiCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.aiTitleContainer}>
            <Text style={styles.aiTitle}>🤖 {isSpanish ? 'AI Gestor de Caso' : 'AI Case Manager'}</Text>
            <Text style={styles.aiSubtitle}>{isSpanish ? 'Tu asistente inteligente' : 'Your intelligent assistant'}</Text>
          </View>
          <View style={styles.aiSpacer} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.aiContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length === 0 && !isTyping ? (
            <View style={styles.aiWelcome}>
              <Text style={styles.aiWelcomeEmoji}>👋</Text>
              <Text style={styles.aiWelcomeTitle}>
                {isSpanish ? `¡Hola${userProfile?.name ? `, ${userProfile.name}` : ''}!` : `Hi${userProfile?.name ? `, ${userProfile.name}` : ''}!`}
              </Text>
              <Text style={styles.aiWelcomeSubtitle}>
                {isSpanish ? 'Soy tu AI Gestor de Caso. Puedo ayudarte a encontrar recursos para vivienda, salud, empleo, y más. ¿Qué necesitas hoy?' : "I'm your AI Case Manager. I can help you find resources for housing, healthcare, jobs, and more. What do you need today?"}
              </Text>

              <View style={styles.aiTopicsGrid}>
                {AI_TOPICS.map((topic) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={styles.aiTopicCard}
                    onPress={() => handleAITopic(topic.id)}
                    disabled={isTyping}
                  >
                    <Text style={styles.aiTopicIcon}>{topic.icon}</Text>
                    <Text style={styles.aiTopicLabel}>
                      {isSpanish ? topic.labelEs : topic.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.aiTipContainer}>
                <Text style={styles.aiTipText}>
                  💡 {isSpanish ? 'Consejo: También puedes escribir tu pregunta en tus propias palabras abajo' : 'Tip: You can also type your question in your own words below'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.chatContainer}>
              {chatMessages.map((message, index) => (
                <View key={message.id}>
                  <View
                    style={[
                      styles.chatBubble,
                      message.type === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    {message.type === 'ai' ? (
                      <LinkableText
                        text={message.content}
                        style={[styles.chatText, styles.aiText]}
                        linkColor="#7C3AED"
                      />
                    ) : (
                      <Text
                        style={[styles.chatText, styles.userText]}
                      >
                        {message.content}
                      </Text>
                    )}
                  </View>

                  {/* Show follow-up suggestions after AI responses */}
                  {message.type === 'ai' && message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
                    <View style={styles.followUpContainer}>
                      <Text style={styles.followUpTitle}>
                        {isSpanish ? '¿También necesitas?' : 'Also need help with?'}
                      </Text>
                      <View style={styles.followUpRow}>
                        {message.followUpSuggestions.map((suggestion, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.followUpChip}
                            onPress={() => {
                              setUserInput(suggestion);
                              handleSendMessage();
                            }}
                            disabled={isTyping}
                          >
                            <Text style={styles.followUpText}>{suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Show todo suggestions after AI responses */}
                  {message.type === 'ai' && message.topicId && TOPIC_TODOS[message.topicId] && (
                    <View style={styles.todoSuggestionsContainer}>
                      <Text style={styles.todoSuggestionsTitle}>
                        📝 {isSpanish ? 'Agregar a tu lista:' : 'Add to your to-do list:'}
                      </Text>
                      <View style={styles.todoSuggestions}>
                        {TOPIC_TODOS[message.topicId].slice(0, 3).map((todo, todoIndex) => (
                          <TouchableOpacity
                            key={todoIndex}
                            style={styles.todoSuggestionChip}
                            onPress={() => handleQuickAddTodo(todo)}
                          >
                            <Text style={styles.todoSuggestionText}>
                              + {isSpanish ? todo.es : todo.en}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {/* Typing Indicator */}
              {isTyping && <TypingIndicator />}

              {/* Quick topics after conversation */}
              {!isTyping && (
                <>
                  <Text style={styles.moreTopicsLabel}>
                    {isSpanish ? '¿Más preguntas?' : 'More questions?'}
                  </Text>
                  <View style={styles.quickTopicsRow}>
                    {AI_TOPICS.map((topic) => (
                      <TouchableOpacity
                        key={topic.id}
                        style={styles.quickTopicChip}
                        onPress={() => handleAITopic(topic.id)}
                        disabled={isTyping}
                      >
                        <Text style={styles.quickTopicText}>
                          {topic.icon} {isSpanish ? topic.labelEs : topic.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.aiInputContainer}>
            <TextInput
              style={styles.aiInput}
              value={userInput}
              onChangeText={setUserInput}
              placeholder={isSpanish ? 'Pregunta lo que quieras...' : 'Ask me anything...'}
              placeholderTextColor="#94A3B8"
              multiline
              onSubmitEditing={handleSendMessage}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[styles.aiSendButton, isTyping && styles.aiSendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={isTyping || !userInput.trim()}
            >
              <Text style={styles.aiSendText}>{isTyping ? '...' : '→'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        ref={mainScrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {isSpanish ? '¡Hola' : 'Hello'}, {userProfile?.name || 'Friend'}! 👋
            </Text>
            <Text style={styles.subtitle}>
              {isSpanish ? 'Tus recursos personalizados' : 'Your personalized resources'}
            </Text>
          </View>
          <LanguageToggle />
        </View>

        {/* Revisit the post-intake summary carousel */}
        <TouchableOpacity
          style={styles.revisitSummary}
          onPress={() => navigation.navigate('IntakeSummary')}
          activeOpacity={0.8}
        >
          <Text style={styles.revisitSummaryIcon}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.revisitSummaryTitle}>
              {isSpanish ? 'Ver tu resumen' : 'See your summary'}
            </Text>
            <Text style={styles.revisitSummarySubtitle}>
              {isSpanish
                ? 'Repasa lo que nos dijiste y tus próximos pasos.'
                : 'Review what you told us and your next steps.'}
            </Text>
          </View>
          <Text style={styles.revisitSummaryArrow}>›</Text>
        </TouchableOpacity>

        {/* Category Grid */}
        <Text style={styles.sectionHeader}>
          {isSpanish ? 'Explorar Recursos' : 'Explore Resources'}
        </Text>
        {renderCategoryGrid()}

        {/* Todos */}
        {renderTodos()}

        {/* Youth Support Banner - for users under 18 (collapsed by default) */}
        {userProfile?.ageGroup === 'under18' && (() => {
          const stateCode = userProfile?.location?.state || '';
          const stateLaws = getStateYouthLaws(stateCode);

          return (
            <View style={styles.youthBanner}>
              <TouchableOpacity
                style={styles.youthBannerHeader}
                onPress={() => setYouthBannerExpanded(!youthBannerExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.youthBannerEmoji}>💚</Text>
                <Text style={[styles.youthBannerTitle, { flex: 1 }]}>
                  {isSpanish ? 'Apoyo para Jóvenes' : 'Youth Support'}
                </Text>
                <Text style={styles.youthBannerChevron}>
                  {youthBannerExpanded ? '▾' : '▸'}
                </Text>
              </TouchableOpacity>

              {youthBannerExpanded && (
              <>
              <Text style={styles.youthBannerText}>
                {isSpanish
                  ? 'No estás solo/a. Tenemos recursos especiales para ti.'
                  : "You're not alone. We have special resources for you."}
              </Text>

              {/* Tab Selector */}
              <View style={styles.youthTabSelector}>
                <TouchableOpacity
                  style={[styles.youthTab, youthTab === 'hotlines' && styles.youthTabActive]}
                  onPress={() => setYouthTab('hotlines')}
                >
                  <Text style={[styles.youthTabText, youthTab === 'hotlines' && styles.youthTabTextActive]}>
                    📞 {isSpanish ? 'Líneas' : 'Hotlines'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.youthTab, youthTab === 'laws' && styles.youthTabActive]}
                  onPress={() => setYouthTab('laws')}
                >
                  <Text style={[styles.youthTabText, youthTab === 'laws' && styles.youthTabTextActive]}>
                    ⚖️ {isSpanish ? 'Leyes' : 'Laws'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.youthTab, youthTab === 'abuse' && styles.youthTabActive]}
                  onPress={() => setYouthTab('abuse')}
                >
                  <Text style={[styles.youthTabText, youthTab === 'abuse' && styles.youthTabTextActive]}>
                    🛡️ {isSpanish ? 'Reportar' : 'Report'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hotlines Tab */}
              {youthTab === 'hotlines' && (
                <View style={styles.youthTabContent}>
                  <View style={styles.youthHotlines}>
                    <TouchableOpacity
                      style={styles.youthHotlineCard}
                      onPress={() => Linking.openURL('tel:18007862929')}
                    >
                      <Text style={styles.youthHotlineIcon}>🏃</Text>
                      <View style={styles.youthHotlineInfo}>
                        <Text style={styles.youthHotlineName}>
                          {isSpanish ? 'Línea para Fugitivos' : 'Runaway Safeline'}
                        </Text>
                        <Text style={styles.youthHotlinePhone}>1-800-786-2929</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.youthHotlineCard}
                      onPress={() => Linking.openURL('tel:18004224453')}
                    >
                      <Text style={styles.youthHotlineIcon}>🆘</Text>
                      <View style={styles.youthHotlineInfo}>
                        <Text style={styles.youthHotlineName}>
                          {isSpanish ? 'Ayuda contra Abuso' : 'Child Abuse Hotline'}
                        </Text>
                        <Text style={styles.youthHotlinePhone}>1-800-422-4453</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.youthHotlineCard}
                      onPress={() => Linking.openURL('tel:18669997386')}
                    >
                      <Text style={styles.youthHotlineIcon}>🌈</Text>
                      <View style={styles.youthHotlineInfo}>
                        <Text style={styles.youthHotlineName}>
                          {isSpanish ? 'Proyecto Trevor (LGBTQ+)' : 'Trevor Project (LGBTQ+)'}
                        </Text>
                        <Text style={styles.youthHotlinePhone}>1-866-488-7386</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.youthHotlineCard}
                      onPress={() => Linking.openURL('sms:741741?body=HOME')}
                    >
                      <Text style={styles.youthHotlineIcon}>💬</Text>
                      <View style={styles.youthHotlineInfo}>
                        <Text style={styles.youthHotlineName}>
                          {isSpanish ? 'Línea de Texto de Crisis' : 'Crisis Text Line'}
                        </Text>
                        <Text style={styles.youthHotlinePhone}>{isSpanish ? 'Envía HOME al 741741' : 'Text HOME to 741741'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.youthBannerNote}>
                    {isSpanish
                      ? '📞 Toca para llamar. Las llamadas son confidenciales.'
                      : '📞 Tap to call. All calls are confidential.'}
                  </Text>
                </View>
              )}

              {/* State Laws Tab */}
              {youthTab === 'laws' && (
                <View style={styles.youthTabContent}>
                  <View style={styles.lawsHeader}>
                    <Text style={styles.lawsStateLabel}>
                      {stateCode ? (
                        isSpanish ? `Leyes en ${stateLaws.state}` : `Laws in ${stateLaws.state}`
                      ) : (
                        isSpanish ? 'Leyes Generales' : 'General Laws'
                      )}
                    </Text>
                  </View>

                  <View style={styles.lawsSummaryCard}>
                    <Text style={styles.lawsSummaryText}>
                      {isSpanish ? stateLaws.runawayLaws.summaryEs : stateLaws.runawayLaws.summary}
                    </Text>
                  </View>

                  <View style={styles.lawsKeyPoints}>
                    <Text style={styles.lawsKeyPointsTitle}>
                      {isSpanish ? 'Puntos Importantes:' : 'Key Points:'}
                    </Text>
                    {(isSpanish ? stateLaws.runawayLaws.keyPointsEs : stateLaws.runawayLaws.keyPoints).map((point, index) => (
                      <View key={index} style={styles.lawsKeyPoint}>
                        <Text style={styles.lawsBullet}>•</Text>
                        <Text style={styles.lawsKeyPointText}>{point}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.lawsInfoRow}>
                    <View style={styles.lawsInfoItem}>
                      <Text style={styles.lawsInfoLabel}>{isSpanish ? 'Mayoría de edad' : 'Age of Majority'}</Text>
                      <Text style={styles.lawsInfoValue}>{stateLaws.runawayLaws.ageOfMajority}</Text>
                    </View>
                    {stateLaws.runawayLaws.emancipationAge && (
                      <View style={styles.lawsInfoItem}>
                        <Text style={styles.lawsInfoLabel}>{isSpanish ? 'Emancipación' : 'Emancipation'}</Text>
                        <Text style={styles.lawsInfoValue}>{stateLaws.runawayLaws.emancipationAge}+</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.lawsStatusRow}>
                    <View style={[styles.lawsStatusBadge, stateLaws.runawayLaws.isStatusOffense ? styles.lawsStatusWarning : styles.lawsStatusSafe]}>
                      <Text style={styles.lawsStatusText}>
                        {stateLaws.runawayLaws.isStatusOffense
                          ? (isSpanish ? '⚠️ Huir es ofensa de estatus' : '⚠️ Running away is a status offense')
                          : (isSpanish ? '✓ Huir NO es un crimen' : '✓ Running away is NOT a crime')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.lawsCallButton}
                    onPress={() => Linking.openURL('tel:18007862929')}
                  >
                    <Text style={styles.lawsCallButtonText}>
                      {isSpanish ? '📞 Preguntas? Llama a la Línea para Fugitivos' : '📞 Questions? Call Runaway Safeline'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Report Abuse Tab */}
              {youthTab === 'abuse' && (
                <View style={styles.youthTabContent}>
                  <View style={styles.abuseIntroCard}>
                    <Text style={styles.abuseIntroText}>
                      {isSpanish ? ABUSE_REPORTING_INFO.introEs : ABUSE_REPORTING_INFO.intro}
                    </Text>
                  </View>

                  {/* State-specific reporting */}
                  <View style={styles.abuseStateCard}>
                    <Text style={styles.abuseStateTitle}>
                      {stateCode
                        ? (isSpanish ? `Reportar en ${stateLaws.state}` : `Report in ${stateLaws.state}`)
                        : (isSpanish ? 'Línea Nacional' : 'National Hotline')}
                    </Text>
                    <Text style={styles.abuseAgency}>
                      {isSpanish ? stateLaws.abuseReporting.agencyEs : stateLaws.abuseReporting.agency}
                    </Text>
                    <TouchableOpacity
                      style={styles.abuseCallButton}
                      onPress={() => Linking.openURL(`tel:${stateLaws.abuseReporting.hotline.replace(/-/g, '')}`)}
                    >
                      <Text style={styles.abuseCallButtonText}>
                        📞 {stateLaws.abuseReporting.hotline}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.abuseFeatures}>
                      {stateLaws.abuseReporting.canReportAnonymously && (
                        <View style={styles.abuseFeatureBadge}>
                          <Text style={styles.abuseFeatureText}>
                            {isSpanish ? '🔒 Anónimo' : '🔒 Anonymous'}
                          </Text>
                        </View>
                      )}
                      {stateLaws.abuseReporting.onlineReporting && (
                        <TouchableOpacity
                          style={styles.abuseFeatureBadge}
                          onPress={() => Linking.openURL(stateLaws.abuseReporting.website)}
                        >
                          <Text style={styles.abuseFeatureText}>
                            {isSpanish ? '🌐 En línea' : '🌐 Online'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Types of abuse */}
                  <Text style={styles.abuseTypesTitle}>
                    {isSpanish ? '¿Qué es abuso?' : 'What is abuse?'}
                  </Text>
                  <View style={styles.abuseTypesGrid}>
                    {ABUSE_REPORTING_INFO.types.map((type, index) => (
                      <View key={index} style={styles.abuseTypeCard}>
                        <Text style={styles.abuseTypeIcon}>{type.icon}</Text>
                        <Text style={styles.abuseTypeName}>
                          {isSpanish ? type.typeEs : type.type}
                        </Text>
                        <Text style={styles.abuseTypeExamples}>
                          {isSpanish ? type.examplesEs : type.examples}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Emergency notice */}
                  <View style={styles.abuseEmergency}>
                    <Text style={styles.abuseEmergencyTitle}>
                      {isSpanish ? ABUSE_REPORTING_INFO.emergency.titleEs : ABUSE_REPORTING_INFO.emergency.title}
                    </Text>
                    <Text style={styles.abuseEmergencyText}>
                      {isSpanish ? ABUSE_REPORTING_INFO.emergency.messageEs : ABUSE_REPORTING_INFO.emergency.message}
                    </Text>
                    <TouchableOpacity
                      style={styles.abuseEmergencyButton}
                      onPress={() => Linking.openURL('tel:911')}
                    >
                      <Text style={styles.abuseEmergencyButtonText}>🚨 {isSpanish ? 'Llamar 911' : 'Call 911'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              </>
              )}
            </View>
          );
        })()}

        {/* Intake progress nudge - small pill shown when intake is incomplete */}
        {(() => {
          const answered = userProfile?.answers?.length || 0;
          const selectedCats = userProfile?.selectedCategories?.length || 0;
          const expected = selectedCats * 10; // ~10 questions per category
          if (expected === 0 || answered >= expected) return null;
          const remaining = expected - answered;
          return (
            <TouchableOpacity
              style={styles.intakeNudgeCompact}
              onPress={() => navigation.navigate('Questionnaire')}
              activeOpacity={0.8}
            >
              <Text style={styles.intakeNudgeCompactIcon}>📋</Text>
              <Text style={styles.intakeNudgeCompactText}>
                {isSpanish
                  ? `${remaining} preguntas de intake pendientes`
                  : `${remaining} intake questions left`}
              </Text>
              <Text style={styles.intakeNudgeCompactArrow}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* Quick Help */}
        <View style={styles.quickHelpSection}>
          <Text style={styles.sectionHeader}>
            {isSpanish ? 'Ayuda Rápida' : 'Quick Help'}
          </Text>
          <View style={styles.quickHelpGrid}>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('211'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>📞</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Llamar 211' : 'Call 211'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('food'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>🍽️</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Comida' : 'Food'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('documents'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>🪪</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Documentos' : 'Documents'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {scrollToTopButton}

      {/* AI Modal */}
      {renderAIModal()}

      {/* Add Todo Modal */}
      {renderAddTodoModal()}

      {/* Todo Detail Modal */}
      {renderTodoDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  revisitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  revisitSummaryIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  revisitSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  revisitSummarySubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 17,
  },
  revisitSummaryArrow: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: '700',
    marginLeft: 8,
  },
  intakeNudgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  intakeNudgeCompactIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  intakeNudgeCompactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  intakeNudgeCompactArrow: {
    fontSize: 20,
    color: '#2563EB',
    fontWeight: '700',
    marginLeft: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'column',
    paddingHorizontal: 20,
  },
  categoryCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryChevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 8,
  },
  todoGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 4,
    gap: 8,
  },
  todoGroupIcon: {
    fontSize: 18,
  },
  todoGroupLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todoGroupCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    textAlign: 'center',
  },
  todosSection: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 14,
  },
  todoText: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  moreText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  todoItemContainer: {
    marginBottom: 8,
  },
  todoContent: {
    flex: 1,
  },
  todoResourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  todoResourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  todoActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 38,
    marginTop: 8,
    marginBottom: 8,
  },
  todoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todoActionButtonPrimary: {
    backgroundColor: '#0D9488',
  },
  todoActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  todoActionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickHelpSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickHelpCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickHelpIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickHelpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  // AI Modal Styles
  aiContainer: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  aiCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCloseText: {
    fontSize: 18,
    color: '#64748B',
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiSpacer: {
    width: 40,
  },
  aiContent: {
    flex: 1,
  },
  aiWelcome: {
    padding: 24,
  },
  aiWelcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiWelcomeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  aiTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiTopicCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiTopicIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  aiTopicLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  chatContainer: {
    padding: 20,
  },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#0D9488',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#0F172A',
  },
  quickTopicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  quickTopicChip: {
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  quickTopicText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FEFEFE',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  aiSendText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // New styles for enhanced features
  aiCategoryCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  caseManagerCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  categorySubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todoHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  todoHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  addTodoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTodoButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -2,
  },
  emptyTodos: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTodosEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTodosText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  todoCheckmark: {
    color: '#0D9488',
    fontSize: 14,
  },
  todoDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoDeleteText: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: '600',
  },
  // Add Todo Modal Styles
  addTodoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addTodoModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  addTodoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addTodoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  addTodoClose: {
    fontSize: 28,
    color: '#64748B',
  },
  addTodoInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  addTodoSubmit: {
    backgroundColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  addTodoSubmitDisabled: {
    backgroundColor: '#CBD5E1',
  },
  addTodoSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Todo Suggestions in AI
  todoSuggestionsContainer: {
    marginLeft: 0,
    marginBottom: 16,
    paddingLeft: 8,
  },
  todoSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  todoSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  todoSuggestionChip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todoSuggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  // AI Modal enhancements
  aiTitleContainer: {
    alignItems: 'center',
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  aiWelcomeEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 16,
  },
  moreTopicsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 24,
    marginBottom: 8,
  },
  // Intelligent AI Enhancement Styles
  aiTipContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiTipText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  followUpContainer: {
    marginLeft: 0,
    marginBottom: 16,
    paddingLeft: 8,
  },
  followUpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  followUpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followUpChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  followUpText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4338CA',
  },
  aiSendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  // Youth Support Banner styles
  youthBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  youthBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  youthBannerEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  youthBannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  youthBannerChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 8,
  },
  youthBannerText: {
    fontSize: 15,
    color: '#047857',
    lineHeight: 22,
    marginBottom: 16,
  },
  youthHotlines: {
    gap: 10,
  },
  youthHotlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  youthHotlineIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  youthHotlineInfo: {
    flex: 1,
  },
  youthHotlineName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  youthHotlinePhone: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D9488',
  },
  youthBannerNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Youth Tab Selector styles
  youthTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  youthTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  youthTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  youthTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  youthTabTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  youthTabContent: {
    marginTop: 4,
  },
  // State Laws Tab styles
  lawsHeader: {
    marginBottom: 12,
  },
  lawsStateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    textAlign: 'center',
  },
  lawsSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lawsSummaryText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  lawsKeyPoints: {
    marginBottom: 16,
  },
  lawsKeyPointsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 8,
  },
  lawsKeyPoint: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  lawsBullet: {
    fontSize: 14,
    color: '#059669',
    marginRight: 8,
    fontWeight: '700',
  },
  lawsKeyPointText: {
    fontSize: 13,
    color: '#047857',
    flex: 1,
    lineHeight: 18,
  },
  lawsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  lawsInfoItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
  },
  lawsInfoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  lawsInfoValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
  },
  lawsStatusRow: {
    marginBottom: 16,
  },
  lawsStatusBadge: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  lawsStatusWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  lawsStatusSafe: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lawsStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  lawsCallButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  lawsCallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Abuse Reporting Tab styles
  abuseIntroCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  abuseIntroText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  abuseStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
  },
  abuseStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  abuseAgency: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  abuseCallButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  abuseCallButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  abuseFeatures: {
    flexDirection: 'row',
    gap: 10,
  },
  abuseFeatureBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  abuseFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  abuseTypesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 12,
  },
  abuseTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  abuseTypeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  abuseTypeIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  abuseTypeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  abuseTypeExamples: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  abuseEmergency: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  abuseEmergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
  },
  abuseEmergencyText: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 12,
    textAlign: 'center',
  },
  abuseEmergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  abuseEmergencyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Todo Description Styles
  addTodoDescriptionInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 16,
    color: '#0F172A',
  },
  todoDescriptionPreview: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  todoDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  todoDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  todoDetailDescriptionInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 20,
    color: '#0F172A',
  },
  todoDetailButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  todoDetailSecondaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  todoDetailSecondaryButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  todoDetailPrimaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0D9488',
    alignItems: 'center',
  },
  todoDetailPrimaryButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
