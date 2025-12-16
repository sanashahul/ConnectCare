import React, { useState, useEffect } from 'react';
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
import { getHealthcareResources } from '../../services';
import { Resource } from '../../types';

type HealthScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

// For You content - personalized health resources
const HEALTH_FOR_YOU = [
  {
    id: 'hfy1',
    title: 'Understanding Medicaid',
    titleEs: 'Entendiendo Medicaid',
    description: 'Free or low-cost health coverage for eligible individuals',
    descriptionEs: 'Cobertura de salud gratuita o de bajo costo',
    icon: '🏥',
    color: '#0D9488',
    details: [
      'Government program providing free or low-cost health coverage',
      'Eligibility based on income, family size, and other factors',
      'Coverage includes doctor visits, hospital stays, prescriptions',
      'Apply at healthcare.gov or local Department of Social Services',
    ],
    detailsEs: [
      'Programa gubernamental que proporciona cobertura de salud gratuita o de bajo costo',
      'Elegibilidad basada en ingresos, tamaño de la familia y otros factores',
      'Cobertura incluye visitas al médico, hospitalizaciones, recetas',
      'Aplica en healthcare.gov o tu Departamento de Servicios Sociales local',
    ],
  },
  {
    id: 'hfy2',
    title: 'Free & Low-Cost Clinics',
    titleEs: 'Clínicas Gratuitas y de Bajo Costo',
    description: 'Where to get care without insurance',
    descriptionEs: 'Dónde obtener atención sin seguro',
    icon: '💊',
    color: '#7C3AED',
    details: [
      'Federally Qualified Health Centers (FQHCs) serve everyone',
      'Free clinics run by volunteers and nonprofits',
      'Sliding scale fees - you pay based on your income',
      'Call 211 to find free clinics in your area',
    ],
    detailsEs: [
      'Los Centros de Salud Federalmente Calificados (FQHCs) atienden a todos',
      'Clínicas gratuitas operadas por voluntarios y organizaciones sin fines de lucro',
      'Tarifas de escala móvil - pagas según tus ingresos',
      'Llama al 211 para encontrar clínicas gratuitas en tu área',
    ],
  },
  {
    id: 'hfy3',
    title: 'Mental Health Support',
    titleEs: 'Apoyo de Salud Mental',
    description: '24/7 crisis support and counseling options',
    descriptionEs: 'Apoyo de crisis 24/7 y opciones de consejería',
    icon: '🧠',
    color: '#EA580C',
    details: [
      '988 - Suicide & Crisis Lifeline (24/7)',
      'Community Mental Health Centers offer sliding-scale services',
      'Free apps: Woebot, MindShift for daily support',
      'Many FQHCs offer mental health services',
    ],
    detailsEs: [
      '988 - Línea de Prevención del Suicidio y Crisis (24/7)',
      'Centros de Salud Mental Comunitarios ofrecen servicios de escala móvil',
      'Aplicaciones gratuitas: Woebot, MindShift para apoyo diario',
      'Muchos FQHCs ofrecen servicios de salud mental',
    ],
  },
  {
    id: 'hfy4',
    title: 'Prescription Assistance',
    titleEs: 'Asistencia con Recetas',
    description: 'Get medications at lower cost',
    descriptionEs: 'Obtén medicamentos a menor costo',
    icon: '💉',
    color: '#DC2626',
    details: [
      'NeedyMeds.org - Database of discount programs',
      'GoodRx - Free discount coupons at pharmacies',
      'Walmart $4 generics program',
      'Manufacturer patient assistance programs',
    ],
    detailsEs: [
      'NeedyMeds.org - Base de datos de programas de descuento',
      'GoodRx - Cupones de descuento gratuitos en farmacias',
      'Programa de genéricos de $4 de Walmart',
      'Programas de asistencia de pacientes del fabricante',
    ],
  },
];

// Health Triage Questions
const HEALTH_TRIAGE = [
  {
    id: 'issue',
    question: 'What type of health issue do you have?',
    questionEs: '¿Qué tipo de problema de salud tienes?',
    options: [
      { id: 'physical', label: 'Physical illness or injury', labelEs: 'Enfermedad física o lesión', type: 'physical' },
      { id: 'mental', label: 'Mental health or emotional crisis', labelEs: 'Salud mental o crisis emocional', type: 'mental' },
      { id: 'medication', label: 'Need medication or prescriptions', labelEs: 'Necesito medicamentos o recetas', type: 'medication' },
      { id: 'dental', label: 'Dental pain or problem', labelEs: 'Dolor o problema dental', type: 'dental' },
      { id: 'checkup', label: 'Need a check-up or preventive care', labelEs: 'Necesito un chequeo o atención preventiva', type: 'checkup' },
    ],
  },
  {
    id: 'urgency',
    question: 'How urgent is this?',
    questionEs: '¿Qué tan urgente es esto?',
    options: [
      { id: 'emergency', label: 'Emergency - life-threatening', labelEs: 'Emergencia - pone en peligro la vida', level: 'emergency' },
      { id: 'urgent', label: 'Urgent - need care within 24 hours', labelEs: 'Urgente - necesito atención en 24 horas', level: 'urgent' },
      { id: 'soon', label: 'Can wait a few days', labelEs: 'Puede esperar unos días', level: 'soon' },
      { id: 'routine', label: 'Routine - just need an appointment', labelEs: 'Rutina - solo necesito una cita', level: 'routine' },
    ],
  },
  {
    id: 'insurance',
    question: 'Do you have health insurance?',
    questionEs: '¿Tienes seguro de salud?',
    options: [
      { id: 'yes', label: 'Yes, I have insurance', labelEs: 'Sí, tengo seguro', status: 'insured' },
      { id: 'medicaid', label: 'I have Medicaid/Medicare', labelEs: 'Tengo Medicaid/Medicare', status: 'public' },
      { id: 'no', label: 'No, I don\'t have insurance', labelEs: 'No, no tengo seguro', status: 'uninsured' },
      { id: 'unsure', label: 'I\'m not sure', labelEs: 'No estoy seguro', status: 'unsure' },
    ],
  },
];

// Emergency resources
const URGENT_RESOURCES = [
  { id: 'u1', name: 'Emergency: 911', nameEs: 'Emergencia: 911', description: 'Life-threatening emergencies', descriptionEs: 'Emergencias que amenazan la vida', phone: '911', icon: '🚨' },
  { id: 'u2', name: 'Suicide & Crisis Lifeline', nameEs: 'Línea de Crisis', description: '24/7 mental health crisis support', descriptionEs: 'Apoyo de crisis de salud mental 24/7', phone: '988', icon: '💚' },
  { id: 'u3', name: 'Poison Control', nameEs: 'Control de Venenos', description: 'Poisoning emergencies', descriptionEs: 'Emergencias por envenenamiento', phone: '1-800-222-1222', icon: '☠️' },
  { id: 'u4', name: 'SAMHSA Helpline', nameEs: 'Línea de Ayuda SAMHSA', description: 'Substance abuse help 24/7', descriptionEs: 'Ayuda con abuso de sustancias 24/7', phone: '1-800-662-4357', icon: '🤝' },
];

export const HealthScreen: React.FC<HealthScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [activeSection, setActiveSection] = useState<'foryou' | 'clinics' | 'urgent' | 'needNow' | null>(null);
  const [clinics, setClinics] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [triageStep, setTriageStep] = useState(0);
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});
  // Filter states
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterWalkIn, setFilterWalkIn] = useState(false);
  const [filterFree, setFilterFree] = useState(false);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;

  // Get current day and check if clinic is open (defined before getFilteredClinics)
  const getCurrentDay = (): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  const isClinicOpen = (clinic: Resource): boolean => {
    if (clinic.isOpen !== undefined) return clinic.isOpen;
    if (!clinic.hours) return true; // Assume open if no hours info
    const today = getCurrentDay();
    const todayHours = clinic.hours[today as keyof typeof clinic.hours];
    if (!todayHours || todayHours.toLowerCase() === 'closed') return false;

    // Simple time check (assumes format like "8:00 AM - 5:00 PM")
    const now = new Date();
    const currentHour = now.getHours();
    // Most clinics are open 8am-5pm, so rough estimate
    return currentHour >= 8 && currentHour < 17;
  };

  const getDayName = (day: string): string => {
    const dayNames: Record<string, { en: string; es: string }> = {
      monday: { en: 'Monday', es: 'Lunes' },
      tuesday: { en: 'Tuesday', es: 'Martes' },
      wednesday: { en: 'Wednesday', es: 'Miércoles' },
      thursday: { en: 'Thursday', es: 'Jueves' },
      friday: { en: 'Friday', es: 'Viernes' },
      saturday: { en: 'Saturday', es: 'Sábado' },
      sunday: { en: 'Sunday', es: 'Domingo' },
    };
    return isSpanish ? dayNames[day]?.es : dayNames[day]?.en;
  };

  // Filter clinics based on active filters
  const getFilteredClinics = () => {
    let filtered = clinics;

    if (filterHasPhone) {
      filtered = filtered.filter(c => c.phone);
    }

    if (filterOpenNow) {
      filtered = filtered.filter(c => isClinicOpen(c));
    }

    if (filterWalkIn) {
      filtered = filtered.filter(c => c.acceptsWalkIns === true);
    }

    if (filterFree) {
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes('free') ||
        c.description?.toLowerCase().includes('free') ||
        c.description?.toLowerCase().includes('sliding') ||
        c.description?.toLowerCase().includes('low-cost') ||
        c.description?.toLowerCase().includes('no cost')
      );
    }

    return filtered;
  };

  const filteredClinics = getFilteredClinics();

  const addToTodo = (title: string, resourceUrl?: string, resourcePhone?: string) => {
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title,
        completed: false,
        category: 'healthcare',
        resourceType: 'clinic',
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

  const loadClinics = async () => {
    if (!userProfile?.location) return;
    setIsLoading(true);
    try {
      const results = await getHealthcareResources(userProfile.location);
      setClinics(results);
    } catch (error) {
      console.error('Error loading clinics:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeSection === 'clinics' && clinics.length === 0) {
      loadClinics();
    }
  }, [activeSection]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleTriageAnswer = (questionId: string, answerId: string) => {
    setTriageAnswers({ ...triageAnswers, [questionId]: answerId });
    if (triageStep < HEALTH_TRIAGE.length - 1) {
      setTriageStep(triageStep + 1);
    } else {
      setTriageStep(HEALTH_TRIAGE.length); // Show results
    }
  };

  const resetTriage = () => {
    setTriageStep(0);
    setTriageAnswers({});
  };

  const getTriageRecommendation = () => {
    const issue = triageAnswers.issue;
    const urgency = triageAnswers.urgency;
    const insurance = triageAnswers.insurance;

    // Emergency case
    if (urgency === 'emergency') {
      return {
        title: isSpanish ? '¡Llama al 911 Ahora!' : 'Call 911 Now!',
        subtitle: isSpanish ? 'Si es una emergencia que pone en peligro tu vida' : 'If this is a life-threatening emergency',
        color: '#DC2626',
        icon: '🚨',
        actions: [
          { label: isSpanish ? 'Llamar al 911' : 'Call 911', phone: '911', primary: true },
        ],
        tips: isSpanish
          ? ['Mantente en la línea con el operador', 'Proporciona tu ubicación exacta', 'Sigue las instrucciones del operador']
          : ['Stay on the line with the operator', 'Provide your exact location', 'Follow the operator\'s instructions'],
      };
    }

    // Mental health crisis
    if (issue === 'mental') {
      return {
        title: isSpanish ? 'Apoyo de Salud Mental' : 'Mental Health Support',
        subtitle: isSpanish ? 'Ayuda disponible 24/7' : 'Help available 24/7',
        color: '#7C3AED',
        icon: '💚',
        actions: [
          { label: isSpanish ? 'Línea de Crisis 988' : 'Crisis Line 988', phone: '988', primary: true },
          { label: 'SAMHSA: 1-800-662-4357', phone: '1-800-662-4357', primary: false },
        ],
        tips: isSpanish
          ? ['988 está disponible 24/7 en español e inglés', 'También puedes enviar un mensaje de texto al 988', 'Está bien pedir ayuda']
          : ['988 is available 24/7 in English and Spanish', 'You can also text 988', 'It\'s okay to ask for help'],
      };
    }

    // Urgent physical issue - uninsured
    if (urgency === 'urgent' && (insurance === 'no' || insurance === 'unsure')) {
      return {
        title: isSpanish ? 'Atención Urgente Sin Seguro' : 'Urgent Care Without Insurance',
        subtitle: isSpanish ? 'Opciones de bajo costo disponibles' : 'Low-cost options available',
        color: '#EA580C',
        icon: '🏥',
        actions: [
          { label: isSpanish ? 'Llamar al 211 para clínicas gratuitas' : 'Call 211 for free clinics', phone: '211', primary: true },
        ],
        tips: isSpanish
          ? ['Los centros de salud comunitarios atienden a todos sin importar su capacidad de pago', 'Las salas de emergencia no pueden rechazarte', 'Pregunta sobre tarifas de escala móvil', 'Algunos hospitales ofrecen programas de caridad']
          : ['Community health centers serve everyone regardless of ability to pay', 'Emergency rooms cannot turn you away', 'Ask about sliding scale fees', 'Some hospitals offer charity care programs'],
      };
    }

    // Medication needs
    if (issue === 'medication') {
      return {
        title: isSpanish ? 'Asistencia con Medicamentos' : 'Medication Assistance',
        subtitle: isSpanish ? 'Formas de obtener medicamentos asequibles' : 'Ways to get affordable medications',
        color: '#0D9488',
        icon: '💊',
        actions: [
          { label: isSpanish ? 'Llamar al 211 para asistencia' : 'Call 211 for assistance', phone: '211', primary: true },
        ],
        tips: isSpanish
          ? ['GoodRx ofrece cupones de descuento gratuitos', 'Walmart tiene programa de genéricos de $4', 'Pregunta a tu médico sobre muestras gratuitas', 'NeedyMeds.org tiene programas de asistencia']
          : ['GoodRx offers free discount coupons', 'Walmart has $4 generics program', 'Ask your doctor about free samples', 'NeedyMeds.org has assistance programs'],
      };
    }

    // Dental issue
    if (issue === 'dental') {
      return {
        title: isSpanish ? 'Ayuda Dental' : 'Dental Help',
        subtitle: isSpanish ? 'Opciones de atención dental' : 'Dental care options',
        color: '#0891B2',
        icon: '🦷',
        actions: [
          { label: isSpanish ? 'Llamar al 211 para clínicas dentales' : 'Call 211 for dental clinics', phone: '211', primary: true },
        ],
        tips: isSpanish
          ? ['Las escuelas de odontología ofrecen atención de bajo costo', 'Los centros de salud comunitarios a menudo tienen servicios dentales', 'Para dolor severo, la sala de emergencias puede ayudar', 'Pregunta sobre días de clínica dental gratuita']
          : ['Dental schools offer low-cost care', 'Community health centers often have dental services', 'For severe pain, the ER can help', 'Ask about free dental clinic days'],
      };
    }

    // Default - routine care
    return {
      title: isSpanish ? 'Encuentra Atención' : 'Find Care',
      subtitle: isSpanish ? 'Opciones basadas en tu situación' : 'Options based on your situation',
      color: '#0D9488',
      icon: '🏥',
      actions: [
        { label: isSpanish ? 'Llamar al 211 para recursos locales' : 'Call 211 for local resources', phone: '211', primary: true },
      ],
      tips: insurance === 'insured' || insurance === 'public'
        ? (isSpanish
          ? ['Llama a tu compañía de seguro para encontrar proveedores en tu red', 'Pregunta sobre clínicas de atención urgente', 'Verifica las tarifas de copago antes de tu visita']
          : ['Call your insurance company to find in-network providers', 'Ask about urgent care clinics', 'Check copay rates before your visit'])
        : (isSpanish
          ? ['Los centros de salud comunitarios atienden a todos', 'Pregunta sobre tarifas de escala móvil', 'Consulta sobre elegibilidad para Medicaid']
          : ['Community health centers serve everyone', 'Ask about sliding scale fees', 'Check Medicaid eligibility']),
    };
  };

  const renderMainGrid = () => (
    <View style={styles.gridContainer}>
      {/* Need Health Help Now Banner */}
      <TouchableOpacity
        style={styles.needNowBanner}
        onPress={() => {
          resetTriage();
          setActiveSection('needNow');
        }}
      >
        <View style={styles.needNowContent}>
          <Text style={styles.needNowIcon}>🏥</Text>
          <View style={styles.needNowText}>
            <Text style={styles.needNowTitle}>
              {isSpanish ? '¿Necesitas Ayuda de Salud?' : 'Need Health Help?'}
            </Text>
            <Text style={styles.needNowSubtitle}>
              {isSpanish ? 'Toca aquí para encontrar atención' : 'Tap here to find care'}
            </Text>
          </View>
          <Text style={styles.needNowArrow}>→</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {isSpanish ? 'Recursos de Salud' : 'Health Resources'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {isSpanish ? 'Toca una categoría para explorar' : 'Tap a category to explore'}
      </Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#F0FDFA' }]}
          onPress={() => setActiveSection('foryou')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#CCFBF1' }]}>
            <Text style={styles.gridIcon}>⭐</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Para Ti' : 'For You'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Recursos personalizados' : 'Personalized resources'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#F5F3FF' }]}
          onPress={() => setActiveSection('clinics')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.gridIcon}>🔍</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Buscar Clínicas' : 'Find Clinics'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Cerca de ti' : 'Near you'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FEF2F2' }]}
          onPress={() => setActiveSection('urgent')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FECACA' }]}>
            <Text style={styles.gridIcon}>🚨</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Necesito Ayuda Ahora' : 'Need Help Now'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Recursos de emergencia' : 'Emergency resources'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FFF7ED' }]}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FFEDD5' }]}>
            <Text style={styles.gridIcon}>📋</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Mis Tareas' : 'My To-Dos'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Ver lista de tareas' : 'View task list'}
          </Text>
        </TouchableOpacity>
      </View>
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
        {isSpanish ? 'Recursos de salud personalizados' : 'Personalized health resources'}
      </Text>

      {HEALTH_FOR_YOU.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.resourceCard}
          onPress={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
        >
          <View style={styles.resourceHeader}>
            <View style={[styles.resourceIconContainer, { backgroundColor: `${item.color}20` }]}>
              <Text style={styles.resourceIcon}>{item.icon}</Text>
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>
                {isSpanish ? item.titleEs : item.title}
              </Text>
              <Text style={styles.resourceDescription}>
                {isSpanish ? item.descriptionEs : item.description}
              </Text>
            </View>
            <Text style={styles.expandIcon}>{expandedItem === item.id ? '▼' : '▶'}</Text>
          </View>

          {expandedItem === item.id && (
            <View style={styles.resourceDetails}>
              {(isSpanish ? item.detailsEs : item.details).map((detail, index) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={styles.detailBullet}>•</Text>
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderClinics = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Clínicas Cerca de Ti' : 'Clinics Near You'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {userProfile?.location?.city
          ? `${isSpanish ? 'En' : 'In'} ${userProfile.location.city}, ${userProfile.location.state}`
          : isSpanish ? 'Basado en tu ubicación' : 'Based on your location'}
      </Text>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>{isSpanish ? 'Abierto' : 'Open'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>{isSpanish ? 'Cerrado' : 'Closed'}</Text>
        </View>
        <Text style={styles.legendHint}>
          {isSpanish ? 'Toca para ver detalles' : 'Tap for details'}
        </Text>
      </View>

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
            style={[styles.filterChip, filterWalkIn && styles.filterChipActive]}
            onPress={() => setFilterWalkIn(!filterWalkIn)}
          >
            <Text style={[styles.filterChipText, filterWalkIn && styles.filterChipTextActive]}>
              🚶 {isSpanish ? 'Sin Cita' : 'Walk-ins'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterFree && styles.filterChipActive]}
            onPress={() => setFilterFree(!filterFree)}
          >
            <Text style={[styles.filterChipText, filterFree && styles.filterChipTextActive]}>
              💚 {isSpanish ? 'Gratis' : 'Free'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results count */}
      {clinics.length > 0 && (
        <Text style={styles.resultsCount}>
          {filteredClinics.length} {isSpanish ? 'de' : 'of'} {clinics.length} {isSpanish ? 'clínicas' : 'clinics'}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>
            {isSpanish ? 'Buscando clínicas...' : 'Finding clinics...'}
          </Text>
        </View>
      ) : filteredClinics.length > 0 ? (
        filteredClinics.map((clinic) => {
          const isOpen = isClinicOpen(clinic);
          const isExpanded = expandedClinic === clinic.id;

          return (
            <TouchableOpacity
              key={clinic.id}
              style={[styles.clinicCard, isExpanded && styles.clinicCardExpanded]}
              onPress={() => setExpandedClinic(isExpanded ? null : clinic.id)}
              activeOpacity={0.7}
            >
              {/* Open/Closed Status Badge */}
              <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
                <Text style={styles.statusText}>
                  {isOpen ? (isSpanish ? 'ABIERTO' : 'OPEN') : (isSpanish ? 'CERRADO' : 'CLOSED')}
                </Text>
              </View>

              <View style={styles.clinicHeader}>
                <Text style={styles.clinicIcon}>🏥</Text>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  {clinic.address && (
                    <Text style={styles.clinicAddress}>{clinic.address}</Text>
                  )}
                  <View style={styles.clinicMetaRow}>
                    {clinic.distance !== undefined && clinic.distance > 0 && (
                      <Text style={styles.clinicDistance}>
                        📍 {clinic.distance.toFixed(1)} {isSpanish ? 'mi' : 'mi'}
                      </Text>
                    )}
                    {clinic.phone && (
                      <Text style={styles.clinicPhone}>📞 {clinic.phone}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.expandArrow}>{isExpanded ? '▼' : '▶'}</Text>
              </View>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.clinicDetails}>
                  {/* Description */}
                  {clinic.description && (
                    <View style={styles.clinicSection}>
                      <Text style={styles.clinicSectionTitle}>
                        {isSpanish ? 'Acerca de' : 'About'}
                      </Text>
                      <Text style={styles.clinicSectionText}>{clinic.description}</Text>
                    </View>
                  )}

                  {/* Services */}
                  {clinic.services && clinic.services.length > 0 && (
                    <View style={styles.clinicSection}>
                      <Text style={styles.clinicSectionTitle}>
                        {isSpanish ? 'Servicios' : 'Services'}
                      </Text>
                      <View style={styles.servicesContainer}>
                        {clinic.services.map((service, idx) => (
                          <View key={idx} style={styles.serviceTag}>
                            <Text style={styles.serviceText}>{service}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Hours */}
                  <View style={styles.clinicSection}>
                    <Text style={styles.clinicSectionTitle}>
                      {isSpanish ? 'Horario' : 'Hours'}
                    </Text>
                    {clinic.hours ? (
                      <View style={styles.hoursContainer}>
                        {Object.entries(clinic.hours).map(([day, hours]) => (
                          <View key={day} style={[
                            styles.hoursRow,
                            getCurrentDay() === day && styles.hoursRowToday
                          ]}>
                            <Text style={[
                              styles.hoursDay,
                              getCurrentDay() === day && styles.hoursDayToday
                            ]}>
                              {getDayName(day)}
                            </Text>
                            <Text style={[
                              styles.hoursTime,
                              getCurrentDay() === day && styles.hoursTimeToday
                            ]}>
                              {hours || (isSpanish ? 'Cerrado' : 'Closed')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.hoursNote}>
                        {isSpanish
                          ? 'Horario típico: Lun-Vie 8am-5pm. Llame para confirmar.'
                          : 'Typical hours: Mon-Fri 8am-5pm. Call to confirm.'}
                      </Text>
                    )}
                  </View>

                  {/* Languages if available */}
                  {clinic.languages && clinic.languages.length > 0 && (
                    <View style={styles.clinicSection}>
                      <Text style={styles.clinicSectionTitle}>
                        {isSpanish ? 'Idiomas' : 'Languages'}
                      </Text>
                      <Text style={styles.clinicSectionText}>
                        {clinic.languages.join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.clinicActions}>
                    {clinic.phone && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCall(clinic.phone!)}
                      >
                        <Text style={styles.callButtonText}>📞 {isSpanish ? 'Llamar' : 'Call'}</Text>
                      </TouchableOpacity>
                    )}
                    {clinic.website && (
                      <TouchableOpacity
                        style={styles.websiteButton}
                        onPress={() => Linking.openURL(clinic.website!)}
                      >
                        <Text style={styles.websiteButtonText}>🌐 {isSpanish ? 'Sitio Web' : 'Website'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Add to To-Do - especially if closed */}
                  <TouchableOpacity
                    style={[styles.addTodoButtonLarge, !isOpen && styles.addTodoButtonHighlight]}
                    onPress={() => addToTodo(
                      isOpen
                        ? `${isSpanish ? 'Visitar' : 'Visit'} ${clinic.name}`
                        : `${isSpanish ? 'Llamar a' : 'Call'} ${clinic.name} ${isSpanish ? 'cuando abra' : 'when they open'}`,
                      clinic.website,
                      clinic.phone
                    )}
                  >
                    <Text style={[styles.addTodoButtonLargeText, !isOpen && styles.addTodoButtonHighlightText]}>
                      {!isOpen
                        ? (isSpanish ? '+ Recordarme llamar cuando abra' : '+ Remind me to call when open')
                        : (isSpanish ? '+ Agregar a mi lista' : '+ Add to my to-do list')
                      }
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
              ? 'No se encontraron clínicas. Intenta llamar al 211 para obtener recursos locales.'
              : 'No clinics found. Try calling 211 for local resources.'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderUrgent = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Ayuda de Emergencia' : 'Emergency Help'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Toca para llamar inmediatamente' : 'Tap to call immediately'}
      </Text>

      {URGENT_RESOURCES.map((resource) => (
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
            ? '⚠️ Si tienes una emergencia que pone en peligro tu vida, llama al 911 inmediatamente.'
            : '⚠️ If you have a life-threatening emergency, call 911 immediately.'}
        </Text>
      </View>
    </View>
  );

  const renderNeedNow = () => {
    const currentQuestion = HEALTH_TRIAGE[triageStep];
    const showResults = triageStep >= HEALTH_TRIAGE.length;

    if (showResults) {
      const recommendation = getTriageRecommendation();
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

          {/* Results Card */}
          <View style={[styles.resultCard, { borderColor: recommendation.color }]}>
            <View style={[styles.resultHeader, { backgroundColor: recommendation.color }]}>
              <Text style={styles.resultIcon}>{recommendation.icon}</Text>
              <View>
                <Text style={styles.resultTitle}>{recommendation.title}</Text>
                <Text style={styles.resultSubtitle}>{recommendation.subtitle}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              {recommendation.actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.resultActionButton,
                    action.primary
                      ? { backgroundColor: recommendation.color }
                      : { backgroundColor: '#F1F5F9' },
                  ]}
                  onPress={() => handleCall(action.phone)}
                >
                  <Text
                    style={[
                      styles.resultActionText,
                      action.primary ? { color: '#FFFFFF' } : { color: '#0F172A' },
                    ]}
                  >
                    📞 {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tips */}
            <View style={styles.resultTips}>
              <Text style={styles.resultTipsTitle}>
                {isSpanish ? 'Consejos Importantes:' : 'Important Tips:'}
              </Text>
              {recommendation.tips.map((tip, index) => (
                <View key={index} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Start Over Button */}
          <TouchableOpacity style={styles.startOverButton} onPress={resetTriage}>
            <Text style={styles.startOverText}>
              {isSpanish ? 'Responder Preguntas de Nuevo' : 'Answer Questions Again'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

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

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {HEALTH_TRIAGE.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= triageStep ? styles.progressDotActive : {},
              ]}
            />
          ))}
        </View>

        <Text style={styles.triageTitle}>
          {isSpanish ? currentQuestion.questionEs : currentQuestion.question}
        </Text>
        <Text style={styles.triageSubtitle}>
          {isSpanish ? 'Selecciona una opción' : 'Select an option'}
        </Text>

        {/* Options */}
        {currentQuestion.options.map((option) => (
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

        {/* Emergency Note */}
        <View style={styles.triageEmergencyNote}>
          <Text style={styles.triageEmergencyText}>
            {isSpanish
              ? '🚨 Si tienes una emergencia que pone en peligro tu vida, llama al 911 ahora.'
              : '🚨 If you have a life-threatening emergency, call 911 now.'}
          </Text>
          <TouchableOpacity
            style={styles.call911Button}
            onPress={() => handleCall('911')}
          >
            <Text style={styles.call911Text}>
              {isSpanish ? 'Llamar 911' : 'Call 911'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏥 {isSpanish ? 'Salud' : 'Health'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === null && renderMainGrid()}
        {activeSection === 'foryou' && renderForYou()}
        {activeSection === 'clinics' && renderClinics()}
        {activeSection === 'urgent' && renderUrgent()}
        {activeSection === 'needNow' && renderNeedNow()}
      </ScrollView>
    </SafeAreaView>
  );
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gridIcon: {
    fontSize: 28,
  },
  gridTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
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
    color: '#0D9488',
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
    color: '#0D9488',
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
  clinicCard: {
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
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clinicIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  clinicAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  clinicDistance: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
  },
  clinicCardExpanded: {
    borderColor: '#0D9488',
    borderWidth: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clinicMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  clinicPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  expandArrow: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 8,
  },
  clinicDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  clinicSection: {
    marginBottom: 16,
  },
  clinicSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  clinicSectionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  serviceText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
  },
  hoursContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hoursRowToday: {
    backgroundColor: '#F0FDFA',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  hoursDay: {
    fontSize: 13,
    color: '#64748B',
  },
  hoursDayToday: {
    color: '#0D9488',
    fontWeight: '700',
  },
  hoursTime: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  hoursTimeToday: {
    color: '#0D9488',
    fontWeight: '700',
  },
  hoursNote: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  websiteButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  addTodoButtonLarge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addTodoButtonLargeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  addTodoButtonHighlight: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  addTodoButtonHighlightText: {
    color: '#92400E',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: '#64748B',
  },
  legendHint: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  callButton: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D9488',
  },
  clinicActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
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
  // Need Now Banner Styles
  needNowBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  needNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  needNowIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  needNowText: {
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
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Triage Styles
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#0D9488',
  },
  triageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  triageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  triageOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  triageOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  triageOptionArrow: {
    fontSize: 18,
    color: '#0D9488',
    fontWeight: '700',
  },
  triageEmergencyNote: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  triageEmergencyText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  call911Button: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  call911Text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Result Styles
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  resultHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  resultActions: {
    padding: 20,
    gap: 12,
  },
  resultActionButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  resultActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultTips: {
    padding: 20,
    paddingTop: 0,
  },
  resultTipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#0D9488',
    marginRight: 8,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  startOverButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  startOverText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
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
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
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
});
