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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import * as Clipboard from 'expo-clipboard';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<any>;
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
    { en: 'Call National Homeless Hotline: 1-800-231-6946', es: 'Llamar Línea Nacional: 1-800-231-6946' },
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
• 211 - Real-time shelter bed availability
• National Homeless Hotline: 1-800-231-6946 (24/7)

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
• 211 - Disponibilidad de camas en tiempo real
• Línea Nacional: 1-800-231-6946 (24/7)

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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [showAI, setShowAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    lastIntent: '',
    messageCount: 0,
    mentionedTopics: [],
  });
  const scrollViewRef = useRef<ScrollView>(null);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;
  const categories = userProfile?.selectedCategories || [];

  const handleCopyCode = async () => {
    if (userProfile?.shareCode) {
      await Clipboard.setStringAsync(userProfile.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAITopic = (topicId: string) => {
    const topic = AI_TOPICS.find((t) => t.id === topicId);
    if (!topic) return;

    setCurrentTopic(topicId);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: isSpanish ? topic.labelEs : topic.label,
    };

    // Add user message and show typing indicator
    setChatMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI "thinking" time for natural feel (800-1500ms)
    const thinkingTime = 800 + Math.random() * 700;

    setTimeout(() => {
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

      // Generate intelligent response
      const responseContent = generateAIResponse({
        intent: topicId,
        isSpanish,
        userName: userProfile?.name,
        userLocation: userProfile?.location?.city,
        messageCount: newContext.messageCount,
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

      // Scroll to bottom after AI responds
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, thinkingTime);
  };

  const handleAddTodo = (title: string) => {
    if (!title.trim()) return;

    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: title.trim(),
        completed: false,
        category: currentTopic as any || 'general',
      },
    });

    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish ? 'Tarea agregada a tu lista' : 'Task added to your to-do list',
      [{ text: 'OK' }]
    );
  };

  const handleQuickAddTodo = (todo: { en: string; es: string }) => {
    handleAddTodo(isSpanish ? todo.es : todo.en);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
    };

    // Add user message and show typing indicator
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Use intelligent intent detection
    const { intent, confidence } = detectIntent(userInput);
    const detectedIntent = confidence > 15 ? intent : 'unknown';

    // Calculate thinking time based on message complexity
    const baseTime = 600;
    const complexityBonus = Math.min(userInput.length * 5, 500);
    const randomVariation = Math.random() * 400;
    const thinkingTime = baseTime + complexityBonus + randomVariation;

    setTimeout(() => {
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

      // Generate intelligent response
      const responseContent = generateAIResponse({
        intent: detectedIntent,
        isSpanish,
        userName: userProfile?.name,
        userLocation: userProfile?.location?.city,
        messageCount: newContext.messageCount,
        previousTopics: conversationContext.mentionedTopics,
      });

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
    }, thinkingTime);
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
            <Text style={styles.categoryLabel}>
              {isSpanish ? category.labelEs : category.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* AI Case Manager Block */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.aiCategoryCard]}
          onPress={() => setShowAI(true)}
        >
          <View style={[styles.categoryIconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.categoryIcon}>🤖</Text>
          </View>
          <Text style={styles.categoryLabel}>
            {isSpanish ? 'AI Gestor' : 'AI Case Manager'}
          </Text>
          <Text style={styles.categorySubLabel}>
            {isSpanish ? 'Ayuda personalizada' : 'Personal help'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTodos = () => {
    const todos = userProfile?.todos || [];
    const pendingTodos = todos.filter((t) => !t.completed);
    const completedCount = todos.filter((t) => t.completed).length;

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
            {pendingTodos.slice(0, 4).map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={styles.todoItem}
                onPress={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
              >
                <View style={styles.todoCheckbox}>
                  <Text style={styles.todoCheckmark}></Text>
                </View>
                <Text style={styles.todoText}>{todo.title}</Text>
                <TouchableOpacity
                  style={styles.todoDeleteButton}
                  onPress={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}
                >
                  <Text style={styles.todoDeleteText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {pendingTodos.length > 4 && (
              <Text style={styles.moreText}>
                +{pendingTodos.length - 4} {isSpanish ? 'más' : 'more'}
              </Text>
            )}
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
            <TouchableOpacity onPress={() => setShowAddTodo(false)}>
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
          <TouchableOpacity
            style={[
              styles.addTodoSubmit,
              !newTodoText.trim() && styles.addTodoSubmitDisabled,
            ]}
            onPress={() => {
              if (newTodoText.trim()) {
                handleAddTodo(newTodoText);
                setNewTodoText('');
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
                    <Text
                      style={[
                        styles.chatText,
                        message.type === 'user' ? styles.userText : styles.aiText,
                      ]}
                    >
                      {message.content}
                    </Text>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {isSpanish ? '¡Hola' : 'Hello'}, {userProfile?.name || 'Friend'}! 👋
            </Text>
            <Text style={styles.subtitle}>
              {isSpanish ? 'Tus recursos personalizados' : 'Your personalized resources'}
            </Text>
          </View>
        </View>

        {/* Share Code Card */}
        {userProfile?.shareCode && (
          <TouchableOpacity style={styles.shareCodeCard} onPress={handleCopyCode}>
            <View style={styles.shareCodeContent}>
              <Text style={styles.shareCodeLabel}>
                {isSpanish ? 'Tu Código de Compartir' : 'Your Share Code'}
              </Text>
              <Text style={styles.shareCode}>{userProfile.shareCode}</Text>
            </View>
            <View style={styles.copyButton}>
              <Text style={styles.copyButtonText}>
                {codeCopied ? '✓' : isSpanish ? 'Copiar' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Grid */}
        <Text style={styles.sectionHeader}>
          {isSpanish ? 'Explorar Recursos' : 'Explore Resources'}
        </Text>
        {renderCategoryGrid()}

        {/* Todos */}
        {renderTodos()}

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

      {/* AI Modal */}
      {renderAIModal()}

      {/* Add Todo Modal */}
      {renderAddTodoModal()}
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
  shareCodeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  shareCodeContent: {
    flex: 1,
  },
  shareCodeLabel: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '47%',
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
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
});
