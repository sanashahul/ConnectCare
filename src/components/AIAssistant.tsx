/**
 * AIAssistant - a floating AI Case Manager helper that can be dropped onto any
 * screen. Renders a floating button; tapping it opens a chat sheet powered by
 * Claude. Pass `focus` so the assistant opens tuned to the current tab.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { sendMessageToAI, buildAnswersSummary, AIMessage, UserContext, AddTaskInput, SaveResourceInput } from '../services/aiService';
import { CasyAvatar } from './CasyAvatar';

export type AIFocus = 'housing' | 'healthcare' | 'employment';

interface Props {
  focus?: AIFocus;
}

const greetingFor = (focus: AIFocus | undefined, name: string | undefined, isSpanish: boolean): string => {
  const hi = name
    ? isSpanish ? `¡Hola, ${name}! ` : `Hi ${name}! `
    : isSpanish ? '¡Hola! ' : 'Hi there! ';
  // Casy introduces itself warmly, then offers to help with the current tab.
  const intro = isSpanish
    ? 'Soy Casy, y seré tu gestor de caso de IA. '
    : "I'm Casy, and I'll be your AI case manager. ";
  const byFocus: Record<AIFocus, { en: string; es: string }> = {
    housing: {
      en: 'I can help with shelters, housing programs, and applications. What do you need?',
      es: 'Puedo ayudarte con refugios, programas de vivienda y solicitudes. ¿Qué necesitas?',
    },
    healthcare: {
      en: 'I can help you find clinics, mental health support, and medication help. What do you need?',
      es: 'Puedo ayudarte a encontrar clínicas, apoyo de salud mental y ayuda con medicamentos. ¿Qué necesitas?',
    },
    employment: {
      en: 'I can help with jobs, training, resumes, and IDs. What do you need?',
      es: 'Puedo ayudarte con empleo, capacitación, currículums e identificaciones. ¿Qué necesitas?',
    },
  };
  const generic = {
    en: 'I can help with housing, healthcare, and jobs, in English or Spanish. What do you need today?',
    es: 'Puedo ayudarte con vivienda, salud y empleo, en inglés o español. ¿Qué necesitas hoy?',
  };
  const body = focus ? byFocus[focus] : generic;
  return hi + intro + (isSpanish ? body.es : body.en);
};

const suggestionsFor = (focus: AIFocus | undefined, isSpanish: boolean): string[] => {
  const map: Record<AIFocus, { en: string[]; es: string[] }> = {
    housing: {
      en: ['Find a shelter tonight', 'How do I apply for Section 8?', 'I might be evicted'],
      es: ['Encontrar refugio hoy', '¿Cómo solicito Sección 8?', 'Podrían desalojarme'],
    },
    healthcare: {
      en: ['Find a free clinic', 'I need mental health support', 'Help with my medications'],
      es: ['Encontrar clínica gratuita', 'Necesito apoyo de salud mental', 'Ayuda con mis medicamentos'],
    },
    employment: {
      en: ['Find jobs hiring now', 'Help with my resume', 'I need a government ID'],
      es: ['Empleos que contratan ahora', 'Ayuda con mi currículum', 'Necesito identificación'],
    },
  };
  const generic = {
    en: ['Find a shelter', 'Find a free clinic', 'Find jobs near me'],
    es: ['Encontrar refugio', 'Encontrar clínica gratuita', 'Empleos cerca de mí'],
  };
  const s = focus ? map[focus] : generic;
  return isSpanish ? s.es : s.en;
};

export const AIAssistant: React.FC<Props> = ({ focus }) => {
  const { i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const isSpanish = i18n.language === 'es';
  const profile = state.userProfile;

  const allowedCats = ['housing', 'employment', 'healthcare', 'documents', 'benefits', 'education', 'other'];

  // Let Casy add a task straight to the to-do list from chat.
  const addTaskFromCasy = (task: AddTaskInput) => {
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

  // Let Casy save a resource to the "For You" sections from chat.
  const saveResourceFromCasy = (r: SaveResourceInput) => {
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

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Identity of the current chat session, so the whole conversation saves as
  // one dated "Casy note" (reset when the chat is closed = a new note).
  const noteIdRef = useRef<string | null>(null);
  const noteCreatedRef = useRef<string>('');

  const hasCoords =
    !!profile?.location &&
    typeof profile.location.latitude === 'number' &&
    typeof profile.location.longitude === 'number' &&
    (profile.location.latitude !== 0 || profile.location.longitude !== 0);

  const context: UserContext = {
    name: profile?.name,
    city: profile?.location?.city,
    state: profile?.location?.state,
    language: isSpanish ? 'es' : 'en',
    needs: profile?.selectedCategories,
    ageGroup: profile?.ageGroup,
    isMinor: profile?.ageGroup === 'under18',
    // Give Casy coordinates so it can run live searches, and the full answers.
    location: hasCoords ? profile?.location : undefined,
    answersSummary: buildAnswersSummary(profile?.answers, isSpanish ? 'es' : 'en'),
  };

  const greeting = greetingFor(focus, profile?.name, isSpanish);
  const suggestions = suggestionsFor(focus, isSpanish);

  useEffect(() => {
    if (open) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading, open]);

  // Save the whole conversation as a dated Casy note for this category so the
  // person can reopen "the things discussed" later.
  const saveNote = (fullMessages: AIMessage[]) => {
    if (!noteIdRef.current) return;
    const firstUser = fullMessages.find((m) => m.role === 'user')?.content || '';
    const title = firstUser
      ? firstUser.length > 64 ? `${firstUser.slice(0, 64)}…` : firstUser
      : isSpanish ? 'Conversación con Casy' : 'Chat with Casy';
    dispatch({
      type: 'SAVE_CASY_NOTE',
      payload: {
        id: noteIdRef.current,
        category: focus || 'general',
        createdAt: noteCreatedRef.current,
        updatedAt: new Date().toISOString(),
        title,
        messages: fullMessages.map((m) => ({ role: m.role, content: m.content })),
      },
    });
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const history = messages;
    // Start a new note session on the first message of this chat.
    if (!noteIdRef.current) {
      noteIdRef.current = `note_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      noteCreatedRef.current = new Date().toISOString();
    }
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    let reply: string;
    try {
      reply = await sendMessageToAI(msg, history, context, addTaskFromCasy, saveResourceFromCasy);
    } catch {
      reply = isSpanish
        ? 'Lo siento, tuve un problema. Intenta de nuevo o llama al 211.'
        : 'Sorry, I had a problem. Please try again or call 211.';
    }
    setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    setLoading(false);
    // Persist the running conversation (upsert by session id).
    saveNote([...history, { role: 'user', content: msg }, { role: 'model', content: reply }]);
  };

  // Close the chat and end the note session, so reopening starts a fresh note.
  const closeChat = () => {
    setOpen(false);
    noteIdRef.current = null;
    noteCreatedRef.current = '';
    setMessages([]);
  };

  // Quick exit: instantly leave to a neutral site so no one nearby sees the
  // app. Critical for anyone in an unsafe situation.
  const quickExit = () => {
    setOpen(false);
    noteIdRef.current = null;
    Linking.openURL('https://weather.com').catch(() => {
      Linking.openURL('https://google.com').catch(() => {});
    });
  };

  return (
    <>
      {/* Quick Exit / panic button */}
      <TouchableOpacity
        style={styles.exitFab}
        activeOpacity={0.85}
        onPress={quickExit}
        accessibilityLabel={isSpanish ? 'Salida rápida' : 'Quick exit'}
      >
        <Text style={styles.exitFabText}>✕ {isSpanish ? 'Salir' : 'Exit'}</Text>
      </TouchableOpacity>

      {/* Floating button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        accessibilityLabel={isSpanish ? 'Abrir a Casy' : 'Open Casy'}
      >
        <CasyAvatar size={38} bg="transparent" face="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={closeChat}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <CasyAvatar size={44} />
                <View>
                  <Text style={styles.headerTitle}>Casy</Text>
                  <Text style={styles.headerSub}>
                    {isSpanish ? 'Tu gestor de caso de IA · 24/7' : 'Your AI case manager · 24/7'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeChat} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
            >
              {/* Greeting bubble */}
              <View style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.aiText}>{greeting}</Text>
              </View>

              {/* Quick suggestions (before first message) */}
              {messages.length === 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map((s) => (
                    <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => send(s)}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

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
            </ScrollView>

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={isSpanish ? 'Pregúntame lo que sea...' : 'Ask me anything...'}
                placeholderTextColor="#94A3B8"
                onSubmitEditing={() => send(input)}
                returnKeyType="send"
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  fabIcon: { fontSize: 28 },
  exitFab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
    opacity: 0.85,
  },
  exitFabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    overflow: 'hidden',
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { fontSize: 30 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: '#0F172A', fontWeight: '600' },
  messages: { flex: 1 },
  messagesContent: { padding: 18, paddingBottom: 24 },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0D9488' },
  aiText: { fontSize: 15.5, color: '#0F172A', lineHeight: 22 },
  userText: { fontSize: 15.5, color: '#FFFFFF', lineHeight: 22 },
  loadingBubble: { paddingVertical: 16 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionText: { fontSize: 14, color: '#0D9488', fontWeight: '600' },
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
