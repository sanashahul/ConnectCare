import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import {
  getHealthcareRecommendations,
  getHousingRecommendations,
  getEmploymentRecommendations,
  getHealthcareSummary,
  getHousingSummary,
  getEmploymentSummary,
  PersonalizedRecommendation,
  IntakeSummaryItem,
} from '../../utils/profileInsights';
import { ServiceCategory, UserProfile } from '../../types';

type IntakeSummaryScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Panel {
  key: string;
  category: ServiceCategory;
  heroTitle: string;
  heroTitleEs: string;
  heroColor: string;
  heroAccent: string;
  heroChips: string;
  heroChipsEs: string;
  getSummary: (p: UserProfile | null) => IntakeSummaryItem[];
  getRecs: (p: UserProfile | null) => PersonalizedRecommendation[];
}

/**
 * Post-intake "Based on what you told us" welcome screen.
 *
 * Rendered once the user finishes (or skips) the questionnaire. Shows
 * one horizontally-swipeable panel per selected category with:
 *  - Their answer summary as chips ("You told us...")
 *  - Their personalized next-step recommendations for that category
 *
 * After swiping through all panels, the final "Ready" panel drops them
 * on the Dashboard. They can revisit this walkthrough later via the
 * "Your next steps" hero card on each category screen.
 */
export const IntakeSummaryScreen: React.FC<IntakeSummaryScreenProps> = ({
  navigation,
}) => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const { state, dispatch } = useApp();
  const userProfile = state.userProfile;
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const panels = useMemo<Panel[]>(() => {
    const selected = userProfile?.selectedCategories || [];
    const all: Panel[] = [
      {
        key: 'healthcare',
        category: 'healthcare',
        heroTitle: 'Your health plan',
        heroTitleEs: 'Tu plan de salud',
        heroColor: '#0D9488',
        heroAccent: '#CCFBF1',
        heroChips: 'Here’s what you told us about your health',
        heroChipsEs: 'Esto es lo que nos dijiste sobre tu salud',
        getSummary: getHealthcareSummary,
        getRecs: getHealthcareRecommendations,
      },
      {
        key: 'housing',
        category: 'housing',
        heroTitle: 'Your housing plan',
        heroTitleEs: 'Tu plan de vivienda',
        heroColor: '#7C3AED',
        heroAccent: '#EDE9FE',
        heroChips: 'Here’s what you told us about your housing',
        heroChipsEs: 'Esto es lo que nos dijiste sobre tu vivienda',
        getSummary: getHousingSummary,
        getRecs: getHousingRecommendations,
      },
      {
        key: 'employment',
        category: 'employment',
        heroTitle: 'Your employment plan',
        heroTitleEs: 'Tu plan de empleo',
        heroColor: '#EA580C',
        heroAccent: '#FFEDD5',
        heroChips: 'Here’s what you told us about work',
        heroChipsEs: 'Esto es lo que nos dijiste sobre el trabajo',
        getSummary: getEmploymentSummary,
        getRecs: getEmploymentRecommendations,
      },
    ];
    return all.filter((p) => selected.includes(p.category));
  }, [userProfile?.selectedCategories]);

  const totalPages = panels.length + 1; // + 1 for the final "Ready" panel

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== currentPage) setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  };

  const goNext = () => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  };

  const goSkip = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  };

  const addAllFromPanel = (panel: Panel) => {
    const recs = panel.getRecs(userProfile);
    if (recs.length === 0) return;
    const existing = userProfile?.todos || [];
    const toAdd = recs.filter((rec) => {
      const title = isSpanish ? rec.titleEs : rec.title;
      return !existing.some((t) => !t.completed && t.title === title);
    });
    if (toAdd.length === 0) {
      Alert.alert(
        isSpanish ? 'Ya están en tu lista' : 'Already in your list',
        isSpanish
          ? 'Todos estos pasos ya están en tu lista.'
          : 'All of these steps are already in your list.',
      );
      return;
    }
    toAdd.forEach((rec) => {
      const title = isSpanish ? rec.titleEs : rec.title;
      const description = isSpanish ? rec.descriptionEs : rec.description;
      const resourcePhone =
        rec.actionType === 'call' ? rec.actionPayload : undefined;
      const resourceUrl =
        rec.actionType === 'url' ? rec.actionPayload : undefined;
      dispatch({
        type: 'ADD_TODO',
        payload: {
          title,
          description,
          completed: false,
          category: panel.category,
          resourcePhone,
          resourceUrl,
        } as any,
      });
    });
    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish
        ? `${toAdd.length} pasos se agregaron a tu lista.`
        : `${toAdd.length} steps added to your list.`,
    );
  };

  const handleActionTap = (rec: PersonalizedRecommendation) => {
    switch (rec.actionType) {
      case 'call':
        Linking.openURL(`tel:${rec.actionPayload.replace(/[^0-9]/g, '')}`);
        break;
      case 'url':
        Linking.openURL(rec.actionPayload);
        break;
      case 'navigate':
        // Panels route to category screens — those handle their own
        // navigation after the user lands on the Dashboard.
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
        break;
    }
  };

  const renderPanel = (panel: Panel, index: number) => {
    const summary = panel.getSummary(userProfile);
    const recs = panel.getRecs(userProfile);
    return (
      <ScrollView
        key={panel.key}
        style={{ width: SCREEN_WIDTH }}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: panel.heroColor }]}>
          <Text style={styles.heroEyebrow}>
            {isSpanish ? 'BASADO EN LO QUE NOS DIJISTE' : 'BASED ON WHAT YOU TOLD US'}
          </Text>
          <Text style={styles.heroTitle}>
            {isSpanish ? panel.heroTitleEs : panel.heroTitle}
          </Text>
          <Text style={[styles.heroSubtitle, { color: panel.heroAccent }]}>
            {isSpanish ? panel.heroChipsEs : panel.heroChips}
          </Text>
        </View>

        {summary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSpanish ? 'Tu respondiste:' : 'You told us:'}
            </Text>
            <View style={styles.chips}>
              {summary.map((item, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipIcon}>{item.icon}</Text>
                  <View>
                    <Text style={styles.chipLabel}>
                      {isSpanish ? item.labelEs : item.label}
                    </Text>
                    <Text style={styles.chipValue}>
                      {isSpanish ? item.valueEs : item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {recs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSpanish ? 'Tus próximos pasos:' : 'Your next steps:'}
            </Text>
            {recs.map((rec, idx) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recCard}
                onPress={() => handleActionTap(rec)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.stepBadge,
                    { backgroundColor: panel.heroColor },
                  ]}
                >
                  <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.recTitleRow}>
                    <Text style={styles.recIcon}>{rec.icon}</Text>
                    <Text style={styles.recTitle}>
                      {isSpanish ? rec.titleEs : rec.title}
                    </Text>
                  </View>
                  <Text style={styles.recDescription}>
                    {isSpanish ? rec.descriptionEs : rec.description}
                  </Text>
                  <Text style={styles.recReason}>
                    {isSpanish ? `↳ ${rec.reasonEs}` : `↳ ${rec.reason}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.addAllButton, { backgroundColor: panel.heroColor }]}
              onPress={() => addAllFromPanel(panel)}
              activeOpacity={0.85}
            >
              <Text style={styles.addAllText}>
                ＋ {isSpanish ? 'Agregar todo a mi plan' : 'Add all to my plan'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {summary.length === 0 && recs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>
              {isSpanish
                ? 'Aún no tenemos tus respuestas'
                : "We don't have your answers yet"}
            </Text>
            <Text style={styles.emptyText}>
              {isSpanish
                ? 'Completa tu intake para ver recomendaciones personalizadas aquí.'
                : 'Finish your intake to see personalized recommendations here.'}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderFinalPanel = () => (
    <ScrollView
      key="ready"
      style={{ width: SCREEN_WIDTH }}
      contentContainerStyle={styles.panelContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: '#2563EB' }]}>
        <Text style={styles.heroEyebrow}>
          {isSpanish ? '¡TODO LISTO!' : 'ALL SET!'}
        </Text>
        <Text style={styles.heroTitle}>
          {isSpanish
            ? `Bienvenido/a, ${userProfile?.name || 'amigo'} 👋`
            : `Welcome, ${userProfile?.name || 'friend'} 👋`}
        </Text>
        <Text style={[styles.heroSubtitle, { color: '#DBEAFE' }]}>
          {isSpanish
            ? 'Tu panel personalizado está listo.'
            : 'Your personalized dashboard is ready.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isSpanish ? 'En tu panel encontrarás:' : 'On your dashboard you’ll find:'}
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            ⭐ {isSpanish
              ? 'Tu plan personalizado en cada categoría'
              : 'Your personalized plan in each category'}
          </Text>
          <Text style={styles.bullet}>
            📋 {isSpanish
              ? 'Una lista de tareas agrupadas por tema'
              : 'A to-do list grouped by topic'}
          </Text>
          <Text style={styles.bullet}>
            🤖 {isSpanish
              ? 'Un asistente AI para preguntas abiertas'
              : 'An AI assistant for open questions'}
          </Text>
          <Text style={styles.bullet}>
            📞 {isSpanish
              ? 'Ayuda rápida: 211, comida, documentos'
              : 'Quick help: 211, food, documents'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.finalButton}
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })
        }
        activeOpacity={0.85}
      >
        <Text style={styles.finalButtonText}>
          {isSpanish ? 'Ir a mi panel →' : 'Go to my dashboard →'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar with skip button */}
      <View style={styles.topBar}>
        <Text style={styles.topBarLabel}>
          {currentPage + 1} / {totalPages}
        </Text>
        <TouchableOpacity onPress={goSkip}>
          <Text style={styles.skipText}>
            {isSpanish ? 'Saltar' : 'Skip'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable panels */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {panels.map((panel, idx) => renderPanel(panel, idx))}
        {renderFinalPanel()}
      </ScrollView>

      {/* Page dots + next button */}
      <View style={styles.bottomBar}>
        <View style={styles.dots}>
          {Array.from({ length: totalPages }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                currentPage === idx && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {currentPage < totalPages - 1
              ? isSpanish
                ? 'Siguiente →'
                : 'Next →'
              : isSpanish
              ? 'Ir al panel →'
              : 'Go to dashboard →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topBarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 24,
    padding: 28,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroEyebrow: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  recCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  recTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recIcon: {
    fontSize: 20,
  },
  recTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  recDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  recReason: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748B',
    fontWeight: '600',
  },
  addAllButton: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addAllText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  bulletList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bullet: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 22,
  },
  finalButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    backgroundColor: '#0F172A',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
