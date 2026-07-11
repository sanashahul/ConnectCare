/**
 * IntakeChatScreen - conversational intake with Casy.
 * Instead of tapping through the questionnaire, the person can just talk to
 * Casy. Casy gathers their situation warmly, then builds their plan from the
 * conversation and drops them into the app.
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
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { CasyAvatar } from '../../components';
import {
  sendIntakeMessage,
  buildPlanFromConversation,
  AIMessage,
} from '../../services/aiService';
import { getLocationFromCity } from '../../utils/location';
import { ServiceCategory } from '../../types';

type RootStackParamList = {
  IntakeChat: undefined;
  Dashboard: undefined;
  Plan: undefined;
  Welcome: undefined;
};

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'IntakeChat'> };

export const IntakeChatScreen: React.FC<Props> = ({ navigation }) => {
  const { i18n } = useTranslation();
  const { dispatch } = useApp();
  const isSpanish = i18n.language === 'es';
  const lang: 'en' | 'es' = isSpanish ? 'es' : 'en';

  const greeting = isSpanish
    ? 'Hola, soy Casy, tu gestor de caso de IA. Estoy aquí para ayudarte. Para empezar, ¿cómo te llamas y en qué ciudad estás?'
    : "Hi, I'm Casy, your AI case manager. I'm here to help. To start, what's your name and what city are you in?";

  const [messages, setMessages] = useState<AIMessage[]>([{ role: 'model', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, loading]);

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const canBuild = userTurns >= 2;

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading || building) return;
    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendIntakeMessage(msg, history, lang);
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: isSpanish ? 'Intenta de nuevo.' : 'Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const buildPlan = async () => {
    if (building) return;
    setBuilding(true);
    try {
      const result = await buildPlanFromConversation(messages, lang);
      if (!result) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: isSpanish
              ? 'Tuve un problema creando tu plan. Cuéntame un poco más y vuelve a intentar.'
              : 'I had trouble building your plan. Tell me a little more and try again.',
          },
        ]);
        setBuilding(false);
        return;
      }

      // Save what Casy learned into the profile.
      dispatch({ type: 'SET_USER_ROLE', payload: 'individual' });
      if (result.name) dispatch({ type: 'SET_USER_NAME', payload: result.name });

      if (result.city) {
        const loc = await getLocationFromCity(result.city, result.state);
        dispatch({
          type: 'SET_LOCATION',
          payload:
            loc || { latitude: 0, longitude: 0, city: result.city, state: result.state },
        });
      }

      const validCats = (result.needs || []).filter((n) =>
        ['housing', 'healthcare', 'employment'].includes(n)
      ) as ServiceCategory[];
      if (validCats.length) dispatch({ type: 'SET_CATEGORIES', payload: validCats });

      dispatch({ type: 'SET_RECOMMENDATIONS', payload: result.plan });
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      // Show the plan first, with the dashboard underneath it.
      navigation.reset({ index: 1, routes: [{ name: 'Dashboard' }, { name: 'Plan' }] });
    } catch {
      setBuilding(false);
    }
  };

  if (building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.buildingWrap}>
          <CasyAvatar size={72} />
          <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 24 }} />
          <Text style={styles.buildingTitle}>
            {isSpanish ? 'Casy está creando tu plan' : 'Casy is building your plan'}
          </Text>
          <Text style={styles.buildingSub}>
            {isSpanish
              ? 'Usando lo que me contaste para encontrar recursos reales para ti.'
              : 'Using what you told me to find real resources for you.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CasyAvatar size={30} />
          <Text style={styles.headerTitle}>{isSpanish ? 'Hablar con Casy' : 'Talk with Casy'}</Text>
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
          {messages.map((m, i) => (
            <View
              key={i}
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
          {canBuild && (
            <TouchableOpacity style={styles.buildBtn} onPress={buildPlan}>
              <Text style={styles.buildText}>
                ✨ {isSpanish ? 'Crear mi plan' : 'Build my plan'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isSpanish ? 'Escribe tu respuesta...' : 'Type your answer...'}
            placeholderTextColor="#94A3B8"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
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
  bubble: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', borderTopLeftRadius: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0D9488', borderTopRightRadius: 6 },
  aiText: { fontSize: 15.5, color: '#0F172A', lineHeight: 22 },
  userText: { fontSize: 15.5, color: '#FFFFFF', lineHeight: 22 },
  loadingBubble: { paddingVertical: 16 },
  buildBtn: {
    marginTop: 6,
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buildText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  buildingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  buildingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 24, textAlign: 'center' },
  buildingSub: { fontSize: 15, color: '#64748B', marginTop: 10, textAlign: 'center', lineHeight: 22 },
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
