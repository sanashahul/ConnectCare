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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { CasyAvatar } from '../../components';
import {
  sendMessageToAI,
  buildAnswersSummary,
  AIMessage,
  UserContext,
} from '../../services/aiService';
import { PlanRecommendation } from '../../types';

type RootStackParamList = {
  Plan: undefined;
  Dashboard: undefined;
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

  const [revealed, setRevealed] = useState(1);
  const [chat, setChat] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [revealed, chat, loading]);

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

  const ask = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const history = chat;
    setChat((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendMessageToAI(msg, history, buildContext());
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
    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: rec.title,
        description: rec.action || rec.why || undefined,
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
    return (
      <View key={idx} style={styles.stepCard}>
        <View style={styles.stepTop}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{idx + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {idx === 0 && (
              <Text style={styles.stepPriority}>{isSpanish ? 'EMPIEZA AQUÍ' : 'START HERE'}</Text>
            )}
            <Text style={styles.stepTitle}>{rec.title}</Text>
            {!!rec.why && <Text style={styles.stepWhy}>{rec.why}</Text>}
          </View>
          <Text style={styles.stepCatIcon}>{cs.icon}</Text>
        </View>

        {(!!rec.resourceName || !!rec.phone || !!rec.action) && (
          <View style={styles.resourceChip}>
            <View style={{ flex: 1 }}>
              {!!rec.resourceName && <Text style={styles.resourceName}>{rec.resourceName}</Text>}
              {!!rec.action && <Text style={styles.resourceAction}>{rec.action}</Text>}
            </View>
            {!!rec.phone && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${rec.phone!.replace(/[^0-9]/g, '')}`)}
              >
                <Text style={styles.callText}>{rec.phone}</Text>
              </TouchableOpacity>
            )}
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
      </View>
    );
  };

  const allRevealed = revealed >= recs.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CasyAvatar size={30} />
          <Text style={styles.headerTitle}>{isSpanish ? 'Tu plan con Casy' : 'Your plan with Casy'}</Text>
        </View>
        <View style={{ width: 40 }} />
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
                {isSpanish ? 'Aún no tienes un plan' : 'No plan yet'}
              </Text>
              <Text style={styles.emptySub}>
                {isSpanish
                  ? 'Pregúntame lo que necesites abajo y te ayudo ahora mismo.'
                  : 'Ask me anything below and I will help you right now.'}
              </Text>
            </View>
          ) : (
            <>
              {/* Casy intro */}
              <View style={styles.introRow}>
                <CasyAvatar size={34} />
                <View style={styles.introBubble}>
                  <Text style={styles.introText}>{plan.summary}</Text>
                  <Text style={styles.introTeaser}>
                    {isSpanish
                      ? 'Vamos paso a paso. Aquí es donde yo empezaría:'
                      : "Let's take this one step at a time. Here's where I'd start:"}
                  </Text>
                </View>
              </View>

              {recs.slice(0, revealed).map((rec, idx) => renderStep(rec, idx))}

              {!allRevealed ? (
                <TouchableOpacity style={styles.nextBtn} onPress={() => setRevealed((r) => r + 1)}>
                  <Text style={styles.nextText}>
                    {isSpanish ? 'Ver el siguiente paso' : 'Show me the next step'} ↓
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.introRow}>
                  <CasyAvatar size={34} />
                  <View style={styles.introBubble}>
                    <Text style={styles.introText}>
                      {isSpanish
                        ? 'Ese es tu plan. Estoy aquí contigo, pregúntame lo que sea cuando quieras.'
                        : "That's your plan. I'm right here with you, ask me anything whenever you need."}
                    </Text>
                  </View>
                </View>
              )}
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
  introText: { fontSize: 15.5, color: '#0F172A', lineHeight: 23 },
  introTeaser: { fontSize: 14, color: '#0D9488', fontWeight: '700', marginTop: 8 },

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
  resourceAction: { fontSize: 12.5, color: '#64748B', lineHeight: 18, marginTop: 2 },
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
