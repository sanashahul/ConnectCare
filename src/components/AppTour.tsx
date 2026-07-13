/**
 * AppTour - a short, first-run walkthrough that shows people where everything
 * is before the app opens up. Swipeable slides, dots, Skip, and Get Started.
 * Shown once (gated by userProfile.hasSeenTour).
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { CasyAvatar } from './CasyAvatar';

interface Slide {
  icon: string;
  title: { en: string; es: string };
  body: { en: string; es: string };
  bg: string;
}

const SLIDES: Slide[] = [
  {
    icon: '', // uses Casy avatar
    title: { en: 'Meet Casy', es: 'Conoce a Casy' },
    body: {
      en: "Casy is your AI case manager. Tap the Casy button anytime to ask for help with housing, health, or jobs — Casy finds real places near you and remembers your situation.",
      es: 'Casy es tu gestor de caso con IA. Toca el botón de Casy cuando quieras para pedir ayuda con vivienda, salud o empleo — Casy encuentra lugares reales cerca de ti y recuerda tu situación.',
    },
    bg: '#F0FDFA',
  },
  {
    icon: '📋',
    title: { en: 'Your plan', es: 'Tu plan' },
    body: {
      en: 'Casy builds a personalized plan from your answers. Work through it one step at a time and check off what you finish — your progress is saved.',
      es: 'Casy crea un plan personalizado según tus respuestas. Avanza paso a paso y marca lo que completes — tu progreso se guarda.',
    },
    bg: '#F5F3FF',
  },
  {
    icon: '🏥',
    title: { en: 'Your tabs', es: 'Tus secciones' },
    body: {
      en: 'Health, Housing, and Jobs each have Casy’s recommendations for you, your to-dos, and quick help — all specific to your situation.',
      es: 'Salud, Vivienda y Empleo tienen las recomendaciones de Casy para ti, tus tareas y ayuda rápida — todo específico a tu situación.',
    },
    bg: '#FFF7ED',
  },
  {
    icon: '🚨',
    title: { en: 'Need help now', es: 'Ayuda ahora' },
    body: {
      en: 'In a crisis or urgent moment, “Need Help Now” asks a couple of quick questions and points you to the nearest specific place for your exact situation.',
      es: 'En una crisis o momento urgente, "Necesito Ayuda Ahora" hace un par de preguntas y te lleva al lugar más cercano para tu situación exacta.',
    },
    bg: '#FEF2F2',
  },
  {
    icon: '📝',
    title: { en: 'Notes & saved places', es: 'Notas y lugares guardados' },
    body: {
      en: 'Every conversation with Casy is saved by date, and any place Casy finds is saved to the right tab — so you can always go back and find it.',
      es: 'Cada conversación con Casy se guarda por fecha, y cada lugar que Casy encuentra se guarda en la pestaña correcta — para que siempre lo encuentres.',
    },
    bg: '#EEF2FF',
  },
  {
    icon: '✅',
    title: { en: "You're all set", es: 'Todo listo' },
    body: {
      en: 'That’s the tour! Tap anything to explore, and Casy is here 24/7 whenever you need a hand.',
      es: '¡Ese es el recorrido! Toca lo que quieras para explorar, y Casy está aquí 24/7 cuando necesites ayuda.',
    },
    bg: '#F0FDF4',
  },
];

interface Props {
  visible: boolean;
  isSpanish: boolean;
  onDone: () => void;
}

const { width } = Dimensions.get('window');

export const AppTour: React.FC<Props> = ({ visible, isSpanish, onDone }) => {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDone}>
      <View style={styles.container}>
        {/* Skip */}
        <View style={styles.topBar}>
          {!isLast ? (
            <TouchableOpacity onPress={onDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.skip}>{isSpanish ? 'Saltar' : 'Skip'}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.flex}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
                {i === 0 ? (
                  <CasyAvatar size={92} />
                ) : (
                  <Text style={styles.icon}>{s.icon}</Text>
                )}
              </View>
              <Text style={styles.title}>{isSpanish ? s.title.es : s.title.en}</Text>
              <Text style={styles.body}>{isSpanish ? s.body.es : s.body.en}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => (isLast ? onDone() : goTo(index + 1))}
          >
            <Text style={styles.primaryText}>
              {isLast
                ? isSpanish ? '¡Empezar!' : 'Get started'
                : isSpanish ? 'Siguiente' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  topBar: {
    height: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
  },
  skip: { fontSize: 16, color: '#64748B', fontWeight: '700' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: { fontSize: 78 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 25,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: { backgroundColor: '#0D9488', width: 22 },
  actions: { paddingHorizontal: 24, paddingBottom: 40 },
  primaryBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
