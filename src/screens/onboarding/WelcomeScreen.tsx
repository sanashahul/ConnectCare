import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components';
import { useApp } from '../../context/AppContext';
import { changeLanguage, loadStoredLanguage } from '../../i18n';

type RootStackParamList = {
  Welcome: undefined;
  NameInput: undefined;
  CaseWorkerEntry: undefined;
};

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { dispatch } = useApp();
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>('en');

  useEffect(() => {
    loadStoredLanguage().then((lang) => {
      setSelectedLanguage(lang as 'en' | 'es');
    });
  }, []);

  const handleLanguageChange = async (lang: 'en' | 'es') => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
  };

  const handleNeedServices = () => {
    dispatch({ type: 'SET_USER_ROLE', payload: 'individual' });
    navigation.navigate('NameInput');
  };

  const handleCaseWorker = () => {
    dispatch({ type: 'SET_USER_ROLE', payload: 'caseworker' });
    navigation.navigate('CaseWorkerEntry');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Language Selector */}
      <View style={styles.languageSelector}>
        <Text style={styles.languageLabel}>{t('welcome.selectLanguage')}</Text>
        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              selectedLanguage === 'en' && styles.languageButtonActive,
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text
              style={[
                styles.languageButtonText,
                selectedLanguage === 'en' && styles.languageButtonTextActive,
              ]}
            >
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageButton,
              selectedLanguage === 'es' && styles.languageButtonActive,
            ]}
            onPress={() => handleLanguageChange('es')}
          >
            <Text
              style={[
                styles.languageButtonText,
                selectedLanguage === 'es' && styles.languageButtonTextActive,
              ]}
            >
              Espanol
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logo and Title */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🤝</Text>
        </View>
        <Text style={styles.title}>{t('welcome.title')}</Text>
        <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={handleNeedServices}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>🙋</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>{t('welcome.needServices')}</Text>
            <Text style={styles.actionDescription}>{t('welcome.needServicesDesc')}</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleCaseWorker}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>👥</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>{t('welcome.caseworker')}</Text>
            <Text style={styles.actionDescription}>{t('welcome.caseworkerDesc')}</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ConnectCare</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  languageSelector: {
    padding: 20,
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  languageButtons: {
    flexDirection: 'row',
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  languageButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  languageButtonActive: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  languageButtonText: {
    fontSize: 14,
    color: '#0D9488',
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 3,
    borderColor: '#99F6E4',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  actionIcon: {
    fontSize: 32,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  actionArrow: {
    fontSize: 28,
    color: '#0D9488',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
