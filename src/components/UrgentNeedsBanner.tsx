import React, { useMemo, useState } from 'react';
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
  /**
   * If true, the banner starts collapsed (header only, tap to expand).
   * Useful on busy screens like the Dashboard where we want the banner
   * present but unobtrusive.
   */
  defaultCollapsed?: boolean;
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
  defaultCollapsed = false,
}) => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

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
      <TouchableOpacity
        style={styles.bannerHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.bannerEmoji}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {isSpanish ? 'Basado en lo que nos dijiste' : 'Based on what you told us'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {isExpanded
              ? isSpanish
                ? 'Estas acciones son para ti ahora mismo'
                : 'These actions are for you right now'
              : isSpanish
              ? `${urgentNeeds.length} ${urgentNeeds.length === 1 ? 'acción' : 'acciones'} — toca para ver`
              : `${urgentNeeds.length} ${urgentNeeds.length === 1 ? 'action' : 'actions'} — tap to view`}
          </Text>
        </View>
        <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {isExpanded && (() => {
        // Group needs by category so the banner reads as
        // Health / Housing / Jobs / General sections instead of one
        // flat list of mixed priorities.
        const groups: Record<string, UrgentNeed[]> = {};
        urgentNeeds.forEach((n) => {
          if (!groups[n.category]) groups[n.category] = [];
          groups[n.category].push(n);
        });
        const groupOrder: Array<UrgentNeed['category']> = [
          'healthcare',
          'housing',
          'employment',
          'general',
        ];
        const groupMeta: Record<
          UrgentNeed['category'],
          { label: string; labelEs: string; icon: string }
        > = {
          healthcare: { label: 'Health', labelEs: 'Salud', icon: '🏥' },
          housing: { label: 'Housing', labelEs: 'Vivienda', icon: '🏠' },
          employment: { label: 'Employment', labelEs: 'Empleo', icon: '💼' },
          general: { label: 'Youth & crisis', labelEs: 'Juventud y crisis', icon: '💚' },
        };

        return groupOrder.map((cat) => {
          const items = groups[cat];
          if (!items || items.length === 0) return null;
          const meta = groupMeta[cat];
          return (
            <View key={cat}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupIcon}>{meta.icon}</Text>
                <Text style={styles.groupLabel}>
                  {isSpanish ? meta.labelEs : meta.label}
                </Text>
              </View>
              {items.map((need) => (
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
        });
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDF4E3',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E4BE76',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  chevron: {
    fontSize: 22,
    color: '#7A4E1F',
    fontWeight: '700',
    marginLeft: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 6,
    gap: 6,
  },
  groupIcon: {
    fontSize: 14,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A4E1F',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bannerEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7A4E1F',
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#92661F',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FBEAC6',
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
    backgroundColor: '#FBEAC6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A4E1F',
  },
  cardExplore: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cardExploreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B3A14',
    textDecorationLine: 'underline',
  },
});
