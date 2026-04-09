import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp } from '@react-navigation/native';
import { UserProfile } from '../types';
import { useApp } from '../context/AppContext';
import {
  getEmploymentRecommendations,
  getHealthcareRecommendations,
  getHousingRecommendations,
  PersonalizedRecommendation,
} from '../utils/profileInsights';

type Category = 'healthcare' | 'housing' | 'employment';

interface PersonalizedRecommendationsProps {
  profile: UserProfile | null;
  category: Category;
  navigation?: NavigationProp<any>;
}

/**
 * Personalized Recommendations
 *
 * Replaces the generic "Based on your intake" chip summary with specific,
 * actionable cards tied to what the user actually said during intake.
 *
 *  - On HealthScreen, recommends Medicaid, community mental health,
 *    dental clinics, vision programs, CHIP, prescription savings, etc.
 *    based on the user's healthcare answers.
 *  - On HousingScreen, recommends Covenant House, Family Promise, HUD-VASH,
 *    pet-friendly shelters, second-chance housing, etc. based on intake.
 *  - On JobsScreen, recommends specific job types (food service, warehouse,
 *    healthcare entry-level, etc.) matching what the user said they want,
 *    plus ID help, second-chance employers, resume help, training programs.
 */
export const PersonalizedRecommendations: React.FC<
  PersonalizedRecommendationsProps
> = ({ profile, category, navigation }) => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const { state, dispatch } = useApp();
  const existingTodos = state.userProfile?.todos || [];

  const recs = useMemo<PersonalizedRecommendation[]>(() => {
    if (!profile) return [];
    switch (category) {
      case 'healthcare':
        return getHealthcareRecommendations(profile);
      case 'housing':
        return getHousingRecommendations(profile);
      case 'employment':
        return getEmploymentRecommendations(profile);
    }
  }, [profile?.answers, profile?.ageGroup, category]);

  if (recs.length === 0) return null;

  const handleAction = (rec: PersonalizedRecommendation) => {
    switch (rec.actionType) {
      case 'call':
        Linking.openURL(`tel:${rec.actionPayload.replace(/[^0-9]/g, '')}`);
        break;
      case 'navigate':
        navigation?.navigate(rec.actionPayload);
        break;
      case 'url':
        Linking.openURL(rec.actionPayload);
        break;
    }
  };

  // A recommendation counts as "already in plan" if a pending to-do
  // has the same title. (Titles come from the rec itself, not user
  // input, so exact-match is reliable.)
  const isInPlan = (rec: PersonalizedRecommendation): boolean => {
    const title = isSpanish ? rec.titleEs : rec.title;
    return existingTodos.some(
      (t) => !t.completed && t.title === title,
    );
  };

  const addToPlan = (rec: PersonalizedRecommendation) => {
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
        category,
        resourcePhone,
        resourceUrl,
      } as any, // priority/createdBy are optional-on-add per existing pattern
    });
    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish
        ? 'Este paso se agregó a tu lista de tareas.'
        : 'This step was added to your to-do list.',
      [{ text: 'OK' }],
    );
  };

  const addAllToPlan = () => {
    const toAdd = recs.filter((r) => !isInPlan(r));
    if (toAdd.length === 0) {
      Alert.alert(
        isSpanish ? 'Ya están en tu lista' : 'Already in your list',
        isSpanish
          ? 'Todos estos pasos ya están en tu lista de tareas.'
          : 'All of these steps are already in your to-do list.',
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
          category,
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
      [{ text: 'OK' }],
    );
  };

  const actionIcon = (rec: PersonalizedRecommendation): string => {
    if (rec.actionType === 'call') return '📞 ';
    if (rec.actionType === 'navigate') return '→ ';
    return '🔗 ';
  };

  const color = {
    healthcare: { bg: '#EAF2EE', border: '#B8D4C9', title: '#2F5548', reason: '#456B5E', actionBg: '#D4E5DD', actionText: '#2F5548' },
    housing: { bg: '#F8EBE2', border: '#E8CAB8', title: '#6B3E2A', reason: '#8B4F35', actionBg: '#F1DDD0', actionText: '#6B3E2A' },
    employment: { bg: '#F6EEDD', border: '#E4D1A2', title: '#5E4620', reason: '#7A5C28', actionBg: '#EFE3C8', actionText: '#5E4620' },
  }[category];

  return (
    <View style={[styles.container, { backgroundColor: color.bg, borderColor: color.border }]}>
      <TouchableOpacity
        style={[styles.addAllButton, { backgroundColor: color.actionBg }]}
        onPress={addAllToPlan}
        activeOpacity={0.7}
      >
        <Text style={[styles.addAllButtonText, { color: color.actionText }]}>
          ＋ {isSpanish ? 'Agregar todo a mi plan' : 'Add all to my plan'}
        </Text>
      </TouchableOpacity>

      {recs.map((rec, idx) => {
        const inPlan = isInPlan(rec);
        return (
          <View key={rec.id} style={styles.card}>
            <View style={[styles.stepBadge, { backgroundColor: color.actionBg }]}>
              <Text style={[styles.stepBadgeText, { color: color.actionText }]}>
                {idx + 1}
              </Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardIcon}>{rec.icon}</Text>
                <Text style={styles.cardTitle}>
                  {isSpanish ? rec.titleEs : rec.title}
                </Text>
              </View>
              <Text style={styles.cardDescription}>
                {isSpanish ? rec.descriptionEs : rec.description}
              </Text>
              <Text style={[styles.cardReason, { color: color.reason }]}>
                {isSpanish ? `↳ ${rec.reasonEs}` : `↳ ${rec.reason}`}
              </Text>
              <View style={styles.cardButtonRow}>
                <TouchableOpacity
                  style={[styles.cardAction, { backgroundColor: color.actionBg }]}
                  onPress={() => handleAction(rec)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cardActionText, { color: color.actionText }]}>
                    {actionIcon(rec)}
                    {isSpanish ? rec.actionLabelEs : rec.actionLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, inPlan && styles.addButtonDone]}
                  onPress={() => !inPlan && addToPlan(rec)}
                  activeOpacity={inPlan ? 1 : 0.7}
                  disabled={inPlan}
                >
                  <Text style={[styles.addButtonText, inPlan && styles.addButtonTextDone]}>
                    {inPlan
                      ? isSpanish
                        ? '✓ En mi plan'
                        : '✓ In my plan'
                      : isSpanish
                      ? '＋ Mi plan'
                      : '＋ My plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    fontSize: 15,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardReason: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cardAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  addButtonDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  addButtonTextDone: {
    color: '#166534',
  },
  addAllButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  addAllButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
