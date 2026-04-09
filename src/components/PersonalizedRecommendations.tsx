import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp } from '@react-navigation/native';
import { UserProfile } from '../types';
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

  const actionIcon = (rec: PersonalizedRecommendation): string => {
    if (rec.actionType === 'call') return '📞 ';
    if (rec.actionType === 'navigate') return '→ ';
    return '🔗 ';
  };

  const color = {
    healthcare: { bg: '#F0FDFA', border: '#99F6E4', title: '#115E59', reason: '#0F766E', actionBg: '#CCFBF1', actionText: '#115E59' },
    housing: { bg: '#F5F3FF', border: '#DDD6FE', title: '#5B21B6', reason: '#6D28D9', actionBg: '#EDE9FE', actionText: '#5B21B6' },
    employment: { bg: '#FFF7ED', border: '#FED7AA', title: '#9A3412', reason: '#C2410C', actionBg: '#FFEDD5', actionText: '#9A3412' },
  }[category];

  return (
    <View style={[styles.container, { backgroundColor: color.bg, borderColor: color.border }]}>
      {recs.map((rec, idx) => (
        <TouchableOpacity
          key={rec.id}
          style={styles.card}
          onPress={() => handleAction(rec)}
          activeOpacity={0.7}
        >
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
            <View style={[styles.cardAction, { backgroundColor: color.actionBg }]}>
              <Text style={[styles.cardActionText, { color: color.actionText }]}>
                {actionIcon(rec)}
                {isSpanish ? rec.actionLabelEs : rec.actionLabel}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
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
  cardAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
