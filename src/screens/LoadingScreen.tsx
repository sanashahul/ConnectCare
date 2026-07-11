/**
 * LoadingScreen - a warm, branded screen shown while the app is getting ready
 * (hydrating saved data), instead of a blank flash.
 */
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CasyAvatar } from '../components';

export const LoadingScreen: React.FC = () => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🤝</Text>
        </View>
        <Text style={styles.title}>ConnectCare</Text>
        <Text style={styles.subtitle}>
          {isSpanish ? 'Conectándote con la ayuda que necesitas' : 'Connecting you to the care you need'}
        </Text>

        <View style={styles.casyRow}>
          <CasyAvatar size={28} />
          <Text style={styles.casyText}>
            {isSpanish ? 'Casy está preparando todo...' : 'Casy is getting things ready...'}
          </Text>
        </View>

        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 22 }} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFEFE' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 36,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#99F6E4',
  },
  logoIcon: { fontSize: 52 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  casyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 36,
  },
  casyText: { fontSize: 15, color: '#0D9488', fontWeight: '700' },
});
