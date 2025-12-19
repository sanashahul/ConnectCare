import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  TouchableOpacity,
  Animated,
  Vibration,
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
  const [step, setStep] = useState<'name' | 'pin' | 'code'>('name');

  // PIN setup state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const pinInputRef = useRef<TextInput>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

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
    setStep('pin');
    setError('');
  };

  const shake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinDigit = (digit: string) => {
    if (pinStep === 'create') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => {
            setPinStep('confirm');
          }, 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          setTimeout(() => {
            if (newConfirm === pin) {
              dispatch({ type: 'SET_CASEWORKER_PIN', payload: pin });
              setStep('code');
              setError('');
            } else {
              shake();
              setConfirmPin('');
              setError('PINs do not match. Try again.');
            }
          }, 200);
        }
      }
    }
  };

  const handlePinBackspace = () => {
    if (pinStep === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError('');
  };

  const handlePinBack = () => {
    if (pinStep === 'confirm') {
      setPinStep('create');
      setPin('');
      setConfirmPin('');
      setError('');
    } else {
      setStep('name');
    }
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

  if (step === 'pin') {
    const currentPin = pinStep === 'create' ? pin : confirmPin;

    return (
      <SafeAreaView style={styles.pinContainer}>
        <View style={styles.pinContent}>
          <View style={styles.pinHeader}>
            <Text style={styles.pinTitle}>
              {pinStep === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
            </Text>
            <Text style={styles.pinSubtitle}>
              {pinStep === 'create'
                ? 'Enter a 4-digit PIN to secure your account'
                : 'Enter your PIN again to confirm'}
            </Text>
          </View>

          <Animated.View
            style={[styles.pinDotsContainer, { transform: [{ translateX: shakeAnimation }] }]}
          >
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  index < currentPin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </Animated.View>

          {error ? <Text style={styles.pinError}>{error}</Text> : null}

          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', '⌫'],
            ].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((digit, digitIndex) => (
                  <TouchableOpacity
                    key={digitIndex}
                    style={[styles.keypadButton, digit === '' && styles.keypadButtonEmpty]}
                    onPress={() => {
                      if (digit === '⌫') {
                        handlePinBackspace();
                      } else if (digit !== '') {
                        handlePinDigit(digit);
                      }
                    }}
                    disabled={digit === ''}
                  >
                    <Text style={styles.keypadText}>{digit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.pinBackButton} onPress={handlePinBack}>
            <Text style={styles.pinBackText}>
              {pinStep === 'confirm' ? '← Start Over' : '← Back'}
            </Text>
          </TouchableOpacity>
        </View>
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
  // PIN setup styles
  pinContainer: {
    flex: 1,
    backgroundColor: '#0D9488',
  },
  pinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  pinTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  pinSubtitle: {
    fontSize: 16,
    color: '#99F6E4',
    textAlign: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 48,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
  },
  pinError: {
    color: '#FEE2E2',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 24,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pinBackButton: {
    marginTop: 32,
    padding: 12,
  },
  pinBackText: {
    fontSize: 16,
    color: '#99F6E4',
  },
});
