/**
 * PlanScreen - a calm, guided session with Casy.
 * Casy greets the user, walks them through their personalized plan one step
 * at a time, and stays available for a real conversation. This is where it
 * should feel like actually working WITH an AI case manager.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  StatusBar,
  Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { CasyAvatar } from '../../components';
import {
  sendMessageToAI,
  buildAnswersSummary,
  generatePersonalizedPlan,
  AIMessage,
  UserContext,
} from '../../services/aiService';
import { PlanRecommendation } from '../../types';

type RootStackParamList = {
  Plan: undefined;
  Dashboard: undefined;
  Health: undefined;
  Housing: undefined;
  Jobs: undefined;
};

type PlanScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Plan'>;
};

const CAT_STYLE: Record<string, { bg: string; icon: string }> = {
  housing: { bg: '#F5F3FF', icon: '🏠' },
  healthcare: { bg: '#F0FDFA', icon: '🏥' },
  employment: { bg: '#FFF7ED', icon: '💼' },
  documents: { bg: '#EFF6FF', icon: '📄' },
  benefits: { bg: '#F0FDF4', icon: '💳' },
  education: { bg: '#FEF2F2', icon: '📚' },
  other: { bg: '#F8FAFC', icon: '✅' },
};

export const PlanScreen: React.FC<PlanScreenProps> = ({ navigation }) => {
  const { i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const isSpanish = i18n.language === 'es';
  const profile = state.userProfile;
  const plan = profile?.recommendations;
  const recs = plan?.recommendations || [];
  const progress = profile?.planProgress || [];
  const doneCount = progress.length;
  const isDone = (idx: number) => progress.includes(idx);

  const sharePlan = () => {
    if (!plan) return;
    const lines = [
      isSpanish ? 'Mi plan de ConnectCare (con Casy)' : 'My ConnectCare plan (with Casy)',
      '',
      plan.summary,
      '',
      ...recs.map((r, i) => {
        const parts = [`${i + 1}. ${r.title}`];
        if (r.resourceName) parts.push(`   ${r.resourceName}`);
        if (r.address) parts.push(`   ${r.address}`);
        if (r.phone) parts.push(`   ${r.phone}`);
        if (r.website) parts.push(`   ${r.website}`);
        return parts.join('\n');
      }),
      '',
      isSpanish
        ? 'Nota: confirma los datos llamando antes de ir.'
        : 'Note: please call to confirm details before visiting.',
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  const [revealed, setRevealed] = useState(1);
  const [chat, setChat] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Start in the building state right away if we arrived without a plan, so
  // the user sees "Casy is building your plan" immediately (no button, no flash).
  const [building, setBuilding] = useState(() => !plan);
  const builtRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [revealed, chat, loading]);

  // Clear the "land on Plan after onboarding" flag so future app launches go
  // to the Dashboard, not back here.
  useEffect(() => {
    if (state.startPlanAfterOnboarding) {
      dispatch({ type: 'CLEAR_START_PLAN' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Go back to the Dashboard. When Plan is the first screen (right after
  // onboarding) there's nothing to pop, so reset to the Dashboard instead.
  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  };

  // Build the plan automatically, retrying a few times so a transient failure
  // resolves on its own - no button needed.
  const buildPlanNow = async () => {
    setBuilding(true);
    let built = false;
    for (let attempt = 0; attempt < 3 && !built; attempt++) {
      try {
        const p = await generatePersonalizedPlan(buildContext());
        if (p) {
          dispatch({ type: 'SET_RECOMMENDATIONS', payload: p });
          built = true;
        }
      } catch (e) {
        console.log('Plan build attempt failed:', attempt, e);
      }
    }
    setBuilding(false);
  };

  // Auto-build the plan the moment we have a ready profile - no button, ever.
  // This is keyed on the profile (answers/shareCode) so that if the profile
  // commits a beat AFTER this screen mounts (a race with COMPLETE_ONBOARDING
  // when finishing the questionnaire), the build still fires on the next
  // render instead of getting stuck on an empty "build my plan" state.
  useEffect(() => {
    if (plan || builtRef.current) return;
    const ready = (profile?.answers?.length || 0) > 0 || !!profile?.shareCode;
    if (!ready) return;
    builtRef.current = true;
    buildPlanNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, profile?.answers?.length, profile?.shareCode]);

  // Casy's context, including the plan itself so the conversation is plan-aware.
  const buildContext = (): UserContext => {
    const loc = profile?.location;
    const hasCoords =
      !!loc &&
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      (loc.latitude !== 0 || loc.longitude !== 0);

    const answers = buildAnswersSummary(profile?.answers, isSpanish ? 'es' : 'en');
    const planText = plan
      ? `\n\nCURRENT PLAN YOU MADE FOR THEM:\n${plan.summary}\n${recs
          .map((r, i) => `${i + 1}. ${r.title} — ${r.action}${r.phone ? ` (${r.phone})` : ''}`)
          .join('\n')}`
      : '';

    return {
      name: profile?.name,
      city: loc?.city,
      state: loc?.state,
      language: isSpanish ? 'es' : 'en',
      needs: profile?.selectedCategories,
      ageGroup: profile?.ageGroup,
      isMinor: profile?.ageGroup === 'under18',
      location: hasCoords ? loc : undefined,
      answersSummary: `${answers}${planText}`,
    };
  };

  const allowedCats = ['housing', 'employment', 'healthcare', 'documents', 'benefits', 'education', 'other'];
  const addTaskFromCasy = (task: any) => {
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: task.title,
        description: task.note || undefined,
        completed: false,
        priority: 'normal',
        createdBy: 'individual',
        category: (task.category && allowedCats.includes(task.category) ? task.category : 'other') as any,
        resourcePhone: task.phone || undefined,
        resourceUrl: task.website || undefined,
      } as any,
    });
  };
  const saveResourceFromCasy = (r: any) => {
    dispatch({
      type: 'ADD_SAVED_RESOURCE',
      payload: {
        title: r.resourceName,
        resourceName: r.resourceName,
        why: r.why || '',
        address: r.address,
        phone: r.phone,
        website: r.website,
        action: '',
        category: (r.category && allowedCats.includes(r.category) ? r.category : 'other') as any,
      } as any,
    });
  };

  const ask = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const history = chat;
    setChat((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendMessageToAI(msg, history, buildContext(), addTaskFromCasy, saveResourceFromCasy);
      setChat((prev) => [...prev, { role: 'model', content: reply }]);
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: 'model',
          content: isSpanish
            ? 'Lo siento, tuve un problema. Intenta de nuevo o llama al 211.'
            : 'Sorry, I had a problem. Please try again or call 211.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToList = (rec: PlanRecommendation) => {
    const allowed = ['housing', 'employment', 'healthcare', 'documents', 'benefits', 'education', 'other'];
    const desc = [rec.action || rec.why, rec.resourceName, rec.address]
      .filter(Boolean)
      .join(' · ');
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: rec.title,
        description: desc || undefined,
        completed: false,
        priority: 'normal',
        createdBy: 'individual',
        category: (allowed.includes(rec.category) ? rec.category : 'other') as any,
        resourcePhone: rec.phone || undefined,
        resourceUrl: rec.website || undefined,
      } as any,
    });
    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish ? 'Paso agregado a tu lista de tareas' : 'Step added to your to-do list',
      [{ text: 'OK' }]
    );
  };

  const renderStep = (rec: PlanRecommendation, idx: number) => {
    const cs = CAT_STYLE[rec.category] || CAT_STYLE.other;
    const done = isDone(idx);
    return (
      <View key={idx} style={[styles.stepCard, done && styles.stepCardDone]}>
        <View style={styles.stepTop}>
          <TouchableOpacity
            style={[styles.stepCheck, done && styles.stepCheckDone]}
            onPress={() => dispatch({ type: 'TOGGLE_PLAN_STEP', payload: idx })}
          >
            <Text style={styles.stepCheckMark}>{done ? '✓' : idx + 1}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {idx === 0 && !done && (
              <Text style={styles.stepPriority}>{isSpanish ? 'EMPIEZA AQUÍ' : 'START HERE'}</Text>
            )}
            <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{rec.title}</Text>
            {!!rec.why && <Text style={styles.stepWhy}>{rec.why}</Text>}
          </View>
          <Text style={styles.stepCatIcon}>{cs.icon}</Text>
        </View>

        {(!!rec.resourceName || !!rec.phone || !!rec.action || !!rec.website) && (
          <View style={styles.resourceChip}>
            <View style={{ flex: 1 }}>
              {!!rec.resourceName && <Text style={styles.resourceName}>{rec.resourceName}</Text>}
              {!!rec.address && <Text style={styles.resourceAddress}>📍 {rec.address}</Text>}
              {!!rec.action && <Text style={styles.resourceAction}>{rec.action}</Text>}
              <View style={styles.resourceLinks}>
                {!!rec.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${rec.phone!.replace(/[^0-9]/g, '')}`)}
                  >
                    <Text style={styles.resourceLink}>📞 {rec.phone}</Text>
                  </TouchableOpacity>
                )}
                {!!rec.website && (
                  <TouchableOpacity onPress={() => Linking.openURL(rec.website!)}>
                    <Text style={styles.resourceLink}>🌐 {isSpanish ? 'Sitio web' : 'Website'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.stepActions}>
          <TouchableOpacity
            style={styles.askBtn}
            onPress={() =>
              ask(
                isSpanish
                  ? `Ayúdame con este paso: ${rec.title}. ${rec.action}`
                  : `Help me with this step: ${rec.title}. ${rec.action}`
              )
            }
          >
            <Text style={styles.askText}>{isSpanish ? 'Preguntar a Casy' : 'Ask Casy about this'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => addToList(rec)}>
            <Text style={styles.addText}>+ {isSpanish ? 'Agregar' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Warm handoff: prep the person for this step */}
        <TouchableOpacity
          style={styles.prepBtn}
          onPress={() =>
            ask(
              isSpanish
                ? `Prepárame para este paso: "${rec.title}"${rec.resourceName ? ` con ${rec.resourceName}` : ''}. ¿Qué debo llevar y qué debo decir exactamente cuando llame o vaya?`
                : `Prep me for this step: "${rec.title}"${rec.resourceName ? ` with ${rec.resourceName}` : ''}. What should I bring, and exactly what should I say when I call or go?`
            )
          }
        >
          <Text style={styles.prepText}>
            📋 {isSpanish ? 'Prepárame: qué llevar y qué decir' : 'Prep me: what to bring & say'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Hand-off into the Health / Housing / Jobs sections for the categories the
  // user chose, so the plan flows naturally into deeper resources.
  const renderSections = () => {
    const cats = profile?.selectedCategories || [];
    const map: Record<string, { label: string; screen: keyof RootStackParamList; icon: string; bg: string }> = {
      housing: { label: isSpanish ? 'Vivienda' : 'Housing', screen: 'Housing', icon: '🏠', bg: '#F5F3FF' },
      healthcare: { label: isSpanish ? 'Salud' : 'Health', screen: 'Health', icon: '🏥', bg: '#F0FDFA' },
      employment: { label: isSpanish ? 'Empleo' : 'Jobs', screen: 'Jobs', icon: '💼', bg: '#FFF7ED' },
    };
    const shown = cats.filter((c) => map[c]);
    if (!shown.length) return null;
    return (
      <View style={styles.sectionsBlock}>
        <Text style={styles.sectionsTitle}>
          {isSpanish ? 'Explora tus secciones' : 'Explore your sections'}
        </Text>
        {shown.map((c) => {
          const s = map[c];
          return (
            <TouchableOpacity
              key={c}
              style={styles.sectionBtn}
              onPress={() => navigation.navigate(s.screen)}
            >
              <View style={[styles.sectionIconWrap, { backgroundColor: s.bg }]}>
                <Text style={styles.sectionIcon}>{s.icon}</Text>
              </View>
              <Text style={styles.sectionLabel}>{s.label}</Text>
              <Text style={styles.sectionArrow}>→</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Group the recommendations into "Your Housing Plan / Healthcare Plan /
  // Employment Plan" sections so the plan reads by category.
  const renderGroupedPlan = () => {
    const titles: Record<string, { en: string; es: string; icon: string }> = {
      housing: { en: 'Your Housing Plan', es: 'Tu plan de vivienda', icon: '🏠' },
      healthcare: { en: 'Your Healthcare Plan', es: 'Tu plan de salud', icon: '🏥' },
      employment: { en: 'Your Employment Plan', es: 'Tu plan de empleo', icon: '💼' },
      other: { en: 'Your Action Plan', es: 'Tu plan de acción', icon: '✅' },
    };
    const order = ['housing', 'healthcare', 'employment'];
    const groups: Record<string, PlanRecommendation[]> = {};
    recs.forEach((r) => {
      const key = order.includes(r.category) ? r.category : 'other';
      (groups[key] = groups[key] || []).push(r);
    });
    const keys = [...order.filter((k) => groups[k]), ...(groups.other ? ['other'] : [])];

    let globalIdx = 0;
    return keys.map((key) => {
      const t = titles[key];
      return (
        <View key={key} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupIcon}>{t.icon}</Text>
            <Text style={styles.groupTitle}>{isSpanish ? t.es : t.en}</Text>
          </View>
          {groups[key].map((rec) => renderStep(rec, globalIdx++))}
        </View>
      );
    });
  };

  // Building the plan: full-screen warm loading.
  if (building) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.buildingWrap}>
          <CasyAvatar size={72} />
          <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 24 }} />
          <Text style={styles.buildingTitle}>
            {isSpanish ? 'Casy está preparando tu plan' : 'Casy is building your plan'}
          </Text>
          <Text style={styles.buildingSub}>
            {isSpanish
              ? 'Estoy revisando tus respuestas y buscando recursos reales para ti.'
              : "I'm reviewing your answers and finding real resources for you."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CasyAvatar size={30} />
          <Text style={styles.headerTitle}>{isSpanish ? 'Tu plan con Casy' : 'Your plan with Casy'}</Text>
        </View>
        {plan ? (
          <TouchableOpacity onPress={sharePlan} style={styles.shareBtn}>
            <Text style={styles.shareText}>↗</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!plan ? (
            <View style={styles.emptyWrap}>
              <CasyAvatar size={64} />
              <Text style={styles.emptyTitle}>
                {isSpanish ? 'No pude crear tu plan' : "Couldn't build your plan"}
              </Text>
              <Text style={styles.emptySub}>
                {isSpanish
                  ? 'Revisa tu conexión e inténtalo de nuevo, o pregúntame lo que necesites abajo.'
                  : 'Check your connection and try again, or ask me anything below.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={buildPlanNow}>
                <Text style={styles.retryText}>
                  {isSpanish ? 'Intentar de nuevo' : 'Try again'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Casy intro */}
              <View style={styles.introRow}>
                <CasyAvatar size={34} />
                <View style={styles.introBubble}>
                  <Text style={styles.introWelcome}>
                    {isSpanish
                      ? `¡Bienvenido/a a tu plan, ${profile?.name || ''}! 🎉`
                      : `Welcome to your plan, ${profile?.name || 'friend'}! 🎉`}
                  </Text>
                  <Text style={styles.introText}>
                    {isSpanish
                      ? `Soy Casy, tu gestor de caso. Según lo que me contaste, preparé esto especialmente para ti:`
                      : `I'm Casy, your case manager. Based on what you shared, I put this together just for you:`}
                  </Text>
                  <Text style={[styles.introText, { marginTop: 10 }]}>{plan.summary}</Text>
                  <Text style={styles.introTeaser}>
                    {isSpanish
                      ? 'Aquí está tu plan, organizado para ti:'
                      : "Here's your plan, organized for you:"}
                  </Text>
                </View>
              </View>

              <Text style={styles.verifyNote}>
                {isSpanish
                  ? 'Casy usa IA. Los teléfonos y sitios web pueden cambiar, así que confirma llamando antes de ir.'
                  : 'Casy is AI-powered. Phone numbers and websites can change, so please call to confirm before visiting.'}
              </Text>

              {/* Progress */}
              <View style={styles.progressCard}>
                <View style={styles.progressTop}>
                  <Text style={styles.progressLabel}>
                    {isSpanish ? 'Tu progreso' : 'Your progress'}
                  </Text>
                  <Text style={styles.progressCount}>
                    {doneCount}/{recs.length} {isSpanish ? 'hecho' : 'done'}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${recs.length ? (doneCount / recs.length) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressCheer}>
                  {doneCount === 0
                    ? isSpanish ? 'Un paso a la vez. Tú puedes.' : "One step at a time. You've got this."
                    : doneCount >= recs.length
                      ? isSpanish ? '¡Lo lograste! Estoy orgulloso de ti.' : "You did it all! I'm proud of you."
                      : isSpanish ? `¡Buen trabajo! Sigue así.` : `Great work, keep it going!`}
                </Text>
              </View>

              {renderGroupedPlan()}

              <TouchableOpacity
                style={styles.dashboardBtn}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <Text style={styles.dashboardBtnText}>
                  {isSpanish ? 'Continuar a mi panel' : 'Continue to my dashboard'}
                </Text>
                <Text style={styles.dashboardBtnArrow}>→</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Free conversation */}
          {chat.map((m, i) => (
            <View
              key={`c${i}`}
              style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.content}</Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#0D9488" />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isSpanish ? 'Habla con Casy...' : 'Talk to Casy...'}
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => ask(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 34, color: '#0D9488', fontWeight: '700', marginTop: -4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontSize: 24, color: '#0D9488', fontWeight: '800' },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  progressCount: { fontSize: 14, fontWeight: '800', color: '#0D9488' },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 999, backgroundColor: '#0D9488' },
  progressCheer: { fontSize: 13, color: '#0D9488', fontWeight: '700', marginTop: 10 },
  stepCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepCheckDone: { backgroundColor: '#16A34A' },
  stepCheckMark: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  stepCardDone: { opacity: 0.7 },
  stepTitleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  prepBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prepText: { color: '#475569', fontWeight: '700', fontSize: 13 },
  content: { padding: 18, paddingBottom: 28 },

  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  introBubble: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    padding: 14,
  },
  introWelcome: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3 },
  introText: { fontSize: 15.5, color: '#0F172A', lineHeight: 23 },
  introTeaser: { fontSize: 14, color: '#0D9488', fontWeight: '700', marginTop: 8 },

  group: { marginBottom: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 6 },
  groupIcon: { fontSize: 20 },
  groupTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },

  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  dashboardBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  dashboardBtnArrow: { color: '#FFFFFF', fontWeight: '800', fontSize: 19 },

  sectionsBlock: { marginTop: 4, marginBottom: 8 },
  sectionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIcon: { fontSize: 22 },
  sectionLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sectionArrow: { fontSize: 20, color: '#0D9488', fontWeight: '800' },

  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stepTop: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  stepCatIcon: { fontSize: 20, marginLeft: 8 },
  stepPriority: { fontSize: 10.5, fontWeight: '800', color: '#0D9488', letterSpacing: 1, marginBottom: 4 },
  stepTitle: { fontSize: 15.5, fontWeight: '700', color: '#0F172A', marginBottom: 3, lineHeight: 21 },
  stepWhy: { fontSize: 13, color: '#64748B', lineHeight: 19 },

  resourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resourceName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  resourceAddress: { fontSize: 12.5, color: '#475569', marginTop: 2 },
  resourceAction: { fontSize: 12.5, color: '#64748B', lineHeight: 18, marginTop: 2 },
  resourceLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  resourceLink: { fontSize: 13.5, color: '#0D9488', fontWeight: '800' },
  verifyNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 14,
    marginLeft: 4,
    lineHeight: 17,
  },
  callBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  callText: { fontSize: 13.5, color: '#0D9488', fontWeight: '800' },

  stepActions: { flexDirection: 'row', marginTop: 14, gap: 10 },
  askBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  askText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
  },
  addText: { color: '#0D9488', fontWeight: '800', fontSize: 13.5 },

  nextBtn: {
    alignSelf: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 4,
    marginBottom: 8,
  },
  nextText: { color: '#0D9488', fontWeight: '800', fontSize: 14.5 },

  bubble: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', borderTopLeftRadius: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0D9488', borderTopRightRadius: 6 },
  aiText: { fontSize: 15.5, color: '#0F172A', lineHeight: 22 },
  userText: { fontSize: 15.5, color: '#FFFFFF', lineHeight: 22 },
  loadingBubble: { paddingVertical: 16 },

  buildingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  buildingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 24, textAlign: 'center' },
  buildingSub: { fontSize: 15, color: '#64748B', marginTop: 10, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 18,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 18 },
  emptySub: { fontSize: 14.5, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 21 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15.5,
    color: '#0F172A',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  sendIcon: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
});
