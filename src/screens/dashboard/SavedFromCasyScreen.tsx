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

  // Categories the person is working on get AI-generated picks; fall back to
  // all three if none were selected.
  const selected = (profile?.selectedCategories || []).filter((c) => ORDER.includes(c));
  const pickCats = selected.length ? ORDER.filter((c) => selected.includes(c)) : ORDER;

  // All of Casy's resources (plan + chat-saved) so nothing gets orphaned.
  const allResources = [
    ...(profile?.recommendations?.recommendations || []),
    ...(profile?.savedResources || []),
  ];
  const resourcesFor = (cat: ServiceCategory) => allResources.filter((r) => r.category === cat);

  // Show a main section when it has picks to generate OR any saved resources.
  const mainCats = ORDER.filter((c) => pickCats.includes(c) || resourcesFor(c).length > 0);

  // Everything that isn't housing/health/jobs (documents, benefits, education,
  // other, ...) collects in one "Other" section.
  const otherResources = allResources.filter(
    (r) => !ORDER.includes(r.category as ServiceCategory)
  );

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

        {mainCats.map((cat) => {
          const meta = CATEGORY_META[cat];
          return (
            <View key={cat} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{meta.icon}</Text>
                <Text style={styles.sectionTitle}>{isSpanish ? meta.es : meta.en}</Text>
              </View>

              {/* Casy's per-category picks (generated from their answers) */}
              {pickCats.includes(cat) && (
                <CasyCategoryPicks category={cat} isSpanish={isSpanish} />
              )}

              {/* Plan + chat-saved resources for this category */}
              <CasyResources resources={resourcesFor(cat)} isSpanish={isSpanish} />
            </View>
          );
        })}

        {/* Other: anything not housing/health/jobs */}
        {otherResources.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📌</Text>
              <Text style={styles.sectionTitle}>{isSpanish ? 'Otros' : 'Other'}</Text>
            </View>
            <Text style={styles.sectionHint}>
              {isSpanish
                ? 'Documentos, beneficios y otros recursos que Casy guardó.'
                : 'Documents, benefits, and other resources Casy saved.'}
            </Text>
            <CasyResources resources={otherResources} isSpanish={isSpanish} />
          </View>
        )}
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
  sectionHint: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 12, marginTop: -4 },
});
