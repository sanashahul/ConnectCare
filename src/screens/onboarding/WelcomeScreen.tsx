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
    backgroundColor: '#F9FAFB',
  },
  languageSelector: {
    padding: 16,
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  languageButtons: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  languageButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  languageButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  languageButtonTextActive: {
    color: '#1F2937',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionArrow: {
    fontSize: 24,
    color: '#2563EB',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
