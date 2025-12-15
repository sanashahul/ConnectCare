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
  ImmigrationStatus: undefined;
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
    navigation.navigate('ImmigrationStatus');
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
          <ProgressBar current={1} total={4} label="1 / 4" />
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  form: {
    marginTop: 16,
  },
  disabledInput: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  anonymousText: {
    fontSize: 16,
    color: '#4B5563',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
