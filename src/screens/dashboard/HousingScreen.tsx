import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { getHousingResources } from '../../services';
import { Resource } from '../../types';
import { HousingResource } from '../../services/housingApi';
import { YOUTH_SHELTER_RESOURCES, YOUTH_HOTLINES, getYouthMessage } from '../../data/youthResources';
import { UrgentNeedsBanner } from '../../components/UrgentNeedsBanner';
import { PersonalizedRecommendations } from '../../components/PersonalizedRecommendations';
import { FloatingAIButton } from '../../components/FloatingAIButton';
import { useScrollToTop } from '../../components/ScrollToTopButton';

type HousingScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

// For You content - personalized housing resources
const HOUSING_FOR_YOU = [
  {
    id: 'hfy1',
    title: 'Understanding Section 8',
    titleEs: 'Entendiendo la Sección 8',
    description: 'Housing choice voucher program explained',
    descriptionEs: 'Programa de vales de vivienda explicado',
    icon: '🏠',
    color: '#7C3AED',
    details: [
      'Section 8 helps pay rent for low-income families',
      'You pay about 30% of your income, voucher covers the rest',
      'Apply through your local Public Housing Authority (PHA)',
      'Waitlists can be long - apply to multiple PHAs',
    ],
    detailsEs: [
      'La Sección 8 ayuda a pagar el alquiler para familias de bajos ingresos',
      'Pagas aproximadamente el 30% de tus ingresos, el vale cubre el resto',
      'Aplica a través de tu Autoridad de Vivienda Pública (PHA) local',
      'Las listas de espera pueden ser largas - aplica a múltiples PHAs',
    ],
  },
  {
    id: 'hfy2',
    title: 'Emergency Shelter Guide',
    titleEs: 'Guía de Refugios de Emergencia',
    description: 'Finding immediate shelter',
    descriptionEs: 'Encontrando refugio inmediato',
    icon: '🆘',
    color: '#DC2626',
    details: [
      'Call 211 for local shelter information 24/7',
      'Many shelters require check-in by certain times',
      'Bring ID if you have it (not always required)',
      'Ask about services: meals, showers, case management',
    ],
    detailsEs: [
      'Llama al 211 para información sobre refugios locales 24/7',
      'Muchos refugios requieren registro a ciertas horas',
      'Trae identificación si la tienes (no siempre requerida)',
      'Pregunta sobre servicios: comidas, duchas, gestión de casos',
    ],
  },
  {
    id: 'hfy3',
    title: 'Rental Assistance Programs',
    titleEs: 'Programas de Asistencia de Renta',
    description: 'Help paying rent',
    descriptionEs: 'Ayuda para pagar la renta',
    icon: '💰',
    color: '#0D9488',
    details: [
      'Emergency rental assistance available through local agencies',
      'Utility assistance programs can help with bills',
      'Many churches and nonprofits offer one-time assistance',
      'Contact 211 or local Community Action Agency',
    ],
    detailsEs: [
      'Asistencia de emergencia de alquiler disponible a través de agencias locales',
      'Programas de asistencia de servicios públicos pueden ayudar con facturas',
      'Muchas iglesias y organizaciones sin fines de lucro ofrecen asistencia única',
      'Contacta al 211 o la Agencia de Acción Comunitaria local',
    ],
  },
  {
    id: 'hfy4',
    title: 'Tenant Rights',
    titleEs: 'Derechos del Inquilino',
    description: 'Know your rights as a renter',
    descriptionEs: 'Conoce tus derechos como inquilino',
    icon: '⚖️',
    color: '#EA580C',
    details: [
      'Landlords must provide habitable housing',
      'You cannot be evicted without proper legal process',
      'Discrimination based on race, religion, disability is illegal',
      'Keep copies of all rental agreements and communications',
    ],
    detailsEs: [
      'Los propietarios deben proporcionar vivienda habitable',
      'No pueden desalojarte sin el proceso legal adecuado',
      'La discriminación basada en raza, religión, discapacidad es ilegal',
      'Guarda copias de todos los acuerdos de alquiler y comunicaciones',
    ],
  },
];

// Housing programs with step-by-step application guides
const HOUSING_PROGRAMS = [
  {
    id: 'section8',
    title: 'Section 8 / Housing Choice Voucher',
    titleEs: 'Sección 8 / Vale de Vivienda',
    icon: '🏠',
    color: '#7C3AED',
    description: 'Government rental assistance program',
    descriptionEs: 'Programa gubernamental de asistencia de alquiler',
    steps: [
      { step: 1, title: 'Check Eligibility', titleEs: 'Verificar Elegibilidad', detail: 'Income must be below 50% of area median income. Check at your local PHA.', detailEs: 'Los ingresos deben estar por debajo del 50% del ingreso medio del área. Verifica en tu PHA local.' },
      { step: 2, title: 'Find Your Local PHA', titleEs: 'Encontrar tu PHA Local', detail: 'Visit hud.gov/program_offices/public_indian_housing/pha/contacts to find your Public Housing Authority.', detailEs: 'Visita hud.gov/program_offices/public_indian_housing/pha/contacts para encontrar tu Autoridad de Vivienda Pública.' },
      { step: 3, title: 'Apply When Waitlist Opens', titleEs: 'Aplicar Cuando la Lista Abra', detail: 'Waitlists open periodically. Call your PHA to check status or sign up for notifications.', detailEs: 'Las listas de espera abren periódicamente. Llama a tu PHA para verificar el estado o inscribirte para notificaciones.' },
      { step: 4, title: 'Gather Documents', titleEs: 'Reunir Documentos', detail: 'ID, Social Security cards, birth certificates, proof of income, bank statements.', detailEs: 'Identificación, tarjetas de Seguro Social, actas de nacimiento, prueba de ingresos, estados de cuenta bancarios.' },
      { step: 5, title: 'Attend Interview', titleEs: 'Asistir a la Entrevista', detail: 'Bring all documents. Be honest about your situation.', detailEs: 'Lleva todos los documentos. Sé honesto sobre tu situación.' },
      { step: 6, title: 'Find Housing', titleEs: 'Encontrar Vivienda', detail: 'Once approved, you have 60-120 days to find a landlord who accepts vouchers.', detailEs: 'Una vez aprobado, tienes 60-120 días para encontrar un propietario que acepte vales.' },
    ],
    phone: '211',
    website: 'https://www.hud.gov/topics/housing_choice_voucher_program_section_8',
  },
  {
    id: 'publichousing',
    title: 'Public Housing',
    titleEs: 'Vivienda Pública',
    icon: '🏢',
    color: '#0D9488',
    description: 'Government-owned affordable housing',
    descriptionEs: 'Vivienda asequible propiedad del gobierno',
    steps: [
      { step: 1, title: 'Find Local Housing Authority', titleEs: 'Encontrar Autoridad de Vivienda Local', detail: 'Search for your local PHA at hud.gov or call 211.', detailEs: 'Busca tu PHA local en hud.gov o llama al 211.' },
      { step: 2, title: 'Check Eligibility', titleEs: 'Verificar Elegibilidad', detail: 'Based on income, family size, and citizenship/immigration status.', detailEs: 'Basado en ingresos, tamaño de familia y estado de ciudadanía/inmigración.' },
      { step: 3, title: 'Submit Application', titleEs: 'Enviar Solicitud', detail: 'Apply online, in person, or by mail. Include all required documents.', detailEs: 'Aplica en línea, en persona o por correo. Incluye todos los documentos requeridos.' },
      { step: 4, title: 'Wait for Placement', titleEs: 'Esperar Colocación', detail: 'Waitlists can be long. Stay in contact and update your info if it changes.', detailEs: 'Las listas de espera pueden ser largas. Mantente en contacto y actualiza tu información si cambia.' },
    ],
    phone: '211',
    website: 'https://www.hud.gov/topics/rental_assistance/phprog',
  },
  {
    id: 'rapidrehousing',
    title: 'Rapid Re-Housing',
    titleEs: 'Realojamiento Rápido',
    icon: '⚡',
    color: '#EA580C',
    description: 'Short-term rental assistance for homeless individuals',
    descriptionEs: 'Asistencia de alquiler a corto plazo para personas sin hogar',
    steps: [
      { step: 1, title: 'Contact Local Provider', titleEs: 'Contactar Proveedor Local', detail: 'Call 211 or visit a homeless services center to get connected.', detailEs: 'Llama al 211 o visita un centro de servicios para personas sin hogar.' },
      { step: 2, title: 'Complete Assessment', titleEs: 'Completar Evaluación', detail: 'A case manager will assess your situation and needs.', detailEs: 'Un gestor de casos evaluará tu situación y necesidades.' },
      { step: 3, title: 'Work with Case Manager', titleEs: 'Trabajar con Gestor de Casos', detail: 'They help you find housing, apply, and provide rental assistance.', detailEs: 'Te ayudan a encontrar vivienda, aplicar y proporcionar asistencia de alquiler.' },
      { step: 4, title: 'Transition to Independence', titleEs: 'Transición a Independencia', detail: 'Support typically lasts 3-24 months as you stabilize.', detailEs: 'El apoyo típicamente dura 3-24 meses mientras te estabilizas.' },
    ],
    phone: '211',
    website: 'https://www.hudexchange.info/programs/rapid-re-housing/',
  },
  {
    id: 'veterans',
    title: 'HUD-VASH (Veterans)',
    titleEs: 'HUD-VASH (Veteranos)',
    icon: '🎖️',
    color: '#DC2626',
    description: 'Housing vouchers for homeless veterans',
    descriptionEs: 'Vales de vivienda para veteranos sin hogar',
    steps: [
      { step: 1, title: 'Contact VA', titleEs: 'Contactar VA', detail: 'Call the National Call Center for Homeless Veterans: 1-877-424-3838.', detailEs: 'Llama al Centro Nacional para Veteranos Sin Hogar: 1-877-424-3838.' },
      { step: 2, title: 'Get Referred', titleEs: 'Obtener Referencia', detail: 'VA staff will assess eligibility and refer you to HUD-VASH.', detailEs: 'El personal de VA evaluará la elegibilidad y te referirá a HUD-VASH.' },
      { step: 3, title: 'Work with VA Case Manager', titleEs: 'Trabajar con Gestor de VA', detail: 'Receive ongoing support services while in housing.', detailEs: 'Recibe servicios de apoyo continuo mientras estás en vivienda.' },
      { step: 4, title: 'Find Housing', titleEs: 'Encontrar Vivienda', detail: 'Use your voucher to find approved housing.', detailEs: 'Usa tu vale para encontrar vivienda aprobada.' },
    ],
    phone: '1-877-424-3838',
    website: 'https://www.va.gov/homeless/hud-vash.asp',
  },
];

// Emergency resources
const HOUSING_HOTLINES = [
  { id: 'hh1', name: 'HUD Housing Counselor', nameEs: 'Consejero de Vivienda HUD', description: 'Free HUD-approved housing counseling', descriptionEs: 'Asesoramiento de vivienda aprobado por HUD (gratis)', phone: '1-800-569-4287', icon: '📞' },
  { id: 'hh2', name: '211', nameEs: '211', description: 'Local resources & shelter info', descriptionEs: 'Recursos locales e información de refugios', phone: '211', icon: '🆘' },
  { id: 'hh3', name: 'Domestic Violence Hotline', nameEs: 'Línea de Violencia Doméstica', description: 'Safe shelter for DV survivors', descriptionEs: 'Refugio seguro para sobrevivientes de VD', phone: '1-800-799-7233', icon: '💜' },
];

// Need Housing Now triage questions
const HOUSING_TRIAGE = [
  {
    id: 'situation',
    question: 'What is your current situation?',
    questionEs: '¿Cuál es tu situación actual?',
    options: [
      { id: 'tonight', label: 'I need a place to sleep tonight', labelEs: 'Necesito un lugar para dormir esta noche', urgency: 'immediate' },
      { id: 'few_days', label: 'I will need shelter in the next few days', labelEs: 'Necesitaré refugio en los próximos días', urgency: 'urgent' },
      { id: 'eviction', label: 'I am facing eviction', labelEs: 'Estoy enfrentando un desalojo', urgency: 'urgent' },
      { id: 'unsafe', label: 'I am in an unsafe living situation', labelEs: 'Estoy en una situación de vivienda insegura', urgency: 'immediate' },
    ],
  },
  {
    id: 'who',
    question: 'Who needs shelter?',
    questionEs: '¿Quién necesita refugio?',
    options: [
      { id: 'just_me', label: 'Just me', labelEs: 'Solo yo', type: 'single' },
      { id: 'with_family', label: 'Me and my family/children', labelEs: 'Yo y mi familia/hijos', type: 'family' },
      { id: 'couple', label: 'Me and my partner', labelEs: 'Yo y mi pareja', type: 'couple' },
      { id: 'veteran', label: 'I am a veteran', labelEs: 'Soy veterano', type: 'veteran' },
    ],
  },
];

/**
 * Check if a shelter/resource is currently open based on hours string
 */
const isResourceOpen = (hours?: string): { isOpen: boolean; status: string; statusEs: string } => {
  if (!hours) {
    return { isOpen: true, status: 'Call for hours', statusEs: 'Llame para horarios' };
  }

  const hoursLower = hours.toLowerCase();

  // 24/7 resources are always open
  if (hoursLower.includes('24') || hoursLower.includes('24/7')) {
    return { isOpen: true, status: 'Open 24/7', statusEs: 'Abierto 24/7' };
  }

  // Get current day and hour
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday

  // Check if it's a weekend
  const isWeekend = currentDay === 0 || currentDay === 6;

  // Check for Mon-Fri patterns
  if (hoursLower.includes('mon-fri') || hoursLower.includes('lun-vie')) {
    if (isWeekend) {
      return { isOpen: false, status: 'Closed - Opens Monday', statusEs: 'Cerrado - Abre el lunes' };
    }

    // Try to extract hours (e.g., "9 AM - 5 PM" or "8:00 AM - 5:00 PM")
    const timeMatch = hours.match(/(\d{1,2})(?::00)?\s*(?:AM|am)?\s*-\s*(\d{1,2})(?::00)?\s*(?:PM|pm)?/i);
    if (timeMatch) {
      const openHour = parseInt(timeMatch[1]);
      let closeHour = parseInt(timeMatch[2]);
      // Assume PM for closing time if > 5 and <= 12
      if (closeHour <= 12 && closeHour >= 1 && closeHour < openHour) {
        closeHour += 12;
      }

      if (currentHour >= openHour && currentHour < closeHour) {
        return { isOpen: true, status: `Open until ${closeHour > 12 ? closeHour - 12 : closeHour} PM`, statusEs: `Abierto hasta las ${closeHour > 12 ? closeHour - 12 : closeHour} PM` };
      } else if (currentHour < openHour) {
        return { isOpen: false, status: `Opens at ${openHour} AM`, statusEs: `Abre a las ${openHour} AM` };
      } else {
        return { isOpen: false, status: 'Closed - Opens tomorrow', statusEs: 'Cerrado - Abre mañana' };
      }
    }
  }

  // Default for hotlines (assume open)
  if (hoursLower.includes('hotline') || hoursLower.includes('crisis')) {
    return { isOpen: true, status: 'Hotline Available', statusEs: 'Línea disponible' };
  }

  // Default case
  return { isOpen: true, status: 'Call to confirm', statusEs: 'Llame para confirmar' };
};

export const HousingScreen: React.FC<HousingScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const scrollRef = useRef<ScrollView | null>(null);
  const { button: scrollToTopButton, handleScroll } = useScrollToTop(scrollRef);
  const [activeSection, setActiveSection] = useState<'foryou' | 'find' | 'options' | 'help' | 'needNow' | null>(null);
  const [counselors, setCounselors] = useState<HousingResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedCounselor, setExpandedCounselor] = useState<string | null>(null);
  const [triageStep, setTriageStep] = useState(0);
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});
  const [youthShelterExpanded, setYouthShelterExpanded] = useState(true);
  // Filter states
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterFamily, setFilterFamily] = useState(false);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;

  // Filter housing resources based on active filters
  const getFilteredCounselors = () => {
    let filtered = counselors;

    if (filterHasPhone) {
      filtered = filtered.filter(c => c.phone);
    }

    if (filterOpenNow) {
      filtered = filtered.filter(c => {
        const status = isResourceOpen(c.hours);
        return status.isOpen;
      });
    }

    if (filterEmergency) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes('emergency') ||
        c.name.toLowerCase().includes('shelter') ||
        c.name.toLowerCase().includes('crisis') ||
        c.id.includes('shelter') ||
        c.id.includes('211')
      );
    }

    if (filterFamily) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes('family') ||
        c.eligibility?.toLowerCase().includes('families') ||
        c.id.includes('family')
      );
    }

    return filtered;
  };

  const filteredCounselors = getFilteredCounselors();

  const addToTodo = (title: string, resourceUrl?: string, resourcePhone?: string) => {
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title,
        completed: false,
        category: 'housing',
        resourceType: 'housing',
        resourceUrl,
        resourcePhone,
      },
    });
    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish ? 'Tarea agregada a tu lista' : 'Task added to your to-do list',
      [{ text: 'OK' }]
    );
  };

  const loadCounselors = async () => {
    if (!userProfile?.location) return;
    setIsLoading(true);
    try {
      const results = await getHousingResources(userProfile.location);
      setCounselors(results);
    } catch (error) {
      console.error('Error loading counselors:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeSection === 'find' && counselors.length === 0) {
      loadCounselors();
    }
  }, [activeSection]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleTriageAnswer = (questionId: string, answerId: string) => {
    setTriageAnswers({ ...triageAnswers, [questionId]: answerId });
    if (triageStep < HOUSING_TRIAGE.length - 1) {
      setTriageStep(triageStep + 1);
    } else {
      setTriageStep(HOUSING_TRIAGE.length); // Show results
    }
  };

  const resetTriage = () => {
    setTriageStep(0);
    setTriageAnswers({});
  };

  const getTriageRecommendation = () => {
    const situation = triageAnswers['situation'];
    const who = triageAnswers['who'];

    if (situation === 'tonight' || situation === 'unsafe') {
      return {
        urgency: 'immediate',
        title: isSpanish ? '¡Necesitas ayuda ahora!' : 'You need help now!',
        message: isSpanish
          ? 'Basado en tu situación, deberías llamar inmediatamente para encontrar refugio.'
          : 'Based on your situation, you should call immediately to find shelter.',
        actions: [
          { label: isSpanish ? 'Llamar 211' : 'Call 211', phone: '211', primary: true },
          { label: isSpanish ? 'Consejero HUD' : 'HUD Counselor', phone: '1-800-569-4287', primary: false },
        ],
      };
    }

    if (who === 'veteran') {
      return {
        urgency: 'veteran',
        title: isSpanish ? 'Recursos para Veteranos' : 'Veteran Resources',
        message: isSpanish
          ? 'Como veterano, tienes acceso a programas especiales de vivienda.'
          : 'As a veteran, you have access to special housing programs.',
        actions: [
          { label: isSpanish ? 'VA Housing' : 'VA Housing', phone: '1-877-222-8387', primary: true },
          { label: isSpanish ? 'Llamar 211' : 'Call 211', phone: '211', primary: false },
        ],
      };
    }

    if (who === 'with_family') {
      return {
        urgency: 'family',
        title: isSpanish ? 'Refugio Familiar' : 'Family Shelter',
        message: isSpanish
          ? 'Hay refugios específicos para familias con niños.'
          : 'There are shelters specifically for families with children.',
        actions: [
          { label: isSpanish ? 'Llamar 211' : 'Call 211', phone: '211', primary: true },
          { label: isSpanish ? 'Family Promise' : 'Family Promise', phone: '1-866-586-4483', primary: false },
        ],
      };
    }

    return {
      urgency: 'standard',
      title: isSpanish ? 'Encontrar Vivienda' : 'Find Housing',
      message: isSpanish
        ? 'Llama al 211 para conectarte con recursos de vivienda en tu área.'
        : 'Call 211 to connect with housing resources in your area.',
      actions: [
        { label: isSpanish ? 'Llamar 211' : 'Call 211', phone: '211', primary: true },
        { label: isSpanish ? 'Consejero HUD' : 'HUD Counselor', phone: '1-800-569-4287', primary: false },
      ],
    };
  };

  const renderMainGrid = () => (
    <View style={styles.gridContainer}>
      {/* Urgent Needs Banner - filtered to housing + general (youth) */}
      <UrgentNeedsBanner
        profile={userProfile}
        category="housing"
        navigation={navigation}
      />

      {/* Youth Shelter Banner - Only for minors (collapsible) */}
      {userProfile?.ageGroup === 'under18' && (
        <View style={styles.youthShelterBanner}>
          <TouchableOpacity
            style={styles.youthShelterHeader}
            onPress={() => setYouthShelterExpanded(!youthShelterExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.youthShelterEmoji}>🏠</Text>
            <Text style={[styles.youthShelterTitle, { flex: 1 }]}>
              {isSpanish ? 'Refugios Juveniles' : 'Youth Shelters'}
            </Text>
            <Text style={styles.youthShelterChevron}>
              {youthShelterExpanded ? '▾' : '▸'}
            </Text>
          </TouchableOpacity>

          {youthShelterExpanded && (
          <>
          <Text style={styles.youthShelterMessage}>
            {isSpanish
              ? 'Los refugios juveniles son más seguros que los refugios para adultos y tienen personal que entiende tu situación.'
              : 'Youth shelters are safer than adult shelters and have staff who understand your situation.'}
          </Text>

          {/* Youth Shelter Resources */}
          {YOUTH_SHELTER_RESOURCES.shelters.map((shelter) => (
            <TouchableOpacity
              key={shelter.id}
              style={styles.youthShelterCard}
              onPress={() => handleCall(shelter.phone)}
            >
              <View style={styles.youthShelterCardContent}>
                <View style={styles.youthShelterInfo}>
                  <Text style={styles.youthShelterName}>
                    {isSpanish ? shelter.nameEs : shelter.name}
                  </Text>
                  <Text style={styles.youthShelterDesc}>
                    {isSpanish ? shelter.descriptionEs : shelter.description}
                  </Text>
                  <Text style={styles.youthShelterPhone}>{shelter.phone}</Text>
                </View>
                <View style={styles.youthCallIcon}>
                  <Text style={styles.youthCallIconText}>📞</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Runaway Safeline - Important for youth */}
          <View style={styles.youthSafelineCard}>
            <Text style={styles.youthSafelineEmoji}>🌟</Text>
            <View style={styles.youthSafelineInfo}>
              <Text style={styles.youthSafelineName}>
                {isSpanish ? 'Línea Nacional para Fugitivos' : 'National Runaway Safeline'}
              </Text>
              <Text style={styles.youthSafelineDesc}>
                {isSpanish
                  ? 'Si estás pensando en huir, llama primero. Pueden ayudarte a encontrar opciones más seguras.'
                  : "If you're thinking about running away, call first. They can help you find safer options."}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.youthSafelineButton}
              onPress={() => handleCall('1-800-786-2929')}
            >
              <Text style={styles.youthSafelineButtonText}>
                {isSpanish ? 'Llamar' : 'Call'}
              </Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {isSpanish ? 'Recursos de Vivienda' : 'Housing Resources'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {isSpanish ? 'Toca una categoría para explorar' : 'Tap a category to explore'}
      </Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#F5F3FF' }]}
          onPress={() => setActiveSection('foryou')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.gridIcon}>⭐</Text>
          </View>
          <View style={styles.gridTextContainer}>
            <Text style={styles.gridTitle}>{isSpanish ? 'Para Ti' : 'For You'}</Text>
            <Text style={styles.gridDescription}>
              {isSpanish ? 'Guías y consejos' : 'Guides & tips'}
            </Text>
          </View>
          <Text style={styles.gridChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#F0FDFA' }]}
          onPress={() => setActiveSection('find')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#CCFBF1' }]}>
            <Text style={styles.gridIcon}>🔍</Text>
          </View>
          <View style={styles.gridTextContainer}>
            <Text style={styles.gridTitle}>{isSpanish ? 'Buscar Vivienda' : 'Find Housing'}</Text>
            <Text style={styles.gridDescription}>
              {isSpanish ? 'Consejeros cerca de ti' : 'Counselors near you'}
            </Text>
          </View>
          <Text style={styles.gridChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FFF7ED' }]}
          onPress={() => setActiveSection('options')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FFEDD5' }]}>
            <Text style={styles.gridIcon}>🏠</Text>
          </View>
          <View style={styles.gridTextContainer}>
            <Text style={styles.gridTitle}>{isSpanish ? 'Opciones' : 'Options'}</Text>
            <Text style={styles.gridDescription}>
              {isSpanish ? 'Tipos de vivienda' : 'Housing types'}
            </Text>
          </View>
          <Text style={styles.gridChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FEF2F2' }]}
          onPress={() => setActiveSection('help')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FECACA' }]}>
            <Text style={styles.gridIcon}>📞</Text>
          </View>
          <View style={styles.gridTextContainer}>
            <Text style={styles.gridTitle}>{isSpanish ? 'Líneas de Ayuda' : 'Helplines'}</Text>
            <Text style={styles.gridDescription}>
              {isSpanish ? 'Números de emergencia' : 'Emergency numbers'}
            </Text>
          </View>
          <Text style={styles.gridChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Need Housing Now Banner - moved below the grid */}
      <TouchableOpacity
        style={styles.needNowBanner}
        onPress={() => {
          resetTriage();
          setActiveSection('needNow');
        }}
      >
        <View style={styles.needNowContent}>
          <Text style={styles.needNowIcon}>🏠</Text>
          <View style={styles.needNowTextContainer}>
            <Text style={styles.needNowTitle}>
              {isSpanish ? '¿Necesitas Vivienda Ahora?' : 'Need Housing Now?'}
            </Text>
            <Text style={styles.needNowSubtitle}>
              {isSpanish ? 'Toca aquí para ayuda inmediata' : 'Tap here for immediate help'}
            </Text>
          </View>
          <Text style={styles.needNowArrow}>→</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderForYou = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Para Ti' : 'For You'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Guías y recursos de vivienda' : 'Housing guides & resources'}
      </Text>

      {/* Personalized recommendations — actionable cards tied to intake answers */}
      <PersonalizedRecommendations
        profile={userProfile}
        category="housing"
        navigation={navigation}
      />
    </View>
  );

  const renderFind = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Refugios y Consejeros' : 'Shelters & Counselors'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {userProfile?.location?.city
          ? `${isSpanish ? 'En' : 'In'} ${userProfile.location.city}, ${userProfile.location.state}`
          : isSpanish ? 'Basado en tu ubicación' : 'Based on your location'}
      </Text>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterOpenNow && styles.filterChipActive]}
            onPress={() => setFilterOpenNow(!filterOpenNow)}
          >
            <Text style={[styles.filterChipText, filterOpenNow && styles.filterChipTextActive]}>
              🕐 {isSpanish ? 'Abierto Ahora' : 'Open Now'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterHasPhone && styles.filterChipActive]}
            onPress={() => setFilterHasPhone(!filterHasPhone)}
          >
            <Text style={[styles.filterChipText, filterHasPhone && styles.filterChipTextActive]}>
              📞 {isSpanish ? 'Con Teléfono' : 'Has Phone'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterEmergency && styles.filterChipActive]}
            onPress={() => setFilterEmergency(!filterEmergency)}
          >
            <Text style={[styles.filterChipText, filterEmergency && styles.filterChipTextActive]}>
              🆘 {isSpanish ? 'Refugio' : 'Shelter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterFamily && styles.filterChipActive]}
            onPress={() => setFilterFamily(!filterFamily)}
          >
            <Text style={[styles.filterChipText, filterFamily && styles.filterChipTextActive]}>
              👨‍👩‍👧 {isSpanish ? 'Familias' : 'Families'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results count */}
      {counselors.length > 0 && (
        <Text style={styles.resultsCount}>
          {filteredCounselors.length} {isSpanish ? 'de' : 'of'} {counselors.length} {isSpanish ? 'recursos' : 'resources'}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>
            {isSpanish ? 'Buscando recursos...' : 'Finding resources...'}
          </Text>
        </View>
      ) : filteredCounselors.length > 0 ? (
        filteredCounselors.map((counselor) => {
          const isExpanded = expandedCounselor === counselor.id;
          const openStatus = isResourceOpen(counselor.hours);
          const isCurated = counselor.id.startsWith('curated-');

          // Get icon based on type
          const getIcon = () => {
            if (counselor.id.includes('veteran')) return '🎖️';
            if (counselor.id.includes('youth') || counselor.id.includes('covenant')) return '👦';
            if (counselor.id.includes('family')) return '👨‍👩‍👧';
            if (counselor.id.includes('dv') || counselor.id.includes('domestic')) return '💜';
            if (counselor.id.includes('shelter') || counselor.id.includes('salvation')) return '🛏️';
            if (counselor.id.includes('211')) return '📞';
            if (counselor.id.startsWith('hud-')) return '🏛️';
            return '🏠';
          };

          return (
            <TouchableOpacity
              key={counselor.id}
              style={[
                styles.shelterCard,
                isCurated && styles.shelterCardCurated,
              ]}
              onPress={() => setExpandedCounselor(isExpanded ? null : counselor.id)}
              activeOpacity={0.7}
            >
              {/* Header */}
              <View style={styles.shelterHeader}>
                <View style={[
                  styles.shelterIconContainer,
                  { backgroundColor: openStatus.isOpen ? '#ECFDF5' : '#FEF2F2' }
                ]}>
                  <Text style={styles.shelterIcon}>{getIcon()}</Text>
                </View>
                <View style={styles.shelterInfo}>
                  <Text style={styles.shelterName}>{counselor.name}</Text>
                  {counselor.phone && (
                    <Text style={styles.shelterPhone}>{counselor.phone}</Text>
                  )}
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusBadge,
                      openStatus.isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed
                    ]}>
                      <Text style={[
                        styles.statusText,
                        openStatus.isOpen ? styles.statusTextOpen : styles.statusTextClosed
                      ]}>
                        {isSpanish ? openStatus.statusEs : openStatus.status}
                      </Text>
                    </View>
                    {isCurated && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ {isSpanish ? 'Verificado' : 'Verified'}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
              </View>

              {/* Expanded content */}
              {isExpanded && (
                <View style={styles.shelterExpanded}>
                  {/* Description */}
                  {counselor.description && (
                    <Text style={styles.shelterDescription}>{counselor.description}</Text>
                  )}

                  {/* Address */}
                  {counselor.address && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>📍 {isSpanish ? 'Dirección' : 'Address'}:</Text>
                      <Text style={styles.infoValue}>{counselor.address}</Text>
                    </View>
                  )}

                  {/* Hours */}
                  {counselor.hours && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>🕐 {isSpanish ? 'Horario' : 'Hours'}:</Text>
                      <Text style={styles.infoValue}>
                        {isSpanish ? counselor.hoursEs || counselor.hours : counselor.hours}
                      </Text>
                    </View>
                  )}

                  {/* Eligibility */}
                  {counselor.eligibility && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>✅ {isSpanish ? 'Elegibilidad' : 'Eligibility'}:</Text>
                      <Text style={styles.infoValue}>
                        {isSpanish ? counselor.eligibilityEs || counselor.eligibility : counselor.eligibility}
                      </Text>
                    </View>
                  )}

                  {/* Intake Info */}
                  {counselor.intakeInfo && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>📋 {isSpanish ? 'Admisión' : 'Intake'}:</Text>
                      <Text style={styles.infoValue}>
                        {isSpanish ? counselor.intakeInfoEs || counselor.intakeInfo : counselor.intakeInfo}
                      </Text>
                    </View>
                  )}

                  {/* Services */}
                  {counselor.servicesDetailed && counselor.servicesDetailed.length > 0 && (
                    <View style={styles.servicesSection}>
                      <Text style={styles.servicesTitle}>
                        {isSpanish ? 'Servicios Disponibles:' : 'Services Available:'}
                      </Text>
                      {(isSpanish ? counselor.servicesDetailedEs || counselor.servicesDetailed : counselor.servicesDetailed).map((service, idx) => (
                        <View key={idx} style={styles.serviceItem}>
                          <Text style={styles.serviceBullet}>•</Text>
                          <Text style={styles.serviceText}>{service}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Service tags */}
                  {counselor.services && counselor.services.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {counselor.services.slice(0, 4).map((service, idx) => (
                        <View key={idx} style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>{service}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.shelterActions}>
                    {counselor.phone && (
                      <TouchableOpacity
                        style={styles.primaryCallButton}
                        onPress={() => handleCall(counselor.phone!)}
                      >
                        <Text style={styles.primaryCallButtonText}>
                          📞 {isSpanish ? 'Llamar Ahora' : 'Call Now'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {counselor.website && (
                      <TouchableOpacity
                        style={styles.websiteButton}
                        onPress={() => Linking.openURL(counselor.website!)}
                      >
                        <Text style={styles.websiteButtonText}>
                          🌐 {isSpanish ? 'Sitio Web' : 'Website'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Add to todo */}
                  <TouchableOpacity
                    style={styles.addToTodoFullButton}
                    onPress={() => addToTodo(
                      `${isSpanish ? 'Contactar' : 'Contact'} ${counselor.name}`,
                      counselor.website,
                      counselor.phone
                    )}
                  >
                    <Text style={styles.addToTodoFullText}>
                      + {isSpanish ? 'Agregar a mi lista de tareas' : 'Add to my to-do list'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            {isSpanish
              ? 'No se encontraron recursos. Llama al 211 para obtener ayuda local.'
              : 'No resources found. Call 211 for local help.'}
          </Text>
          <TouchableOpacity
            style={styles.call211Button}
            onPress={() => handleCall('211')}
          >
            <Text style={styles.call211ButtonText}>📞 {isSpanish ? 'Llamar 211' : 'Call 211'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderOptions = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Programas de Vivienda' : 'Housing Programs'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Toca para ver cómo aplicar paso a paso' : 'Tap to see how to apply step by step'}
      </Text>

      {HOUSING_PROGRAMS.map((program) => {
        const isExpanded = expandedItem === program.id;

        return (
          <TouchableOpacity
            key={program.id}
            style={[styles.programCard, { borderLeftColor: program.color }]}
            onPress={() => setExpandedItem(isExpanded ? null : program.id)}
            activeOpacity={0.7}
          >
            <View style={styles.programHeader}>
              <View style={[styles.programIconContainer, { backgroundColor: `${program.color}20` }]}>
                <Text style={styles.programIcon}>{program.icon}</Text>
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programTitle}>
                  {isSpanish ? program.titleEs : program.title}
                </Text>
                <Text style={styles.programDescription}>
                  {isSpanish ? program.descriptionEs : program.description}
                </Text>
              </View>
              <Text style={styles.programExpandIcon}>{isExpanded ? '▼' : '▶'}</Text>
            </View>

            {isExpanded && (
              <View style={styles.programDetails}>
                {/* Step by step guide */}
                <Text style={styles.stepsTitle}>
                  {isSpanish ? 'Cómo Aplicar:' : 'How to Apply:'}
                </Text>

                {program.steps.map((step, index) => (
                  <View key={index} style={styles.stepContainer}>
                    <View style={[styles.stepNumber, { backgroundColor: program.color }]}>
                      <Text style={styles.stepNumberText}>{step.step}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>
                        {isSpanish ? step.titleEs : step.title}
                      </Text>
                      <Text style={styles.stepDetail}>
                        {isSpanish ? step.detailEs : step.detail}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Action buttons */}
                <View style={styles.programActions}>
                  <TouchableOpacity
                    style={[styles.programCallButton, { backgroundColor: program.color }]}
                    onPress={() => handleCall(program.phone)}
                  >
                    <Text style={styles.programCallButtonText}>
                      📞 {isSpanish ? 'Llamar' : 'Call'} {program.phone}
                    </Text>
                  </TouchableOpacity>

                  {program.website && (
                    <TouchableOpacity
                      style={styles.programWebButton}
                      onPress={() => Linking.openURL(program.website)}
                    >
                      <Text style={styles.programWebButtonText}>
                        🌐 {isSpanish ? 'Más Info' : 'More Info'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Add steps to to-do */}
                <TouchableOpacity
                  style={styles.addAllStepsButton}
                  onPress={() => {
                    program.steps.forEach((step) => {
                      dispatch({
                        type: 'ADD_TODO',
                        payload: {
                          title: `${isSpanish ? step.titleEs : step.title} - ${isSpanish ? program.titleEs : program.title}`,
                          completed: false,
                          category: 'housing',
                        },
                      });
                    });
                    Alert.alert(
                      isSpanish ? '¡Agregado!' : 'Added!',
                      isSpanish
                        ? `${program.steps.length} pasos agregados a tu lista`
                        : `${program.steps.length} steps added to your to-do list`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.addAllStepsText}>
                    + {isSpanish ? 'Agregar todos los pasos a mi lista' : 'Add all steps to my to-do list'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          {isSpanish
            ? 'Consejo: Aplica a múltiples programas para aumentar tus opciones. Las listas de espera pueden ser largas.'
            : 'Tip: Apply to multiple programs to increase your options. Waitlists can be long.'}
        </Text>
      </View>
    </View>
  );

  const renderHelp = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Ayuda Urgente' : 'Urgent Help'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Toca para llamar inmediatamente' : 'Tap to call immediately'}
      </Text>

      {HOUSING_HOTLINES.map((resource) => (
        <TouchableOpacity
          key={resource.id}
          style={styles.urgentCard}
          onPress={() => handleCall(resource.phone)}
        >
          <View style={styles.urgentIconContainer}>
            <Text style={styles.urgentIcon}>{resource.icon}</Text>
          </View>
          <View style={styles.urgentInfo}>
            <Text style={styles.urgentName}>
              {isSpanish ? resource.nameEs : resource.name}
            </Text>
            <Text style={styles.urgentDescription}>
              {isSpanish ? resource.descriptionEs : resource.description}
            </Text>
            <Text style={styles.urgentPhone}>{resource.phone}</Text>
          </View>
          <View style={styles.urgentCallButton}>
            <Text style={styles.urgentCallText}>📞</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.emergencyNote}>
        <Text style={styles.emergencyNoteText}>
          {isSpanish
            ? '⚠️ Si estás en peligro inmediato, llama al 911.'
            : '⚠️ If you are in immediate danger, call 911.'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏠 {isSpanish ? 'Vivienda' : 'Housing'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeSection === null && renderMainGrid()}
        {activeSection === 'foryou' && renderForYou()}
        {activeSection === 'find' && renderFind()}
        {activeSection === 'options' && renderOptions()}
        {activeSection === 'help' && renderHelp()}
        {activeSection === 'needNow' && renderNeedNow()}
      </ScrollView>
      {scrollToTopButton}
      <FloatingAIButton navigation={navigation} />
    </SafeAreaView>
  );

  function renderNeedNow() {
    const currentQuestion = HOUSING_TRIAGE[triageStep];
    const showResults = triageStep >= HOUSING_TRIAGE.length;
    const recommendation = showResults ? getTriageRecommendation() : null;

    return (
      <View style={styles.detailContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            resetTriage();
            setActiveSection(null);
          }}
        >
          <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
        </TouchableOpacity>

        {!showResults ? (
          <>
            <View style={styles.triageHeader}>
              <Text style={styles.triageEmoji}>🏠</Text>
              <Text style={styles.triageTitle}>
                {isSpanish ? 'Necesito Vivienda Ahora' : 'Need Housing Now'}
              </Text>
              <Text style={styles.triageProgress}>
                {triageStep + 1} / {HOUSING_TRIAGE.length}
              </Text>
            </View>

            <Text style={styles.triageQuestion}>
              {isSpanish ? currentQuestion.questionEs : currentQuestion.question}
            </Text>

            <View style={styles.triageOptions}>
              {currentQuestion.options.map((option: any) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.triageOption}
                  onPress={() => handleTriageAnswer(currentQuestion.id, option.id)}
                >
                  <Text style={styles.triageOptionText}>
                    {isSpanish ? option.labelEs : option.label}
                  </Text>
                  <Text style={styles.triageOptionArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.resultContainer}>
              <View
                style={[
                  styles.resultHeader,
                  recommendation?.urgency === 'immediate' && styles.resultHeaderUrgent,
                ]}
              >
                <Text style={styles.resultEmoji}>
                  {recommendation?.urgency === 'immediate' ? '🚨' : '🏠'}
                </Text>
                <Text style={styles.resultTitle}>{recommendation?.title}</Text>
              </View>

              <Text style={styles.resultMessage}>{recommendation?.message}</Text>

              <View style={styles.resultActions}>
                {recommendation?.actions.map((action: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.resultButton,
                      action.primary ? styles.resultButtonPrimary : styles.resultButtonSecondary,
                    ]}
                    onPress={() => handleCall(action.phone)}
                  >
                    <Text
                      style={[
                        styles.resultButtonText,
                        action.primary ? styles.resultButtonTextPrimary : styles.resultButtonTextSecondary,
                      ]}
                    >
                      📞 {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.additionalInfo}>
                <Text style={styles.additionalInfoTitle}>
                  {isSpanish ? 'Consejos Importantes' : 'Important Tips'}
                </Text>
                <Text style={styles.additionalInfoText}>
                  {isSpanish
                    ? '• Muchos refugios tienen horarios de registro (usualmente 5-8pm)\n• Trae identificación si la tienes\n• Pregunta sobre comidas, duchas y servicios de gestión de casos\n• Si estás en peligro, llama al 911'
                    : "• Many shelters have check-in times (usually 5-8pm)\n• Bring ID if you have it\n• Ask about meals, showers, and case management\n• If you're in danger, call 911"}
                </Text>
              </View>

              <TouchableOpacity style={styles.startOverButton} onPress={resetTriage}>
                <Text style={styles.startOverText}>
                  {isSpanish ? 'Empezar de Nuevo' : 'Start Over'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackText: {
    fontSize: 20,
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'column',
  },
  gridTextContainer: {
    flex: 1,
  },
  gridChevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '600',
    marginLeft: 8,
  },
  gridItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  gridIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gridIcon: {
    fontSize: 26,
  },
  gridTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridDescription: {
    fontSize: 13,
    color: '#64748B',
  },
  detailContainer: {
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  detailSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  // Intake summary card - reflects intake-form answers
  intakeSummaryCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  intakeSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intakeSummaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intakeSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    gap: 8,
  },
  intakeSummaryChipIcon: {
    fontSize: 18,
  },
  intakeSummaryChipLabel: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  intakeSummaryChipValue: {
    fontSize: 13,
    color: '#4C1D95',
    fontWeight: '700',
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  resourceIcon: {
    fontSize: 24,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  expandIcon: {
    fontSize: 12,
    color: '#94A3B8',
  },
  resourceDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailBullet: {
    fontSize: 14,
    color: '#7C3AED',
    marginRight: 8,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  counselorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  counselorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  counselorIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  counselorInfo: {
    flex: 1,
  },
  counselorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  counselorAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  counselorDistance: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  counselorDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  counselorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
  },
  addTodoButton: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addTodoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionType: {
    fontSize: 14,
    color: '#64748B',
  },
  optionFooter: {
    flexDirection: 'row',
  },
  availabilityTag: {
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
    lineHeight: 20,
  },
  // Program card styles for housing programs
  programCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  programIcon: {
    fontSize: 26,
  },
  programInfo: {
    flex: 1,
  },
  programTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  programDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  programExpandIcon: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 8,
  },
  programDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDetail: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  programActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  programCallButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  programCallButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  programWebButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  programWebButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  addAllStepsButton: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addAllStepsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  urgentIcon: {
    fontSize: 28,
  },
  urgentInfo: {
    flex: 1,
  },
  urgentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  urgentDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  urgentPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  urgentCallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentCallText: {
    fontSize: 20,
  },
  emergencyNote: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyNoteText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Need Housing Now Banner
  needNowBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  needNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  needNowIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  needNowTextContainer: {
    flex: 1,
  },
  needNowTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  needNowSubtitle: {
    fontSize: 14,
    color: '#FECACA',
  },
  needNowArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Triage styles
  triageHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  triageEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  triageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  triageProgress: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  triageQuestion: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 30,
  },
  triageOptions: {
    gap: 12,
  },
  triageOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  triageOptionText: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
    fontWeight: '600',
  },
  triageOptionArrow: {
    fontSize: 20,
    color: '#7C3AED',
    fontWeight: '600',
  },
  // Result styles
  resultContainer: {
    alignItems: 'center',
  },
  resultHeader: {
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  resultHeaderUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  resultActions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  resultButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  resultButtonPrimary: {
    backgroundColor: '#DC2626',
  },
  resultButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultButtonTextPrimary: {
    color: '#FFFFFF',
  },
  resultButtonTextSecondary: {
    color: '#475569',
  },
  additionalInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  startOverButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  startOverText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  // Expandable Shelter Card styles
  shelterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  shelterCardCurated: {
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  shelterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shelterIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shelterIcon: {
    fontSize: 26,
  },
  shelterInfo: {
    flex: 1,
  },
  shelterName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  shelterPhone: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeOpen: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeClosed: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: '#059669',
  },
  statusTextClosed: {
    color: '#DC2626',
  },
  verifiedBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  expandArrow: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 8,
  },
  shelterExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shelterDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  servicesSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  serviceBullet: {
    fontSize: 14,
    color: '#7C3AED',
    marginRight: 8,
    fontWeight: '700',
  },
  serviceText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  serviceTag: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  serviceTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  shelterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryCallButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryCallButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  websiteButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  addToTodoFullButton: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addToTodoFullText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  call211Button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  call211ButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Filter styles
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  // Youth Shelter Banner styles
  youthShelterBanner: {
    backgroundColor: '#EDE9FE',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#C4B5FD',
  },
  youthShelterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  youthShelterEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  youthShelterTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5B21B6',
  },
  youthShelterChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5B21B6',
    marginLeft: 8,
  },
  youthShelterMessage: {
    fontSize: 15,
    color: '#6B21A8',
    lineHeight: 22,
    marginBottom: 16,
  },
  youthShelterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  youthShelterCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youthShelterInfo: {
    flex: 1,
  },
  youthShelterName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  youthShelterDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 6,
  },
  youthShelterPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
  },
  youthCallIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  youthCallIconText: {
    fontSize: 20,
  },
  youthSafelineCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  youthSafelineEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  youthSafelineInfo: {
    marginBottom: 12,
  },
  youthSafelineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  youthSafelineDesc: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 20,
  },
  youthSafelineButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  youthSafelineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
