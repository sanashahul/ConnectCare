/**
 * HomeLinkCard - a tappable row used on the Health/Housing/Jobs landing.
 * `variant="primary"` is a prominent banner (Need Help Now, My To-Dos);
 * `variant="secondary"` is a compact link (browse sections lower down).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  bg?: string;
}

export const HomeLinkCard: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  onPress,
  variant = 'primary',
  bg,
}) => {
  if (variant === 'secondary') {
    return (
      <TouchableOpacity style={styles.secondary} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.secondaryIcon}>{icon}</Text>
        <Text style={styles.secondaryTitle}>{title}</Text>
        <Text style={styles.secondaryArrow}>›</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.primary, bg ? { backgroundColor: bg } : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryIcon}>{icon}</Text>
      <View style={styles.primaryText}>
        <Text style={styles.primaryTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.primarySub}>{subtitle}</Text>}
      </View>
      <Text style={styles.primaryArrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  primaryIcon: { fontSize: 26, marginRight: 14 },
  primaryText: { flex: 1 },
  primaryTitle: { fontSize: 16.5, fontWeight: '800', color: '#0F172A' },
  primarySub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  primaryArrow: { fontSize: 22, color: '#94A3B8', fontWeight: '700' },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  secondaryIcon: { fontSize: 17, marginRight: 12 },
  secondaryTitle: { flex: 1, fontSize: 14.5, color: '#334155', fontWeight: '600' },
  secondaryArrow: { fontSize: 20, color: '#94A3B8', fontWeight: '700' },
});
