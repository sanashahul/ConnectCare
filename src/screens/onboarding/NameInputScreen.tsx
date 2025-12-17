import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';

type RootStackParamList = {
  NameInput: undefined;
  AgeInput: undefined;
  Welcome: undefined;
};

type NameInputScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NameInput'>;
};

export const NameInputScreen: React.FC<NameInputScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleNext = () => {
    const displayName = isAnonymous ? 'Friend' : name.trim() || 'Friend';
    dispatch({ type: 'SET_USER_NAME', payload: displayName });
    dispatch({ type: 'SET_ONBOARDING_STEP', payload: 1 });
    navigation.navigate('AgeInput');
  };

  const handleAnonymous = () => {
    setIsAnonymous(!isAnonymous);
    if (!isAnonymous) {
      setName('');
    }
  };

  const canProceed = isAnonymous || name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress */}
        <View style={styles.progressContainer}>
          <ProgressBar current={1} total={5} label="1 / 5" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{t('onboarding.nameTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.nameSubtitle')}</Text>

          <View style={styles.form}>
            <Input
              placeholder={t('onboarding.namePlaceholder')}
              value={name}
              onChangeText={setName}
              editable={!isAnonymous}
              autoFocus
              autoCapitalize="words"
              style={isAnonymous ? styles.disabledInput : undefined}
            />

            <TouchableOpacity
              style={styles.anonymousOption}
              onPress={handleAnonymous}
            >
              <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                {isAnonymous && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.anonymousText}>{t('onboarding.preferAnonymous')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <Button
            title={t('onboarding.back')}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <Button
            title={t('onboarding.next')}
            onPress={handleNext}
            disabled={!canProceed}
            style={styles.nextButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#64748B',
    marginBottom: 36,
    lineHeight: 26,
  },
  form: {
    marginTop: 8,
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  anonymousText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 14,
    backgroundColor: '#FEFEFE',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
