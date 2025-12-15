import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components';
import { useApp, generateShareCode } from '../../context/AppContext';
import { UserProfile, CaseWorkerProfile } from '../../types';

type RootStackParamList = {
  CaseWorkerEntry: undefined;
  CaseWorkerDashboard: undefined;
  Welcome: undefined;
};

type CaseWorkerEntryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CaseWorkerEntry'>;
};

// Simulated client data for demo purposes
const DEMO_CLIENTS: Record<string, UserProfile> = {
  'ABC-123-XYZ': {
    id: 'demo1',
    name: 'John D.',
    immigrationStatus: 'citizen',
    location: { latitude: 40.7128, longitude: -74.006, city: 'New York', state: 'NY' },
    selectedCategories: ['healthcare', 'housing'],
    answers: [
      { questionId: 'health_1', answer: 'no' },
      { questionId: 'health_5', answer: 'yes' },
      { questionId: 'housing_1', answer: 'shelter' },
      { questionId: 'housing_3', answer: 'yes' },
    ],
    shareCode: 'ABC-123-XYZ',
    todos: [
      {
        id: '1',
        title: 'Apply for Medicaid',
        priority: 'urgent',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Visit VA office for housing voucher',
        priority: 'normal',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  'DEF-456-UVW': {
    id: 'demo2',
    name: 'Maria S.',
    immigrationStatus: 'permanent_resident',
    location: { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', state: 'CA' },
    selectedCategories: ['employment', 'housing'],
    answers: [
      { questionId: 'employ_1', answer: 'unemployed' },
      { questionId: 'employ_3', answer: 'yes' },
      { questionId: 'housing_1', answer: 'temp' },
    ],
    shareCode: 'DEF-456-UVW',
    todos: [
      {
        id: '3',
        title: 'Attend job fair on Friday',
        priority: 'urgent',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
};

export const CaseWorkerEntryScreen: React.FC<CaseWorkerEntryScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [shareCode, setShareCode] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'name' | 'code'>('name');

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      setError('Please enter your name');
      return;
    }

    // Create case worker profile
    const caseWorkerProfile: CaseWorkerProfile = {
      id: Date.now().toString(36),
      name: name.trim(),
      connectedClients: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'SET_CASEWORKER_PROFILE', payload: caseWorkerProfile });
    setStep('code');
    setError('');
  };

  const handleConnect = () => {
    const formattedCode = shareCode.toUpperCase().trim();

    if (formattedCode.length < 11) {
      setError(t('caseworker.invalidCode'));
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API call to find client
    setTimeout(() => {
      const client = DEMO_CLIENTS[formattedCode];

      if (client) {
        dispatch({ type: 'ADD_CLIENT', payload: client });
        navigation.reset({
          index: 0,
          routes: [{ name: 'CaseWorkerDashboard' }],
        });
      } else {
        // For demo, also accept any properly formatted code
        if (/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(formattedCode)) {
          // Create a demo client with the entered code
          const newClient: UserProfile = {
            id: Date.now().toString(36),
            name: 'New Client',
            immigrationStatus: 'prefer_not_to_say',
            location: { latitude: 0, longitude: 0 },
            selectedCategories: ['healthcare'],
            answers: [],
            shareCode: formattedCode,
            todos: [],
            createdAt: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_CLIENT', payload: newClient });
          navigation.reset({
            index: 0,
            routes: [{ name: 'CaseWorkerDashboard' }],
          });
        } else {
          setError(t('caseworker.invalidCode'));
        }
      }
      setIsLoading(false);
    }, 1000);
  };

  const formatShareCode = (text: string): string => {
    // Remove non-alphanumeric characters and uppercase
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Add dashes
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 9; i++) {
      if (i > 0 && i % 3 === 0) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    return formatted;
  };

  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>👥</Text>
            </View>

            <Text style={styles.title}>Welcome, Case Worker</Text>
            <Text style={styles.subtitle}>Please enter your name to get started</Text>

            <View style={styles.form}>
              <Input
                placeholder="Your name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError('');
                }}
                autoFocus
                autoCapitalize="words"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </View>

          <View style={styles.navigation}>
            <Button
              title={t('onboarding.back')}
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <Button
              title={t('onboarding.next')}
              onPress={handleNameSubmit}
              disabled={name.trim().length < 2}
              style={styles.nextButton}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔗</Text>
          </View>

          <Text style={styles.title}>{t('caseworker.enterCode')}</Text>
          <Text style={styles.subtitle}>{t('caseworker.enterCodeDesc')}</Text>

          <View style={styles.form}>
            <Input
              placeholder={t('caseworker.codePlaceholder')}
              value={shareCode}
              onChangeText={(text) => {
                setShareCode(formatShareCode(text));
                setError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              style={styles.codeInput}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.demoHint}>
              <Text style={styles.demoHintTitle}>Demo codes to try:</Text>
              <Text style={styles.demoCode}>ABC-123-XYZ</Text>
              <Text style={styles.demoCode}>DEF-456-UVW</Text>
            </View>
          </View>
        </View>

        <View style={styles.navigation}>
          <Button
            title={t('onboarding.back')}
            variant="outline"
            onPress={() => setStep('name')}
            style={styles.backButton}
          />
          <Button
            title={t('caseworker.connect')}
            onPress={handleConnect}
            loading={isLoading}
            disabled={shareCode.length < 11}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  demoHint: {
    marginTop: 32,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoHintTitle: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
  },
  demoCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
