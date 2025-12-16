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

// Emergency resources
const URGENT_RESOURCES = [
  { id: 'u1', name: 'Emergency: 911', nameEs: 'Emergencia: 911', description: 'Life-threatening emergencies', descriptionEs: 'Emergencias que amenazan la vida', phone: '911', icon: '🚨' },
  { id: 'u2', name: 'Suicide & Crisis Lifeline', nameEs: 'Línea de Crisis', description: '24/7 mental health crisis support', descriptionEs: 'Apoyo de crisis de salud mental 24/7', phone: '988', icon: '💚' },
  { id: 'u3', name: 'Poison Control', nameEs: 'Control de Venenos', description: 'Poisoning emergencies', descriptionEs: 'Emergencias por envenenamiento', phone: '1-800-222-1222', icon: '☠️' },
  { id: 'u4', name: 'SAMHSA Helpline', nameEs: 'Línea de Ayuda SAMHSA', description: 'Substance abuse help 24/7', descriptionEs: 'Ayuda con abuso de sustancias 24/7', phone: '1-800-662-4357', icon: '🤝' },
];

export const HealthScreen: React.FC<HealthScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state } = useApp();
  const [activeSection, setActiveSection] = useState<'foryou' | 'clinics' | 'urgent' | null>(null);
  const [clinics, setClinics] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;

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

  const renderMainGrid = () => (
    <View style={styles.gridContainer}>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>
            {isSpanish ? 'Buscando clínicas...' : 'Finding clinics...'}
          </Text>
        </View>
      ) : clinics.length > 0 ? (
        clinics.map((clinic) => (
          <TouchableOpacity
            key={clinic.id}
            style={styles.clinicCard}
            onPress={() => clinic.phone && handleCall(clinic.phone)}
          >
            <View style={styles.clinicHeader}>
              <Text style={styles.clinicIcon}>🏥</Text>
              <View style={styles.clinicInfo}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                {clinic.address && (
                  <Text style={styles.clinicAddress}>{clinic.address}</Text>
                )}
                {clinic.distance && (
                  <Text style={styles.clinicDistance}>
                    📍 {clinic.distance.toFixed(1)} {isSpanish ? 'millas' : 'miles'}
                  </Text>
                )}
              </View>
            </View>
            {clinic.phone && (
              <View style={styles.callButton}>
                <Text style={styles.callButtonText}>📞 {isSpanish ? 'Llamar' : 'Call'}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
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
  callButton: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D9488',
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
});
