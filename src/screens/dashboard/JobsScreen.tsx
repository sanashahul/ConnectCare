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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { getEmploymentResources } from '../../services';
import { Resource } from '../../types';

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

export const JobsScreen: React.FC<JobsScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state } = useApp();
  const [activeSection, setActiveSection] = useState<'foryou' | 'search' | 'quickhire' | 'help' | null>(null);
  const [jobs, setJobs] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;

  const loadJobs = async () => {
    if (!userProfile?.location) return;
    setIsLoading(true);
    try {
      const results = await getEmploymentResources(userProfile.location);
      setJobs(results);
    } catch (error) {
      console.error('Error loading jobs:', error);
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
          style={[styles.gridItem, { backgroundColor: '#F0FDFA' }]}
          onPress={() => setActiveSection('search')}
        >
          <View style={[styles.gridIconContainer, { backgroundColor: '#CCFBF1' }]}>
            <Text style={styles.gridIcon}>🔍</Text>
          </View>
          <Text style={styles.gridTitle}>{isSpanish ? 'Buscar Trabajos' : 'Job Search'}</Text>
          <Text style={styles.gridDescription}>
            {isSpanish ? 'Encuentra oportunidades' : 'Find opportunities'}
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
        {isSpanish ? 'Buscar Trabajos' : 'Job Search'}
      </Text>
      <Text style={styles.detailSubtitle}>
        {isSpanish ? 'Sitios de búsqueda de empleo' : 'Job search websites'}
      </Text>

      {/* Job Search Sites */}
      <View style={styles.jobSitesGrid}>
        <TouchableOpacity style={styles.jobSiteCard} onPress={() => openJobSite('indeed')}>
          <Text style={styles.jobSiteIcon}>💼</Text>
          <Text style={styles.jobSiteName}>Indeed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.jobSiteCard} onPress={() => openJobSite('linkedin')}>
          <Text style={styles.jobSiteIcon}>🔗</Text>
          <Text style={styles.jobSiteName}>LinkedIn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.jobSiteCard} onPress={() => openJobSite('usajobs')}>
          <Text style={styles.jobSiteIcon}>🏛️</Text>
          <Text style={styles.jobSiteName}>USAJobs</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subSectionTitle}>
        {isSpanish ? 'Trabajos Cerca de Ti' : 'Jobs Near You'}
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>
            {isSpanish ? 'Buscando trabajos...' : 'Finding jobs...'}
          </Text>
        </View>
      ) : jobs.length > 0 ? (
        jobs.slice(0, 10).map((job) => (
          <TouchableOpacity
            key={job.id}
            style={styles.jobCard}
            onPress={() => job.url && Linking.openURL(job.url)}
          >
            <View style={styles.jobHeader}>
              <Text style={styles.jobIcon}>💼</Text>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.name}</Text>
                {job.description && (
                  <Text style={styles.jobCompany} numberOfLines={2}>{job.description}</Text>
                )}
              </View>
            </View>
            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>{isSpanish ? 'Ver' : 'View'} →</Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>
            {isSpanish
              ? 'Usa los sitios de arriba para buscar trabajos en tu área.'
              : 'Use the sites above to search for jobs in your area.'}
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
        {activeSection === null && renderMainGrid()}
        {activeSection === 'foryou' && renderForYou()}
        {activeSection === 'search' && renderSearch()}
        {activeSection === 'quickhire' && renderQuickHire()}
        {activeSection === 'help' && renderHelp()}
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
});
