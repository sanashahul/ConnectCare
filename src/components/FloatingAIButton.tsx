import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProp } from '@react-navigation/native';

interface FloatingAIButtonProps {
  navigation: NavigationProp<any>;
  /** Optional offset from the bottom of the screen (default 24) */
  bottom?: number;
}

/**
 * Floating AI Case Manager button.
 *
 * Persistent across every category screen — taps navigate back to the
 * Dashboard with a route param ({ openAI: true }) that DashboardScreen
 * detects on focus and auto-opens the AI modal.
 *
 * This makes the AI the single most-discoverable feature in the app,
 * letting users in crisis ask open-ended questions without first knowing
 * whether their need is "health" or "housing" or "jobs".
 */
export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
  navigation,
  bottom = 24,
}) => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom }]}
      onPress={() => navigation.navigate('Dashboard', { openAI: true })}
      activeOpacity={0.85}
    >
      <View style={styles.fabInner}>
        <Text style={styles.fabIcon}>🤖</Text>
        <Text style={styles.fabLabel}>
          {isSpanish ? 'Ask AI' : 'Ask AI'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#2563EB',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
