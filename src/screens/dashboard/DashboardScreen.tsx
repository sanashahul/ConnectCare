import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Resource, ServiceCategory } from '../../types';
import { getSampleResources, filterResourcesByAnswers } from '../../utils/resources';
import { formatDistance } from '../../utils/location';
import * as Clipboard from 'expo-clipboard';
import {
  getHealthcareResources,
  getEmploymentResources,
  getHousingResources,
} from '../../services';

type TabType = 'resources' | 'todos' | 'caseworker';

// Educational content for each category
const HEALTHCARE_GUIDES = [
  {
    id: 'hg1',
    title: 'Understanding Medicaid',
    titleEs: 'Entendiendo Medicaid',
    description: 'Free or low-cost health coverage for eligible individuals',
    descriptionEs: 'Cobertura de salud gratuita o de bajo costo para personas elegibles',
    icon: '🏥',
    content: [
      'Medicaid is a government program providing free or low-cost health coverage',
      'Eligibility is based on income, family size, and other factors',
      'Coverage includes doctor visits, hospital stays, prescriptions, and more',
      'Apply at your local Department of Social Services or healthcare.gov',
    ],
  },
  {
    id: 'hg2',
    title: 'How to Use the Emergency Room',
    titleEs: 'Cómo Usar la Sala de Emergencias',
    description: 'When to go and what to expect',
    descriptionEs: 'Cuándo ir y qué esperar',
    icon: '🚑',
    content: [
      'ERs must treat you regardless of ability to pay (EMTALA law)',
      'Go for life-threatening emergencies: chest pain, difficulty breathing, severe bleeding',
      'For non-emergencies, urgent care or clinics are faster and cheaper',
      'Bring ID and any medications you take if possible',
    ],
  },
  {
    id: 'hg3',
    title: 'Getting Health Insurance',
    titleEs: 'Obteniendo Seguro Médico',
    description: 'Options for coverage in the US',
    descriptionEs: 'Opciones de cobertura en EE.UU.',
    icon: '📋',
    content: [
      'Marketplace plans available at healthcare.gov (open enrollment Nov-Jan)',
      'Medicaid for low-income individuals (apply anytime)',
      'Community health centers offer sliding-scale fees without insurance',
      'Some states have additional programs - check with local social services',
    ],
  },
  {
    id: 'hg4',
    title: 'Free & Low-Cost Clinics',
    titleEs: 'Clínicas Gratuitas y de Bajo Costo',
    description: 'Where to get care without insurance',
    descriptionEs: 'Dónde obtener atención sin seguro',
    icon: '💊',
    content: [
      'Federally Qualified Health Centers (FQHCs) serve everyone regardless of ability to pay',
      'Free clinics are run by volunteers and nonprofits',
      'Sliding scale fees mean you pay based on your income',
      'Call 211 to find free clinics in your area',
    ],
  },
];

const EMPLOYMENT_GUIDES = [
  {
    id: 'eg1',
    title: 'Building Your Resume',
    titleEs: 'Creando Tu Currículum',
    description: 'Tips for creating an effective resume',
    descriptionEs: 'Consejos para crear un currículum efectivo',
    icon: '📝',
    content: [
      'Keep it to one page with clear sections',
      'Include contact info, work history, skills, and education',
      'Use action words: managed, created, improved, led',
      'Many libraries offer free resume help and printing',
    ],
  },
  {
    id: 'eg2',
    title: 'Interview Preparation',
    titleEs: 'Preparación para Entrevistas',
    description: 'How to succeed in job interviews',
    descriptionEs: 'Cómo tener éxito en entrevistas de trabajo',
    icon: '🤝',
    content: [
      'Research the company before your interview',
      'Practice common questions: "Tell me about yourself", "Why do you want this job?"',
      'Dress professionally - clean, neat clothing',
      'Arrive 10-15 minutes early',
    ],
  },
  {
    id: 'eg3',
    title: 'Work Authorization',
    titleEs: 'Autorización de Trabajo',
    description: 'Understanding work permits and eligibility',
    descriptionEs: 'Entendiendo permisos de trabajo y elegibilidad',
    icon: '📄',
    content: [
      'US citizens and permanent residents can work without restrictions',
      'Work permits (EAD) allow certain visa holders to work',
      'Some employers sponsor work visas for qualified candidates',
      'Day labor centers often have fewer documentation requirements',
    ],
  },
  {
    id: 'eg4',
    title: 'Job Training Programs',
    titleEs: 'Programas de Capacitación Laboral',
    description: 'Free programs to build job skills',
    descriptionEs: 'Programas gratuitos para desarrollar habilidades',
    icon: '🎓',
    content: [
      'Workforce development centers offer free training',
      'Community colleges have certificate programs',
      'Many nonprofits offer job readiness programs',
      'Look for programs in high-demand fields: healthcare, construction, tech',
    ],
  },
];

const HOUSING_GUIDES = [
  {
    id: 'hog1',
    title: 'Understanding Section 8',
    titleEs: 'Entendiendo la Sección 8',
    description: 'Housing choice voucher program explained',
    descriptionEs: 'Programa de vales de vivienda explicado',
    icon: '🏠',
    content: [
      'Section 8 helps pay rent for low-income families',
      'You pay about 30% of your income, voucher covers the rest',
      'Apply through your local Public Housing Authority (PHA)',
      'Waitlists can be long - apply to multiple PHAs',
    ],
  },
  {
    id: 'hog2',
    title: 'Emergency Shelter Guide',
    titleEs: 'Guía de Refugios de Emergencia',
    description: 'Finding immediate shelter',
    descriptionEs: 'Encontrando refugio inmediato',
    icon: '🆘',
    content: [
      'Call 211 for local shelter information 24/7',
      'Many shelters require check-in by certain times',
      'Bring ID if you have it (not always required)',
      'Ask about services: meals, showers, case management',
    ],
  },
  {
    id: 'hog3',
    title: 'Rental Assistance Programs',
    titleEs: 'Programas de Asistencia de Renta',
    description: 'Help paying rent',
    descriptionEs: 'Ayuda para pagar la renta',
    icon: '💰',
    content: [
      'Emergency rental assistance available through local agencies',
      'Utility assistance programs can help with bills',
      'Many churches and nonprofits offer one-time assistance',
      'Contact 211 or local Community Action Agency',
    ],
  },
  {
    id: 'hog4',
    title: 'Tenant Rights',
    titleEs: 'Derechos del Inquilino',
    description: 'Know your rights as a renter',
    descriptionEs: 'Conoce tus derechos como inquilino',
    icon: '⚖️',
    content: [
      'Landlords must provide habitable housing',
      'You cannot be evicted without proper legal process',
      'Discrimination based on race, religion, disability is illegal',
      'Keep copies of all rental agreements and communications',
    ],
  },
];

// Sample urgent care / emergency resources
const URGENT_RESOURCES = {
  healthcare: [
    { id: 'u1', name: 'Emergency: 911', description: 'Life-threatening emergencies', phone: '911', icon: '🚨' },
    { id: 'u2', name: 'Suicide & Crisis Lifeline', description: '24/7 mental health crisis support', phone: '988', icon: '💚' },
    { id: 'u3', name: 'Poison Control', description: 'Poisoning emergencies', phone: '1-800-222-1222', icon: '☠️' },
    { id: 'u4', name: 'SAMHSA Helpline', description: 'Substance abuse help 24/7', phone: '1-800-662-4357', icon: '🤝' },
  ],
  employment: [
    { id: 'ue1', name: 'Unemployment Office', description: 'File for unemployment benefits', phone: '1-877-872-5627', icon: '📋' },
    { id: 'ue2', name: 'Worker Rights Hotline', description: 'Report workplace violations', phone: '1-866-487-9243', icon: '⚖️' },
  ],
  housing: [
    { id: 'uh1', name: 'National Homeless Hotline', description: '24/7 shelter referrals', phone: '1-800-231-6946', icon: '📞' },
    { id: 'uh2', name: '211', description: 'Local resources & shelter info', phone: '211', icon: '🆘' },
    { id: 'uh3', name: 'Domestic Violence Hotline', description: 'Safe shelter for DV survivors', phone: '1-800-799-7233', icon: '💜' },
  ],
};

// Sample job listings
const SAMPLE_JOBS = [
  { id: 'j1', title: 'Warehouse Associate', company: 'Amazon Warehouse', pay: '$18-22/hr', type: 'Full-time', icon: '📦' },
  { id: 'j2', title: 'Food Service Worker', company: 'Local Restaurant', pay: '$15-17/hr + tips', type: 'Part-time', icon: '🍽️' },
  { id: 'j3', title: 'Retail Sales Associate', company: 'Target', pay: '$16-19/hr', type: 'Full-time', icon: '🛒' },
  { id: 'j4', title: 'Cleaning Staff', company: 'CleanCo Services', pay: '$14-16/hr', type: 'Part-time', icon: '🧹' },
  { id: 'j5', title: 'Delivery Driver', company: 'DoorDash', pay: '$15-25/hr', type: 'Flexible', icon: '🚗' },
  { id: 'j6', title: 'Construction Helper', company: 'BuildRight Inc', pay: '$17-22/hr', type: 'Full-time', icon: '🔨' },
];

// Sample housing listings
const SAMPLE_HOUSING = [
  { id: 'h1', title: 'Emergency Shelter Bed', organization: 'City Mission', type: 'Emergency', availability: 'Tonight', icon: '🛏️' },
  { id: 'h2', title: 'Transitional Housing', organization: 'Hope House', type: '6-month program', availability: 'Waitlist', icon: '🏠' },
  { id: 'h3', title: 'Shared Room - Section 8', organization: 'Housing Authority', type: 'Voucher accepted', availability: 'Available', icon: '🔑' },
  { id: 'h4', title: 'Family Shelter', organization: 'Family Promise', type: 'Families only', availability: '2 spots', icon: '👨‍👩‍👧' },
  { id: 'h5', title: 'Veterans Housing', organization: 'VA Services', type: 'VASH Program', availability: 'Apply now', icon: '🎖️' },
];

export const DashboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('recommended');
  const [jobListings, setJobListings] = useState<Resource[]>([]);
  const [housingListings, setHousingListings] = useState<Resource[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['recommended']);

  const userProfile = state.userProfile;
  const categories = userProfile?.selectedCategories || [];
  const isSpanish = i18n.language === 'es';

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (activeCategory && userProfile?.location) {
      loadResources();
    }
  }, [activeCategory, userProfile?.location]);

  // Load listings for search sections
  useEffect(() => {
    const loadSearchListings = async () => {
      if (!userProfile?.location) return;

      if (activeSection === 'jobs' && jobListings.length === 0) {
        setIsLoadingSearch(true);
        const jobs = await getEmploymentResources(userProfile.location);
        setJobListings(jobs);
        setIsLoadingSearch(false);
      }

      if (activeSection === 'housing' && housingListings.length === 0) {
        setIsLoadingSearch(true);
        const housing = await getHousingResources(userProfile.location);
        setHousingListings(housing);
        setIsLoadingSearch(false);
      }
    };

    loadSearchListings();
  }, [activeSection, userProfile?.location]);

  const loadResources = async () => {
    if (!activeCategory || !userProfile?.location) return;

    setIsLoading(true);
    try {
      let apiResources: Resource[] = [];

      // Fetch resources from real APIs based on category
      switch (activeCategory) {
        case 'healthcare':
          apiResources = await getHealthcareResources(userProfile.location);
          break;
        case 'employment':
          apiResources = await getEmploymentResources(userProfile.location);
          break;
        case 'housing':
          apiResources = await getHousingResources(userProfile.location);
          break;
      }

      // If API returns results, use them; otherwise fall back to sample data
      if (apiResources.length > 0) {
        setResources(apiResources);
      } else {
        // Fallback to sample data if APIs return nothing
        const rawResources = getSampleResources(userProfile.location, activeCategory);
        const filtered = filterResourcesByAnswers(
          rawResources,
          userProfile.answers,
          activeCategory
        );
        setResources(filtered);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      // Fallback to sample data on error
      const rawResources = getSampleResources(userProfile.location, activeCategory);
      const filtered = filterResourcesByAnswers(
        rawResources,
        userProfile.answers,
        activeCategory
      );
      setResources(filtered);
    }
    setIsLoading(false);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.includes(sectionId);

  const handleDirections = (resource: Resource) => {
    const mapUrl = `https://maps.google.com/?q=${resource.lat},${resource.lng}`;
    Linking.openURL(mapUrl);
  };

  const handleCopyCode = async () => {
    if (userProfile?.shareCode) {
      await Clipboard.setStringAsync(userProfile.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleToggleTodo = (todoId: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: todoId });
  };

  const handleAddTodo = () => {
    Alert.alert(
      'Add Task',
      'This would open a task input modal in the full app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Sample Task',
          onPress: () => {
            dispatch({
              type: 'ADD_TODO',
              payload: {
                title: 'New task - tap to edit',
                priority: 'normal',
                completed: false,
                createdBy: 'individual',
              },
            });
          },
        },
      ]
    );
  };

  const getGuides = () => {
    switch (activeCategory) {
      case 'healthcare': return HEALTHCARE_GUIDES;
      case 'employment': return EMPLOYMENT_GUIDES;
      case 'housing': return HOUSING_GUIDES;
      default: return [];
    }
  };

  const getUrgentResources = () => {
    return URGENT_RESOURCES[activeCategory || 'healthcare'] || [];
  };

  const getSectionTabs = () => {
    switch (activeCategory) {
      case 'healthcare':
        return [
          { id: 'recommended', label: '⭐ For You', labelEs: '⭐ Para Ti' },
          { id: 'clinics', label: '🔍 Find Clinics', labelEs: '🔍 Buscar Clínicas' },
          { id: 'learn', label: '📚 Learn', labelEs: '📚 Aprender' },
          { id: 'urgent', label: '🚨 Urgent', labelEs: '🚨 Urgente' },
        ];
      case 'employment':
        return [
          { id: 'recommended', label: '⭐ For You', labelEs: '⭐ Para Ti' },
          { id: 'jobs', label: '💼 Jobs', labelEs: '💼 Empleos' },
          { id: 'learn', label: '📚 Resources', labelEs: '📚 Recursos' },
          { id: 'urgent', label: '📋 Help', labelEs: '📋 Ayuda' },
        ];
      case 'housing':
        return [
          { id: 'recommended', label: '⭐ For You', labelEs: '⭐ Para Ti' },
          { id: 'housing', label: '🏠 Apply', labelEs: '🏠 Aplicar' },
          { id: 'learn', label: '📚 Learn', labelEs: '📚 Aprender' },
          { id: 'urgent', label: '🆘 Emergency', labelEs: '🆘 Emergencia' },
        ];
      default:
        return [];
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'recommended':
        return renderRecommendedSection();
      case 'clinics':
      case 'jobs':
      case 'housing':
        return renderSearchSection();
      case 'learn':
        return renderLearnSection();
      case 'urgent':
        return renderUrgentSection();
      default:
        return null;
    }
  };

  const renderRecommendedSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>
        {isSpanish ? 'Recomendado Para Ti' : 'Recommended For You'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {isSpanish
          ? 'Basado en tus respuestas del cuestionario'
          : 'Based on your questionnaire answers'}
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isSpanish ? 'No se encontraron recursos' : 'No resources found'}
          </Text>
        </View>
      ) : (
        resources.slice(0, 4).map((resource) => (
          <View key={resource.id} style={styles.resourceCard}>
            <View style={styles.resourceHeader}>
              <Text style={styles.resourceName}>{resource.name}</Text>
              {resource.distance && (
                <Text style={styles.resourceDistance}>
                  {formatDistance(resource.distance)}
                </Text>
              )}
            </View>
            <Text style={styles.resourceAddress}>{resource.address}</Text>
            {resource.description && (
              <Text style={styles.resourceDescription}>{resource.description}</Text>
            )}
            {resource.services && resource.services.length > 0 && (
              <View style={styles.servicesTags}>
                {resource.services.slice(0, 3).map((service, idx) => (
                  <View key={idx} style={styles.serviceTag}>
                    <Text style={styles.serviceTagText}>{service}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.resourceActions}>
              {resource.phone && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(resource.phone!)}
                >
                  <Text style={styles.actionButtonText}>📞 {isSpanish ? 'Llamar' : 'Call'}</Text>
                </TouchableOpacity>
              )}
              {resource.website && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleWebsite(resource.website!)}
                >
                  <Text style={styles.actionButtonText}>🌐 {isSpanish ? 'Web' : 'Web'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDirections(resource)}
              >
                <Text style={styles.actionButtonText}>🗺️ {isSpanish ? 'Ir' : 'Go'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSearchSection = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>
        {activeCategory === 'healthcare' && (isSpanish ? 'Buscar Clínicas' : 'Find Clinics')}
        {activeCategory === 'employment' && (isSpanish ? 'Buscar Empleos' : 'Find Jobs')}
        {activeCategory === 'housing' && (isSpanish ? 'Vivienda Disponible' : 'Housing Available')}
      </Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={isSpanish ? 'Buscar...' : 'Search...'}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {activeCategory === 'employment' && (
        <View style={styles.listContainer}>
          {isLoadingSearch ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ padding: 40 }} />
          ) : jobListings.length > 0 ? (
            jobListings.filter(job =>
              !searchQuery || job.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.listCard}
                onPress={() => job.website && handleWebsite(job.website)}
              >
                <Text style={styles.listIcon}>💼</Text>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{job.name}</Text>
                  <Text style={styles.listSubtitle}>{job.description}</Text>
                  <View style={styles.listMeta}>
                    {job.services && job.services[0] && (
                      <Text style={styles.listMetaText}>{job.services[0]}</Text>
                    )}
                    {job.services && job.services[1] && (
                      <Text style={styles.listMetaBadge}>{job.services[1]}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))
          ) : (
            SAMPLE_JOBS.map((job) => (
              <TouchableOpacity key={job.id} style={styles.listCard}>
                <Text style={styles.listIcon}>{job.icon}</Text>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{job.title}</Text>
                  <Text style={styles.listSubtitle}>{job.company}</Text>
                  <View style={styles.listMeta}>
                    <Text style={styles.listMetaText}>{job.pay}</Text>
                    <Text style={styles.listMetaBadge}>{job.type}</Text>
                  </View>
                </View>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {activeCategory === 'housing' && (
        <View style={styles.listContainer}>
          {isLoadingSearch ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ padding: 40 }} />
          ) : housingListings.length > 0 ? (
            housingListings.filter(housing =>
              !searchQuery || housing.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((housing) => (
              <TouchableOpacity
                key={housing.id}
                style={styles.listCard}
                onPress={() => housing.website && handleWebsite(housing.website)}
              >
                <Text style={styles.listIcon}>🏠</Text>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{housing.name}</Text>
                  <Text style={styles.listSubtitle}>{housing.description}</Text>
                  <View style={styles.listMeta}>
                    {housing.services && housing.services[0] && (
                      <Text style={styles.listMetaText}>{housing.services[0]}</Text>
                    )}
                    {housing.phone && (
                      <TouchableOpacity onPress={() => handleCall(housing.phone!)}>
                        <Text style={[styles.listMetaBadge, styles.availableBadge]}>
                          📞 {housing.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))
          ) : (
            SAMPLE_HOUSING.map((housing) => (
              <TouchableOpacity key={housing.id} style={styles.listCard}>
                <Text style={styles.listIcon}>{housing.icon}</Text>
                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{housing.title}</Text>
                  <Text style={styles.listSubtitle}>{housing.organization}</Text>
                  <View style={styles.listMeta}>
                    <Text style={styles.listMetaText}>{housing.type}</Text>
                    <Text style={[
                      styles.listMetaBadge,
                      housing.availability === 'Tonight' || housing.availability === 'Available'
                        ? styles.availableBadge : null
                    ]}>
                      {housing.availability}
                    </Text>
                  </View>
                </View>
                <Text style={styles.listArrow}>→</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {activeCategory === 'healthcare' && (
        <View style={styles.listContainer}>
          {resources.map((resource) => (
            <TouchableOpacity key={resource.id} style={styles.listCard}>
              <Text style={styles.listIcon}>🏥</Text>
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{resource.name}</Text>
                <Text style={styles.listSubtitle}>{resource.address}</Text>
                {resource.distance && (
                  <Text style={styles.listMetaText}>{formatDistance(resource.distance)}</Text>
                )}
              </View>
              <Text style={styles.listArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderLearnSection = () => {
    const guides = getGuides();
    return (
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>
          {activeCategory === 'healthcare' && (isSpanish ? 'Aprende Sobre Salud' : 'Learn About Healthcare')}
          {activeCategory === 'employment' && (isSpanish ? 'Recursos de Empleo' : 'Employment Resources')}
          {activeCategory === 'housing' && (isSpanish ? 'Guía de Vivienda' : 'Housing Guide')}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {isSpanish
            ? 'Información importante para ayudarte'
            : 'Important information to help you'}
        </Text>

        {guides.map((guide) => (
          <TouchableOpacity
            key={guide.id}
            style={styles.guideCard}
            onPress={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
          >
            <View style={styles.guideHeader}>
              <Text style={styles.guideIcon}>{guide.icon}</Text>
              <View style={styles.guideInfo}>
                <Text style={styles.guideTitle}>
                  {isSpanish ? guide.titleEs : guide.title}
                </Text>
                <Text style={styles.guideDescription}>
                  {isSpanish ? guide.descriptionEs : guide.description}
                </Text>
              </View>
              <Text style={styles.guideArrow}>
                {expandedGuide === guide.id ? '▼' : '▶'}
              </Text>
            </View>

            {expandedGuide === guide.id && (
              <View style={styles.guideContent}>
                {guide.content.map((item, idx) => (
                  <View key={idx} style={styles.guideContentItem}>
                    <Text style={styles.guideContentBullet}>•</Text>
                    <Text style={styles.guideContentText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderUrgentSection = () => {
    const urgentItems = getUrgentResources();
    return (
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>
          {activeCategory === 'healthcare' && (isSpanish ? 'Ayuda de Emergencia' : 'Emergency Help')}
          {activeCategory === 'employment' && (isSpanish ? 'Ayuda Urgente' : 'Urgent Help')}
          {activeCategory === 'housing' && (isSpanish ? 'Refugio de Emergencia' : 'Emergency Shelter')}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {isSpanish ? 'Recursos disponibles 24/7' : '24/7 resources available'}
        </Text>

        <View style={styles.urgentWarning}>
          <Text style={styles.urgentWarningIcon}>⚠️</Text>
          <Text style={styles.urgentWarningText}>
            {isSpanish
              ? 'Si es una emergencia que pone en peligro tu vida, llama al 911'
              : 'If this is a life-threatening emergency, call 911'}
          </Text>
        </View>

        {urgentItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.urgentCard}
            onPress={() => handleCall(item.phone)}
          >
            <Text style={styles.urgentIcon}>{item.icon}</Text>
            <View style={styles.urgentInfo}>
              <Text style={styles.urgentName}>{item.name}</Text>
              <Text style={styles.urgentDescription}>{item.description}</Text>
            </View>
            <View style={styles.urgentPhone}>
              <Text style={styles.urgentPhoneText}>{item.phone}</Text>
              <Text style={styles.urgentPhoneLabel}>{isSpanish ? 'Llamar' : 'Call'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderResourcesTab = () => {
    const sectionTabs = getSectionTabs();
    const guides = getGuides();
    const urgentItems = getUrgentResources();

    return (
      <View style={styles.tabContent}>
        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryTab, activeCategory === category && styles.categoryTabActive]}
              onPress={() => {
                setActiveCategory(category);
                setExpandedSections(['recommended']);
              }}
            >
              <Text style={styles.categoryTabIcon}>
                {category === 'healthcare' ? '🏥' : category === 'employment' ? '💼' : '🏠'}
              </Text>
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category === 'healthcare'
                  ? (isSpanish ? 'Salud' : 'Health')
                  : category === 'employment'
                  ? (isSpanish ? 'Empleo' : 'Jobs')
                  : (isSpanish ? 'Vivienda' : 'Housing')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* All Sections on One Page */}
        <ScrollView style={styles.sectionScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.allSectionsContainer}>

            {/* FOR YOU Section */}
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => toggleSection('recommended')}
            >
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardIcon}>⭐</Text>
                <View style={styles.sectionCardInfo}>
                  <Text style={styles.sectionCardTitle}>
                    {isSpanish ? 'Para Ti' : 'For You'}
                  </Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {isSpanish ? 'Recomendaciones personalizadas' : 'Personalized recommendations'}
                  </Text>
                </View>
                <Text style={styles.sectionCardArrow}>
                  {isSectionExpanded('recommended') ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {isSectionExpanded('recommended') && (
              <View style={styles.sectionCardContent}>
                {isLoading ? (
                  <ActivityIndicator size="large" color="#2563EB" style={{ padding: 20 }} />
                ) : resources.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {isSpanish ? 'No se encontraron recursos' : 'No resources found'}
                  </Text>
                ) : (
                  resources.slice(0, 3).map((resource) => (
                    <View key={resource.id} style={styles.miniResourceCard}>
                      <Text style={styles.miniResourceName}>{resource.name}</Text>
                      <Text style={styles.miniResourceAddress}>{resource.address}</Text>
                      <View style={styles.miniResourceActions}>
                        {resource.phone && (
                          <TouchableOpacity onPress={() => handleCall(resource.phone!)}>
                            <Text style={styles.miniActionText}>📞 {isSpanish ? 'Llamar' : 'Call'}</Text>
                          </TouchableOpacity>
                        )}
                        {resource.website && (
                          <TouchableOpacity onPress={() => handleWebsite(resource.website!)}>
                            <Text style={styles.miniActionText}>🌐 Web</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* FIND/SEARCH Section */}
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => toggleSection('search')}
            >
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardIcon}>
                  {activeCategory === 'healthcare' ? '🔍' : activeCategory === 'employment' ? '💼' : '🏠'}
                </Text>
                <View style={styles.sectionCardInfo}>
                  <Text style={styles.sectionCardTitle}>
                    {activeCategory === 'healthcare' && (isSpanish ? 'Buscar Clínicas' : 'Find Clinics')}
                    {activeCategory === 'employment' && (isSpanish ? 'Buscar Empleos' : 'Find Jobs')}
                    {activeCategory === 'housing' && (isSpanish ? 'Buscar Vivienda' : 'Find Housing')}
                  </Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {isSpanish ? 'Explorar opciones cerca de ti' : 'Explore options near you'}
                  </Text>
                </View>
                <Text style={styles.sectionCardArrow}>
                  {isSectionExpanded('search') ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {isSectionExpanded('search') && (
              <View style={styles.sectionCardContent}>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={isSpanish ? 'Buscar...' : 'Search...'}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {activeCategory === 'healthcare' && resources.slice(0, 4).map((resource) => (
                  <View key={resource.id} style={styles.miniResourceCard}>
                    <Text style={styles.miniResourceName}>{resource.name}</Text>
                    <Text style={styles.miniResourceAddress}>{resource.address}</Text>
                    {resource.distance && (
                      <Text style={styles.miniResourceDistance}>{formatDistance(resource.distance)}</Text>
                    )}
                  </View>
                ))}

                {activeCategory === 'employment' && (
                  isLoadingSearch ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (jobListings.length > 0 ? jobListings : SAMPLE_JOBS.map(j => ({
                    id: j.id, name: j.title, description: j.company, services: [j.pay, j.type]
                  } as any))).slice(0, 4).map((job: any) => (
                    <View key={job.id} style={styles.miniResourceCard}>
                      <Text style={styles.miniResourceName}>{job.name || job.title}</Text>
                      <Text style={styles.miniResourceAddress}>{job.description || job.company}</Text>
                    </View>
                  ))
                )}

                {activeCategory === 'housing' && (
                  isLoadingSearch ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (housingListings.length > 0 ? housingListings : SAMPLE_HOUSING.map(h => ({
                    id: h.id, name: h.title, description: h.organization, phone: undefined
                  } as any))).slice(0, 4).map((housing: any) => (
                    <View key={housing.id} style={styles.miniResourceCard}>
                      <Text style={styles.miniResourceName}>{housing.name || housing.title}</Text>
                      <Text style={styles.miniResourceAddress}>{housing.description || housing.organization}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* LEARN Section */}
            <TouchableOpacity
              style={styles.sectionCard}
              onPress={() => toggleSection('learn')}
            >
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardIcon}>📚</Text>
                <View style={styles.sectionCardInfo}>
                  <Text style={styles.sectionCardTitle}>
                    {isSpanish ? 'Aprender' : 'Learn'}
                  </Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {isSpanish ? 'Guías y recursos educativos' : 'Guides and educational resources'}
                  </Text>
                </View>
                <Text style={styles.sectionCardArrow}>
                  {isSectionExpanded('learn') ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {isSectionExpanded('learn') && (
              <View style={styles.sectionCardContent}>
                {guides.map((guide) => (
                  <TouchableOpacity
                    key={guide.id}
                    style={styles.guideCard}
                    onPress={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
                  >
                    <View style={styles.guideHeader}>
                      <Text style={styles.guideIcon}>{guide.icon}</Text>
                      <View style={styles.guideInfo}>
                        <Text style={styles.guideTitle}>
                          {isSpanish ? guide.titleEs : guide.title}
                        </Text>
                        <Text style={styles.guideDescription}>
                          {isSpanish ? guide.descriptionEs : guide.description}
                        </Text>
                      </View>
                      <Text style={styles.guideArrow}>
                        {expandedGuide === guide.id ? '▼' : '▶'}
                      </Text>
                    </View>
                    {expandedGuide === guide.id && (
                      <View style={styles.guideContent}>
                        {guide.content.map((item, idx) => (
                          <View key={idx} style={styles.guideContentItem}>
                            <Text style={styles.guideContentBullet}>•</Text>
                            <Text style={styles.guideContentText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* URGENT Section */}
            <TouchableOpacity
              style={[styles.sectionCard, styles.urgentSectionCard]}
              onPress={() => toggleSection('urgent')}
            >
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardIcon}>🚨</Text>
                <View style={styles.sectionCardInfo}>
                  <Text style={styles.sectionCardTitle}>
                    {activeCategory === 'healthcare' && (isSpanish ? 'Emergencia' : 'Emergency')}
                    {activeCategory === 'employment' && (isSpanish ? 'Ayuda Urgente' : 'Urgent Help')}
                    {activeCategory === 'housing' && (isSpanish ? 'Refugio de Emergencia' : 'Emergency Shelter')}
                  </Text>
                  <Text style={styles.sectionCardSubtitle}>
                    {isSpanish ? 'Recursos 24/7' : '24/7 resources'}
                  </Text>
                </View>
                <Text style={styles.sectionCardArrow}>
                  {isSectionExpanded('urgent') ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {isSectionExpanded('urgent') && (
              <View style={styles.sectionCardContent}>
                <View style={styles.urgentWarning}>
                  <Text style={styles.urgentWarningIcon}>⚠️</Text>
                  <Text style={styles.urgentWarningText}>
                    {isSpanish
                      ? 'Si es una emergencia, llama al 911'
                      : 'If this is an emergency, call 911'}
                  </Text>
                </View>
                {urgentItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.urgentCard}
                    onPress={() => handleCall(item.phone)}
                  >
                    <Text style={styles.urgentIcon}>{item.icon}</Text>
                    <View style={styles.urgentInfo}>
                      <Text style={styles.urgentName}>{item.name}</Text>
                      <Text style={styles.urgentDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.urgentPhone}>
                      <Text style={styles.urgentPhoneText}>{item.phone}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTodosTab = () => {
    const todos = userProfile?.todos || [];
    const pendingTodos = todos.filter((t) => !t.completed);
    const completedTodos = todos.filter((t) => t.completed);

    return (
      <View style={styles.tabContent}>
        <View style={styles.todosHeader}>
          <Text style={styles.todosTitle}>
            {isSpanish ? 'Tu Lista de Tareas' : 'Your To-Do List'}
          </Text>
          <TouchableOpacity style={styles.addTodoButton} onPress={handleAddTodo}>
            <Text style={styles.addTodoText}>+ {isSpanish ? 'Agregar' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {todos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {isSpanish ? 'No hay tareas aún' : 'No tasks yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isSpanish
                ? 'Las tareas tuyas o de tu trabajador social aparecerán aquí'
                : 'Tasks from you or your case worker will appear here'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.todosList}>
            {pendingTodos.map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={styles.todoItem}
                onPress={() => handleToggleTodo(todo.id)}
              >
                <View style={styles.todoCheckbox}>
                  <View style={styles.checkbox} />
                </View>
                <View style={styles.todoContent}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  {todo.priority === 'urgent' && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>
                        {isSpanish ? 'Urgente' : 'Urgent'}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {completedTodos.length > 0 && (
              <>
                <Text style={styles.completedHeader}>
                  {isSpanish ? 'Completadas' : 'Completed'}
                </Text>
                {completedTodos.map((todo) => (
                  <TouchableOpacity
                    key={todo.id}
                    style={[styles.todoItem, styles.todoItemCompleted]}
                    onPress={() => handleToggleTodo(todo.id)}
                  >
                    <View style={styles.todoCheckbox}>
                      <View style={[styles.checkbox, styles.checkboxChecked]}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    </View>
                    <View style={styles.todoContent}>
                      <Text style={[styles.todoTitle, styles.todoTitleCompleted]}>
                        {todo.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderCaseworkerTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.caseworkerSection}>
        <Text style={styles.sectionTitle}>
          {isSpanish ? 'Trabajador Social' : 'Case Worker'}
        </Text>

        {userProfile?.connectedCaseWorkerId ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedIcon}>
              <Text style={styles.connectedIconText}>👥</Text>
            </View>
            <Text style={styles.connectedStatus}>
              {isSpanish ? 'Conectado' : 'Connected'}
            </Text>
          </View>
        ) : (
          <View style={styles.notConnectedCard}>
            <Text style={styles.notConnectedTitle}>
              {isSpanish ? 'Sin Trabajador Social Conectado' : 'No Case Worker Connected'}
            </Text>
            <Text style={styles.notConnectedDesc}>
              {isSpanish
                ? 'Comparte tu código con un trabajador social para conectarte'
                : 'Share your code with a case worker to connect'}
            </Text>

            <View style={styles.shareCodeSection}>
              <Text style={styles.shareCodeLabel}>
                {isSpanish ? 'Tu Código' : 'Your Code'}
              </Text>
              <TouchableOpacity style={styles.shareCodeBox} onPress={handleCopyCode}>
                <Text style={styles.shareCode}>{userProfile?.shareCode || '---'}</Text>
                <Text style={styles.copyIcon}>📋</Text>
              </TouchableOpacity>
              <Text style={styles.tapToCopy}>
                {codeCopied
                  ? (isSpanish ? '¡Código copiado!' : 'Code copied!')
                  : (isSpanish ? 'Toca para copiar' : 'Tap to copy')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {isSpanish ? 'Hola' : 'Hello'}, {userProfile?.name || 'Friend'}
        </Text>
        <Text style={styles.headerTitle}>
          {isSpanish ? 'Tu Panel' : 'Your Dashboard'}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
          onPress={() => setActiveTab('resources')}
        >
          <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>
            {isSpanish ? 'Recursos' : 'Resources'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'todos' && styles.tabActive]}
          onPress={() => setActiveTab('todos')}
        >
          <Text style={[styles.tabText, activeTab === 'todos' && styles.tabTextActive]}>
            {isSpanish ? 'Tareas' : 'To-Do'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'caseworker' && styles.tabActive]}
          onPress={() => setActiveTab('caseworker')}
        >
          <Text style={[styles.tabText, activeTab === 'caseworker' && styles.tabTextActive]}>
            {isSpanish ? 'Ayuda' : 'Support'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'resources' && renderResourcesTab()}
      {activeTab === 'todos' && renderTodosTab()}
      {activeTab === 'caseworker' && renderCaseworkerTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  tabContent: {
    flex: 1,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 60,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryTabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  sectionTabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    maxHeight: 50,
  },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  sectionTabActive: {
    backgroundColor: '#DBEAFE',
  },
  sectionTabText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionTabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  sectionScrollView: {
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  resourceDistance: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  resourceAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 10,
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  serviceTagText: {
    fontSize: 11,
    color: '#4B5563',
  },
  resourceActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  listContainer: {
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  listSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  listMetaText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  listMetaBadge: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  listArrow: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  guideIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  guideInfo: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  guideDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  guideArrow: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  guideContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#F9FAFB',
  },
  guideContentItem: {
    flexDirection: 'row',
    marginTop: 8,
  },
  guideContentBullet: {
    fontSize: 14,
    color: '#2563EB',
    marginRight: 8,
    marginTop: 1,
  },
  guideContentText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  urgentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  urgentWarningIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  urgentWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
  },
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  urgentIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  urgentInfo: {
    flex: 1,
  },
  urgentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  urgentDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  urgentPhone: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  urgentPhoneText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  urgentPhoneLabel: {
    fontSize: 10,
    color: '#FECACA',
  },
  todosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  todosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addTodoButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTodoText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todosList: {
    paddingHorizontal: 24,
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  todoItemCompleted: {
    opacity: 0.6,
  },
  todoCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 15,
    color: '#1F2937',
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  urgentBadgeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  completedHeader: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 10,
  },
  caseworkerSection: {
    padding: 24,
  },
  connectedCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  connectedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectedIconText: {
    fontSize: 32,
  },
  connectedStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
  },
  notConnectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notConnectedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  notConnectedDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareCodeSection: {
    alignItems: 'center',
    width: '100%',
  },
  shareCodeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  shareCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  shareCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 2,
    marginRight: 12,
  },
  copyIcon: {
    fontSize: 18,
  },
  tapToCopy: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  // New single-page layout styles
  allSectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionCardIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  sectionCardInfo: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionCardArrow: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sectionCardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  urgentSectionCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  miniResourceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  miniResourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  miniResourceAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  miniResourceDistance: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4,
    fontWeight: '500',
  },
  miniResourceActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  miniActionText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
});
