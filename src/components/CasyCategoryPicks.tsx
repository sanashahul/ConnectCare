/**
 * CasyCategoryPicks - Casy's personalized recommendations for one tab
 * (housing / employment / healthcare), generated from the person's
 * questionnaire answers so each tab is specific to THEM. Replaces the old
 * static youth-resource lists. Fetches once, persists in the profile, and
 * offers a refresh. Youth-aware (recommends youth-specific orgs for minors).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  generateCategoryPicks,
  buildAnswersSummary,
  UserContext,
} from '../services/aiService';
import { CasyResources } from './CasyResources';
import { CasyAvatar } from './CasyAvatar';

interface Props {
  category: 'housing' | 'employment' | 'healthcare';
  isSpanish: boolean;
}

const HEADINGS: Record<string, { en: string; es: string }> = {
  housing: { en: "CASY'S HOUSING PICKS FOR YOU", es: 'RECOMENDACIONES DE VIVIENDA DE CASY' },
  employment: { en: "CASY'S JOB PICKS FOR YOU", es: 'RECOMENDACIONES DE EMPLEO DE CASY' },
  healthcare: { en: "CASY'S HEALTH PICKS FOR YOU", es: 'RECOMENDACIONES DE SALUD DE CASY' },
};

export const CasyCategoryPicks: React.FC<Props> = ({ category, isSpanish }) => {
  const { state, dispatch } = useApp();
  const profile = state.userProfile;
  const saved = profile?.categoryPicks?.[category];

  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const buildContext = (): UserContext => ({
    name: profile?.name,
    city: profile?.location?.city,
    state: profile?.location?.state,
    zip: profile?.location?.zipCode,
    language: isSpanish ? 'es' : 'en',
    needs: profile?.selectedCategories,
    ageGroup: profile?.ageGroup,
    isMinor: profile?.ageGroup === 'under18',
    answersSummary: buildAnswersSummary(profile?.answers, isSpanish ? 'es' : 'en'),
  });

  const fetchPicks = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const picks = await generateCategoryPicks(buildContext(), category);
      if (picks && picks.length) {
        dispatch({ type: 'SET_CATEGORY_PICKS', payload: { category, items: picks } });
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Generate the first time this tab is opened (if we don't have picks yet).
  useEffect(() => {
    if (!saved && !loading && !failed) {
      fetchPicks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading = HEADINGS[category]?.[isSpanish ? 'es' : 'en'];

  if (loading && !saved) {
    return (
      <View style={styles.loadingWrap}>
        <CasyAvatar size={26} />
        <ActivityIndicator color="#0D9488" style={{ marginVertical: 8 }} />
        <Text style={styles.loadingText}>
          {isSpanish
            ? 'Casy está buscando opciones para ti...'
            : 'Casy is finding options for you...'}
        </Text>
      </View>
    );
  }

  if (failed && !saved) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>
          {isSpanish
            ? 'No pude cargar tus recomendaciones ahora.'
            : "Couldn't load your recommendations right now."}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchPicks}>
          <Text style={styles.retryText}>{isSpanish ? 'Reintentar' : 'Try again'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!saved || saved.length === 0) return null;

  return (
    <View>
      <CasyResources resources={saved} isSpanish={isSpanish} label={heading} />
      <TouchableOpacity style={styles.refreshBtn} onPress={fetchPicks} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0D9488" size="small" />
        ) : (
          <Text style={styles.refreshText}>
            {isSpanish ? '↻ Actualizar recomendaciones' : '↻ Refresh recommendations'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 13.5,
    color: '#0F766E',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: '#0D9488',
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  refreshBtn: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 18,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  refreshText: { color: '#0D9488', fontWeight: '800', fontSize: 13 },
});
