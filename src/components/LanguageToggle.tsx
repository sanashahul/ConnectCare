import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

/**
 * Small two-state chip — EN / ES — for switching the app language.
 * Renders inline in a header row. Taps swap the language and persist
 * it via AsyncStorage (handled by the i18n module).
 */
export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const current = i18n.language === 'es' ? 'es' : 'en';

  const toggle = () => {
    changeLanguage(current === 'en' ? 'es' : 'en');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggle}
      activeOpacity={0.7}
    >
      <View style={[styles.pill, current === 'en' && styles.pillActive]}>
        <Text style={[styles.label, current === 'en' && styles.labelActive]}>EN</Text>
      </View>
      <View style={[styles.pill, current === 'es' && styles.pillActive]}>
        <Text style={[styles.label, current === 'es' && styles.labelActive]}>ES</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 2,
    alignSelf: 'flex-start',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#0F172A',
  },
});
