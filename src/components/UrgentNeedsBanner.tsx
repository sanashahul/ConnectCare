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
import { getUrgentNeeds, UrgentNeed } from '../utils/profileInsights';

interface UrgentNeedsBannerProps {
  profile: UserProfile | null;
  /**
   * If provided, only urgent needs for this category (plus 'general'
   * items like youth crisis hotlines) are shown.
   */
  category?: 'healthcare' | 'housing' | 'employment';
  /** Caps how many cards are rendered. Default: 4. */
  maxItems?: number;
  /** Passed in so the banner can route 'navigate' actions to other screens. */
  navigation?: NavigationProp<any>;
}

/**
 * Urgent Needs Banner
 *
 * Reads intake-form answers + age group from the user profile and renders
 * a set of urgent action cards (call, navigate, or text) that directly
 * reflect what the user said during intake.
 *
 * Used on:
 *  - DashboardScreen (shows all urgent needs)
 *  - HealthScreen   (category = 'healthcare')
 *  - HousingScreen  (category = 'housing')
 *  - JobsScreen     (category = 'employment')
 *
 * Youth users (under 18) automatically get extra crisis resources
 * (Runaway Safeline, Childhelp, Crisis Text Line, Trevor Project)
 * in addition to any needs flagged by their intake answers.
 */
export const UrgentNeedsBanner: React.FC<UrgentNeedsBannerProps> = ({
  profile,
  category,
  maxItems = 4,
  navigation,
}) => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  const urgentNeeds = useMemo(
    () => getUrgentNeeds(profile, category).slice(0, maxItems),
    [profile?.answers, profile?.ageGroup, category, maxItems],
  );

  if (urgentNeeds.length === 0) return null;

  const handleAction = (need: UrgentNeed) => {
    switch (need.actionType) {
      case 'call':
        Linking.openURL(`tel:${need.actionPayload.replace(/[^0-9]/g, '')}`);
        break;
      case 'navigate':
        navigation?.navigate(need.actionPayload);
        break;
      case 'url':
        Linking.openURL(need.actionPayload);
        break;
    }
  };

  const handleExplore = (need: UrgentNeed) => {
    if (need.exploreScreen && navigation) {
      navigation.navigate(need.exploreScreen);
    }
  };

  const actionPrefix = (need: UrgentNeed): string => {
    if (need.actionType === 'call') return '📞 ';
    if (need.actionType === 'navigate') return '→ ';
    if (need.actionPayload.startsWith('sms:')) return '💬 ';
    return '🔗 ';
  };

  const exploreLabel = (screen: 'Health' | 'Housing' | 'Jobs'): string => {
    if (isSpanish) {
      if (screen === 'Health') return 'Ver clínicas en la app';
      if (screen === 'Housing') return 'Ver refugios en la app';
      return 'Ver empleos en la app';
    }
    if (screen === 'Health') return 'See clinics in the app';
    if (screen === 'Housing') return 'See shelters in the app';
    return 'See jobs in the app';
  };

  return (
    <View style={styles.banner}>
      <View style={styles.bannerHeader}>
        <Text style={styles.bannerEmoji}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {isSpanish ? 'Basado en lo que nos dijiste' : 'Based on what you told us'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {isSpanish
              ? 'Estas acciones son para ti ahora mismo'
              : 'These actions are for you right now'}
          </Text>
        </View>
      </View>

      {urgentNeeds.map((need) => (
        <View key={need.id} style={styles.card}>
          <Text style={styles.cardIcon}>{need.icon}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {isSpanish ? need.titleEs : need.title}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isSpanish ? need.subtitleEs : need.subtitle}
            </Text>
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => handleAction(need)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardActionText}>
                  {actionPrefix(need)}
                  {isSpanish ? need.actionLabelEs : need.actionLabel}
                </Text>
              </TouchableOpacity>
              {need.exploreScreen && navigation && (
                <TouchableOpacity
                  style={styles.cardExplore}
                  onPress={() => handleExplore(need)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardExploreText}>
                    {exploreLabel(need.exploreScreen)} →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#991B1B',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cardAction: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  cardExplore: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cardExploreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D',
    textDecorationLine: 'underline',
  },
});
