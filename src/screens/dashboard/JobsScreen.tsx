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
import { AIAssistant } from '../../components/AIAssistant';
import { CasyResources } from '../../components/CasyResources';
import { getEmploymentResources } from '../../services';
import { Resource } from '../../types';
import { EmploymentResource } from '../../services/employmentApi';
import { YOUTH_JOB_RESOURCES } from '../../data/youthResources';

type JobsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

// For You content - personalized employment resources
const JOBS_FOR_YOU = [
  {
    id: 'jfy1',
    title: 'Building Your Resume',
    titleEs: 'Creando Tu Currículum',
    description: 'Tips for creating an effective resume',
    descriptionEs: 'Consejos para crear un currículum efectivo',
    icon: '📝',
    color: '#EA580C',
    details: [
      'Keep it to one page with clear sections',
      'Include contact info, work history, skills, and education',
      'Use action words: managed, created, improved, led',
      'Many libraries offer free resume help and printing',
    ],
    detailsEs: [
      'Mantenlo en una página con secciones claras',
      'Incluye información de contacto, historial laboral, habilidades y educación',
      'Usa palabras de acción: gestioné, creé, mejoré, lideré',
      'Muchas bibliotecas ofrecen ayuda gratuita con currículos e impresión',
    ],
  },
  {
    id: 'jfy2',
    title: 'Interview Preparation',
    titleEs: 'Preparación para Entrevistas',
    description: 'How to succeed in job interviews',
    descriptionEs: 'Cómo tener éxito en entrevistas de trabajo',
    icon: '🤝',
    color: '#0D9488',
    details: [
      'Research the company before your interview',
      'Practice common questions: "Tell me about yourself"',
      'Dress professionally - clean, neat clothing',
      'Arrive 10-15 minutes early',
    ],
    detailsEs: [
      'Investiga la empresa antes de tu entrevista',
      'Practica preguntas comunes: "Cuéntame sobre ti"',
      'Viste profesionalmente - ropa limpia y ordenada',
      'Llega 10-15 minutos antes',
    ],
  },
  {
    id: 'jfy3',
    title: 'Work Authorization',
    titleEs: 'Autorización de Trabajo',
    description: 'Understanding work permits and eligibility',
    descriptionEs: 'Entendiendo permisos de trabajo y elegibilidad',
    icon: '📄',
    color: '#7C3AED',
    details: [
      'US citizens and permanent residents can work without restrictions',
      'Work permits (EAD) allow certain visa holders to work',
      'Some employers sponsor work visas for qualified candidates',
      'Day labor centers often have fewer documentation requirements',
    ],
    detailsEs: [
      'Ciudadanos estadounidenses y residentes permanentes pueden trabajar sin restricciones',
      'Permisos de trabajo (EAD) permiten a ciertos titulares de visa trabajar',
      'Algunos empleadores patrocinan visas de trabajo para candidatos calificados',
      'Centros de trabajo diario a menudo tienen menos requisitos de documentación',
    ],
  },
  {
    id: 'jfy4',
    title: 'Job Training Programs',
    titleEs: 'Programas de Capacitación',
    description: 'Free programs to build job skills',
    descriptionEs: 'Programas gratuitos para desarrollar habilidades',
    icon: '🎓',
    color: '#DC2626',
    details: [
      'Workforce development centers offer free training',
      'Community colleges have certificate programs',
      'Many nonprofits offer job readiness programs',
      'High-demand fields: healthcare, construction, tech',
    ],
    detailsEs: [
      'Centros de desarrollo laboral ofrecen capacitación gratuita',
      'Colegios comunitarios tienen programas de certificación',
      'Muchas organizaciones sin fines de lucro ofrecen programas de preparación laboral',
      'Campos de alta demanda: salud, construcción, tecnología',
    ],
  },
];

// Quick hire jobs
const QUICK_HIRE_JOBS = [
  { id: 'qh1', title: 'Warehouse Associate', company: 'Various', pay: '$18-22/hr', type: 'Full-time', icon: '📦' },
  { id: 'qh2', title: 'Food Service Worker', company: 'Restaurants', pay: '$15-17/hr + tips', type: 'Part-time', icon: '🍽️' },
  { id: 'qh3', title: 'Retail Sales Associate', company: 'Stores', pay: '$16-19/hr', type: 'Full-time', icon: '🛒' },
  { id: 'qh4', title: 'Cleaning Staff', company: 'Cleaning Services', pay: '$14-16/hr', type: 'Part-time', icon: '🧹' },
  { id: 'qh5', title: 'Delivery Driver', company: 'Gig Apps', pay: '$15-25/hr', type: 'Flexible', icon: '🚗' },
  { id: 'qh6', title: 'Construction Helper', company: 'Construction', pay: '$17-22/hr', type: 'Full-time', icon: '🔨' },
];

// Employment hotlines
const EMPLOYMENT_RESOURCES = [
  { id: 'er1', name: 'Unemployment Office', nameEs: 'Oficina de Desempleo', description: 'File for unemployment benefits', descriptionEs: 'Solicitar beneficios de desempleo', phone: '1-877-872-5627', icon: '📋' },
  { id: 'er2', name: 'Worker Rights Hotline', nameEs: 'Línea de Derechos del Trabajador', description: 'Report workplace violations', descriptionEs: 'Reportar violaciones laborales', phone: '1-866-487-9243', icon: '⚖️' },
];

// Helper function to determine if a resource is currently open
const isResourceOpen = (hours?: string): { isOpen: boolean; status: string; statusEs: string } => {
  if (!hours) {
    return { isOpen: true, status: 'Call for hours', statusEs: 'Llame para horarios' };
  }

  const hoursLower = hours.toLowerCase();

  // Check for 24/7 services
  if (hoursLower.includes('24') || hoursLower.includes('24/7') || hoursLower.includes('24 hours')) {
    return { isOpen: true, status: 'Open 24/7', statusEs: 'Abierto 24/7' };
  }

  // Check for online services
  if (hoursLower.includes('online')) {
    return { isOpen: true, status: 'Available Online', statusEs: 'Disponible en línea' };
  }

  // Try to parse standard business hours
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();

  // Simple weekday check (Mon-Fri patterns)
  if (hoursLower.includes('mon-fri') || hoursLower.includes('lun-vie')) {
    if (currentDay >= 1 && currentDay <= 5) {
      // Check if within typical business hours (8 AM - 5 PM)
      if (currentHour >= 8 && currentHour < 17) {
        return { isOpen: true, status: 'Open Now', statusEs: 'Abierto Ahora' };
      }
    }
    return { isOpen: false, status: 'Closed', statusEs: 'Cerrado' };
  }

  // Default: show hours as status
  return { isOpen: true, status: 'See hours', statusEs: 'Ver horarios' };
};

export const JobsScreen: React.FC<JobsScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [activeSection, setActiveSection] = useState<'foryou' | 'search' | 'quickhire' | 'help' | null>(null);
  const [jobs, setJobs] = useState<EmploymentResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  // Filter states
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterJobType, setFilterJobType] = useState<'all' | 'training' | 'job-site'>('all');
  const [filterFullTime, setFilterFullTime] = useState(false);
  const [filterEntryLevel, setFilterEntryLevel] = useState(false);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;

  // Filter jobs based on active filters
  const getFilteredJobs = () => {
    let filtered = jobs;

    if (filterHasPhone) {
      filtered = filtered.filter(job => job.phone);
    }

    if (filterJobType === 'training') {
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes('training') ||
        job.name.toLowerCase().includes('job corps') ||
        job.name.toLowerCase().includes('americorps') ||
        job.services?.some(s => s.toLowerCase().includes('training'))
      );
    } else if (filterJobType === 'job-site') {
      filtered = filtered.filter(job =>
        job.website?.includes('indeed') ||
        job.website?.includes('usajobs') ||
        job.website?.includes('linkedin') ||
        job.website?.includes('snagajob')
      );
    }

    if (filterFullTime) {
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes('full-time') ||
        job.name.toLowerCase().includes('full time') ||
        job.jobType?.toLowerCase().includes('full') ||
        job.description?.toLowerCase().includes('full-time') ||
        job.description?.toLowerCase().includes('full time')
      );
    }

    if (filterEntryLevel) {
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes('entry') ||
        job.name.toLowerCase().includes('no experience') ||
        job.eligibility?.toLowerCase().includes('no experience') ||
        job.eligibility?.toLowerCase().includes('entry level') ||
        job.description?.toLowerCase().includes('entry level') ||
        job.description?.toLowerCase().includes('no experience required')
      );
    }

    return filtered;
  };

  const filteredJobs = getFilteredJobs();

  const loadJobs = async () => {
    if (!userProfile?.location) return;
    setIsLoading(true);
    try {
      const results = await getEmploymentResources(userProfile.location);
      setJobs(results);
    } catch (error) {
      console.log('Error loading jobs:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeSection === 'search' && jobs.length === 0) {
      loadJobs();
    }
  }, [activeSection]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const addToTodo = (title: string, resourceUrl?: string, resourcePhone?: string) => {
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title,
        completed: false,
        category: 'employment',
        resourceType: 'job',
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

  const openJobSite = (site: string) => {
    const urls: Record<string, string> = {
      indeed: 'https://www.indeed.com',
      linkedin: 'https://www.linkedin.com/jobs',
      usajobs: 'https://www.usajobs.gov',
    };
    if (urls[site]) {
      Linking.openURL(urls[site]);
    }
  };

  const renderMainGrid = () => (
    <View style={styles.gridContainer}>
      <Text style={styles.sectionTitle}>
        {isSpanish ? 'Recursos de Empleo' : 'Employment Resources'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {isSpanish ? 'Toca una categoría para explorar' : 'Tap a category to explore'}
      </Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FFF7ED' }]}
          onPress={() => setActiveSection('foryou')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FFEDD5' }]}>
            <Text style={styles.gridIcon}>⭐</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Para Ti' : 'For You'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Guías y consejos' : 'Guides & tips'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#F5F3FF' }]}
          onPress={() => setActiveSection('quickhire')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.gridIcon}>⚡</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Contratación Rápida' : 'Quick Hire'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Trabajos que contratan rápido' : 'Jobs hiring fast'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridItem, { backgroundColor: '#FEF2F2' }]}
          onPress={() => setActiveSection('help')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#FECACA' }]}>
            <Text style={styles.gridIcon}>📞</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Obtener Ayuda' : 'Get Help'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Líneas de ayuda' : 'Helplines'}
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
        {isSpanish ? 'Guías y recursos de empleo' : 'Employment guides & resources'}
      </Text>

      <CasyResources
        isSpanish={isSpanish}
        resources={[
          ...(userProfile?.recommendations?.recommendations || []).filter((r) => r.category === 'employment'),
          ...(userProfile?.savedResources || []).filter((r) => r.category === 'employment'),
        ]}
      />

      {JOBS_FOR_YOU.map((item) => (
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

  const renderSearch = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Recursos de Empleo' : 'Employment Resources'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Capacitación, búsqueda de empleo y más' : 'Training, job search, and more'}
      </Text>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterFullTime && styles.filterChipActive]}
            onPress={() => setFilterFullTime(!filterFullTime)}
          >
            <Text style={[styles.filterChipText, filterFullTime && styles.filterChipTextActive]}>
              💼 {isSpanish ? 'Tiempo Completo' : 'Full-time'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterEntryLevel && styles.filterChipActive]}
            onPress={() => setFilterEntryLevel(!filterEntryLevel)}
          >
            <Text style={[styles.filterChipText, filterEntryLevel && styles.filterChipTextActive]}>
              🌱 {isSpanish ? 'Nivel Inicial' : 'Entry Level'}
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
            style={[styles.filterChip, filterJobType === 'training' && styles.filterChipActive]}
            onPress={() => setFilterJobType(filterJobType === 'training' ? 'all' : 'training')}
          >
            <Text style={[styles.filterChipText, filterJobType === 'training' && styles.filterChipTextActive]}>
              🎓 {isSpanish ? 'Capacitación' : 'Training'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterJobType === 'job-site' && styles.filterChipActive]}
            onPress={() => setFilterJobType(filterJobType === 'job-site' ? 'all' : 'job-site')}
          >
            <Text style={[styles.filterChipText, filterJobType === 'job-site' && styles.filterChipTextActive]}>
              🔍 {isSpanish ? 'Sitios de Empleo' : 'Job Sites'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results count */}
      {jobs.length > 0 && (
        <Text style={styles.resultsCount}>
          {filteredJobs.length} {isSpanish ? 'de' : 'of'} {jobs.length} {isSpanish ? 'recursos' : 'resources'}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>
            {isSpanish ? 'Cargando recursos...' : 'Loading resources...'}
          </Text>
        </View>
      ) : filteredJobs.length > 0 ? (
        filteredJobs.map((job) => {
          const openStatus = isResourceOpen(job.hours);
          const isExpanded = expandedJob === job.id;

          return (
            <TouchableOpacity
              key={job.id}
              style={styles.jobResourceCard}
              onPress={() => setExpandedJob(isExpanded ? null : job.id)}
              activeOpacity={0.7}
            >
              {/* Header with status */}
              <View style={styles.jobResourceHeader}>
                <View style={styles.jobResourceInfo}>
                  <View style={styles.jobResourceTitleRow}>
                    <Text style={styles.jobResourceTitle}>
                      {isSpanish && job.nameEs ? job.nameEs : job.name}
                    </Text>
                    {job.phone && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.jobResourceDescription} numberOfLines={isExpanded ? undefined : 2}>
                    {isSpanish && job.descriptionEs ? job.descriptionEs : job.description}
                  </Text>

                  {/* Status and services */}
                  <View style={styles.jobResourceTags}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: openStatus.isOpen ? '#DCFCE7' : '#FEE2E2' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: openStatus.isOpen ? '#166534' : '#991B1B' }
                      ]}>
                        {isSpanish ? openStatus.statusEs : openStatus.status}
                      </Text>
                    </View>
                    {job.services?.slice(0, 2).map((service, idx) => (
                      <View key={idx} style={styles.serviceTag}>
                        <Text style={styles.serviceTagText}>
                          {isSpanish && job.servicesEs?.[idx] ? job.servicesEs[idx] : service}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              </View>

              {/* Expanded content */}
              {isExpanded && (
                <View style={styles.jobResourceExpanded}>
                  {/* Hours */}
                  {job.hours && (
                    <View style={styles.jobResourceSection}>
                      <Text style={styles.jobResourceSectionTitle}>
                        🕐 {isSpanish ? 'Horarios' : 'Hours'}
                      </Text>
                      <Text style={styles.jobResourceSectionText}>
                        {isSpanish && job.hoursEs ? job.hoursEs : job.hours}
                      </Text>
                    </View>
                  )}

                  {/* Eligibility */}
                  {job.eligibility && (
                    <View style={styles.jobResourceSection}>
                      <Text style={styles.jobResourceSectionTitle}>
                        ✅ {isSpanish ? 'Elegibilidad' : 'Eligibility'}
                      </Text>
                      <Text style={styles.jobResourceSectionText}>
                        {isSpanish && job.eligibilityEs ? job.eligibilityEs : job.eligibility}
                      </Text>
                    </View>
                  )}

                  {/* Detailed services */}
                  {job.servicesDetailed && job.servicesDetailed.length > 0 && (
                    <View style={styles.jobResourceSection}>
                      <Text style={styles.jobResourceSectionTitle}>
                        📋 {isSpanish ? 'Servicios' : 'Services'}
                      </Text>
                      {(isSpanish && job.servicesDetailedEs ? job.servicesDetailedEs : job.servicesDetailed).map((service, idx) => (
                        <View key={idx} style={styles.detailRow}>
                          <Text style={styles.detailBullet}>•</Text>
                          <Text style={styles.detailText}>{service}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* How to Apply */}
                  {job.howToApply && (
                    <View style={styles.jobResourceSection}>
                      <Text style={styles.jobResourceSectionTitle}>
                        📝 {isSpanish ? 'Cómo Aplicar' : 'How to Apply'}
                      </Text>
                      <Text style={styles.jobResourceSectionText}>
                        {isSpanish && job.howToApplyEs ? job.howToApplyEs : job.howToApply}
                      </Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.jobResourceActions}>
                    {job.phone && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCall(job.phone!)}
                      >
                        <Text style={styles.callButtonText}>
                          📞 {isSpanish ? 'Llamar' : 'Call'} {job.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {job.website && (
                      <TouchableOpacity
                        style={styles.websiteButton}
                        onPress={() => Linking.openURL(job.website!)}
                      >
                        <Text style={styles.websiteButtonText}>
                          🌐 {isSpanish ? 'Visitar Sitio Web' : 'Visit Website'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Add to To-Do button */}
                  <TouchableOpacity
                    style={styles.addToTodoButton}
                    onPress={() => addToTodo(
                      `${isSpanish ? 'Aplicar a' : 'Apply to'} ${isSpanish && job.nameEs ? job.nameEs : job.name}`,
                      job.website,
                      job.phone
                    )}
                  >
                    <Text style={styles.addToTodoButtonText}>
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
          <Text style={styles.emptyIcon}>💼</Text>
          <Text style={styles.emptyText}>
            {isSpanish
              ? 'Cargando recursos de empleo...'
              : 'Loading employment resources...'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderQuickHire = () => (
    <View style={styles.detailContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setActiveSection(null)}>
        <Text style={styles.backButtonText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.detailTitle}>
        {isSpanish ? 'Contratación Rápida' : 'Quick Hire Jobs'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Trabajos que contratan rápidamente' : 'Jobs that hire quickly'}
      </Text>

      {QUICK_HIRE_JOBS.map((job) => (
        <View key={job.id} style={styles.quickHireCard}>
          <View style={styles.quickHireHeader}>
            <View style={styles.quickHireIconContainer}>
              <Text style={styles.quickHireIcon}>{job.icon}</Text>
            </View>
            <View style={styles.quickHireInfo}>
              <Text style={styles.quickHireTitle}>{job.title}</Text>
              <Text style={styles.quickHireCompany}>{job.company}</Text>
            </View>
          </View>
          <View style={styles.quickHireDetails}>
            <View style={styles.quickHireTag}>
              <Text style={styles.quickHireTagText}>{job.pay}</Text>
            </View>
            <View style={[styles.quickHireTag, { backgroundColor: '#F0FDFA' }]}>
              <Text style={[styles.quickHireTagText, { color: '#0D9488' }]}>{job.type}</Text>
            </View>
          </View>
        </View>
      ))}

      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          {isSpanish
            ? 'Consejo: Visita empresas en persona durante las horas de la mañana para mejores resultados.'
            : 'Tip: Visit businesses in person during morning hours for best results.'}
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
        {isSpanish ? 'Obtener Ayuda' : 'Get Help'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Líneas de ayuda para empleo' : 'Employment helplines'}
      </Text>

      {EMPLOYMENT_RESOURCES.map((resource) => (
        <TouchableOpacity
          key={resource.id}
          style={styles.helpCard}
          onPress={() => handleCall(resource.phone)}
        >
          <View style={styles.helpIconContainer}>
            <Text style={styles.helpIcon}>{resource.icon}</Text>
          </View>
          <View style={styles.helpInfo}>
            <Text style={styles.helpName}>
              {isSpanish ? resource.nameEs : resource.name}
            </Text>
            <Text style={styles.helpDescription}>
              {isSpanish ? resource.descriptionEs : resource.description}
            </Text>
            <Text style={styles.helpPhone}>{resource.phone}</Text>
          </View>
          <View style={styles.helpCallButton}>
            <Text style={styles.helpCallText}>📞</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.additionalHelp}>
        <Text style={styles.additionalHelpTitle}>
          {isSpanish ? 'Más Recursos' : 'More Resources'}
        </Text>
        <Text style={styles.additionalHelpText}>
          {isSpanish
            ? '• Bibliotecas públicas ofrecen ayuda gratuita con currículos\n• Llama al 211 para centros de desarrollo laboral locales\n• Refugios a menudo tienen programas de empleo'
            : '• Public libraries offer free resume help\n• Call 211 for local workforce development centers\n• Shelters often have employment programs'}
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
        <Text style={styles.headerTitle}>💼 {isSpanish ? 'Empleo' : 'Jobs'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Youth Job Training Banner for Minors */}
        {userProfile?.ageGroup === 'under18' && activeSection === null && (
          <View style={styles.youthTrainingBanner}>
            <View style={styles.youthTrainingHeader}>
              <Text style={styles.youthTrainingEmoji}>🎓</Text>
              <Text style={styles.youthTrainingTitle}>
                {isSpanish ? 'Programas para Jóvenes' : 'Youth Training Programs'}
              </Text>
            </View>
            <Text style={styles.youthTrainingText}>
              {isSpanish
                ? 'Estos programas están diseñados especialmente para jóvenes. Ofrecen capacitación, educación, y a veces hasta vivienda y comidas.'
                : 'These programs are specially designed for young people. They offer training, education, and sometimes even housing and meals.'}
            </Text>
            {YOUTH_JOB_RESOURCES.programs.map((program) => (
              <TouchableOpacity
                key={program.id}
                style={styles.youthProgramCard}
                onPress={() => program.website && Linking.openURL(program.website)}
              >
                <View style={styles.youthProgramInfo}>
                  <Text style={styles.youthProgramName}>
                    {isSpanish ? program.nameEs : program.name}
                  </Text>
                  <Text style={styles.youthProgramDesc}>
                    {isSpanish ? program.descriptionEs : program.description}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.youthProgramCall}
                  onPress={() => Linking.openURL(`tel:${program.phone.replace(/-/g, '')}`)}
                >
                  <Text style={styles.youthProgramCallIcon}>📞</Text>
                  <Text style={styles.youthProgramPhone}>{program.phone}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeSection === null && renderMainGrid()}
        {activeSection === 'foryou' && renderForYou()}
        {activeSection === 'search' && renderSearch()}
        {activeSection === 'quickhire' && renderQuickHire()}
        {activeSection === 'help' && renderHelp()}
      </ScrollView>
      <AIAssistant focus="employment" />
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
    color: '#EA580C',
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
    color: '#EA580C',
    marginRight: 8,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  subSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 16,
  },
  jobSitesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobSiteCard: {
    width: '31%',
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  jobSiteIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  jobSiteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
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
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 14,
    color: '#64748B',
  },
  viewButton: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
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
  quickHireCard: {
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
  quickHireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickHireIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickHireIcon: {
    fontSize: 24,
  },
  quickHireInfo: {
    flex: 1,
  },
  quickHireTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  quickHireCompany: {
    fontSize: 14,
    color: '#64748B',
  },
  quickHireDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  quickHireTag: {
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  quickHireTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
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
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  helpIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  helpIcon: {
    fontSize: 28,
  },
  helpInfo: {
    flex: 1,
  },
  helpName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  helpPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EA580C',
  },
  helpCallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCallText: {
    fontSize: 20,
  },
  additionalHelp: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  additionalHelpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  additionalHelpText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  // New styles for expandable job resource cards
  jobResourceCard: {
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
  jobResourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobResourceInfo: {
    flex: 1,
  },
  jobResourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobResourceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },
  jobResourceDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobResourceTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  serviceTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
  },
  jobResourceExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  jobResourceSection: {
    marginBottom: 16,
  },
  jobResourceSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  jobResourceSectionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  jobResourceActions: {
    marginTop: 8,
    gap: 10,
  },
  callButton: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  websiteButton: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D9488',
  },
  addToTodoButton: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addToTodoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
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
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
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
  // Youth Training Styles
  youthTrainingBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  youthTrainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  youthTrainingEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  youthTrainingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
  },
  youthTrainingText: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 20,
    marginBottom: 16,
  },
  youthProgramCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  youthProgramInfo: {
    marginBottom: 12,
  },
  youthProgramName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  youthProgramDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  youthProgramCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
  },
  youthProgramCallIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  youthProgramPhone: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D9488',
  },
});
