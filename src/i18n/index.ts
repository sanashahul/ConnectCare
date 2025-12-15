import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en';
import es from './es';

const LANGUAGE_KEY = '@connectcare_language';

export const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = async (lang: 'en' | 'es') => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export const loadStoredLanguage = async () => {
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang && (storedLang === 'en' || storedLang === 'es')) {
      await i18n.changeLanguage(storedLang);
      return storedLang;
    }
  } catch (error) {
    console.error('Error loading stored language:', error);
  }
  return 'en';
};

export default i18n;
