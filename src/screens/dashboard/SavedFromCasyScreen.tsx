/**
 * SavedFromCasyScreen - one home for everything Casy has recommended or saved
 * for this person, grouped by Housing / Health / Jobs. Casy's per-category
 * picks (generated from the questionnaire) plus resources saved from chat and
 * the personalized plan all live here, so the category tabs stay focused on
 * Need Help Now and to-dos.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { CasyAvatar } from '../../components';
import { CasyResources } from '../../components/CasyResources';
import { CasyCategoryPicks } from '../../components/CasyCategoryPicks';
import { ServiceCategory } from '../../types';

type Props = { navigation: any };

const CATEGORY_META: Record<
  ServiceCategory,
  { en: string; es: string; icon: string }
> = {
  housing: { en: 'Housing', es: 'Vivienda', icon: '🏠' },
  healthcare: { en: 'Health', es: 'Salud', icon: '🏥' },
  employment: { en: 'Jobs', es: 'Empleo', icon: '💼' },
};

const ORDER: ServiceCategory[] = ['housing', 'healthcare', 'employment'];

export const SavedFromCasyScreen: React.FC<Props> = ({ navigation }) => {
  const { i18n } = useTranslation();
  const { state } = useApp();
  const isSpanish = i18n.language === 'es';
  const profile = state.userProfile;

  // Show a section for each category the person is working on; fall back to all
  // three if none were selected.
  const selected = (profile?.selectedCategories || []).filter((c) => ORDER.includes(c));
  const cats = selected.length ? ORDER.filter((c) => selected.includes(c)) : ORDER;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CasyAvatar size={26} />
          <Text style={styles.headerTitle}>
            {isSpanish ? 'Guardado de Casy' : 'Saved from Casy'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.intro}>
          {isSpanish
            ? 'Todo lo que Casy ha recomendado y guardado para ti, en un solo lugar.'
            : "Everything Casy has recommended and saved for you, all in one place."}
        </Text>

        {cats.map((cat) => {
          const meta = CATEGORY_META[cat];
          const saved = [
            ...(profile?.recommendations?.recommendations || []).filter((r) => r.category === cat),
            ...(profile?.savedResources || []).filter((r) => r.category === cat),
          ];
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{meta.icon}</Text>
                <Text style={styles.sectionTitle}>{isSpanish ? meta.es : meta.en}</Text>
              </View>

              {/* Casy's per-category picks (generated from their answers) */}
              <CasyCategoryPicks category={cat} isSpanish={isSpanish} />

              {/* Plan + chat-saved resources for this category */}
              <CasyResources resources={saved} isSpanish={isSpanish} />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerBackText: { fontSize: 26, color: '#0F172A' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14.5, color: '#64748B', lineHeight: 21, marginBottom: 22 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
});
