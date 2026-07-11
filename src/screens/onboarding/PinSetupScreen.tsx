import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';

type RootStackParamList = {
  PinSetup: undefined;
  LocationInput: undefined;
  ImmigrationStatus: undefined;
};

type PinSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PinSetup'>;
};

export const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { dispatch } = useApp();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handlePinChange = (digit: string) => {
    const currentPin = step === 'create' ? pin : confirmPin;
    const setCurrentPin = step === 'create' ? setPin : setConfirmPin;

    if (currentPin.length < 4) {
      const newPin = currentPin + digit;
      setCurrentPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (step === 'create') {
          // Move to confirm step
          setTimeout(() => setStep('confirm'), 300);
        } else {
          // Verify PINs match
          if (newPin === pin) {
            // PINs match, save and proceed
            dispatch({ type: 'SET_USER_PIN', payload: newPin });
            dispatch({ type: 'SET_ONBOARDING_STEP', payload: 4 });
            navigation.navigate('LocationInput');
          } else {
            // PINs don't match
            setError(true);
            Vibration.vibrate(200);
            Animated.sequence([
              Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start(() => {
              setConfirmPin('');
            });
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError(false);
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      setPin('');
      setConfirmPin('');
      setError(false);
    } else {
      navigation.goBack();
    }
  };

  const currentPin = step === 'create' ? pin : confirmPin;

  const renderDots = () => {
    return (
      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              currentPin.length > i && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'del'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keyEmpty} />;
              }
              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={keyIndex}
                    style={styles.key}
                    onPress={handleDelete}
                  >
                    <Text style={styles.keyTextDel}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={keyIndex}
                  style={styles.key}
                  onPress={() => handlePinChange(key)}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBar current={4} total={6} label="4 / 6" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.lockIcon}>🔐</Text>
        <Text style={styles.title}>
          {step === 'create'
            ? (i18n.language === 'es' ? 'Crea tu PIN' : 'Create your PIN')
            : (i18n.language === 'es' ? 'Confirma tu PIN' : 'Confirm your PIN')
          }
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? (i18n.language === 'es'
                ? 'Este código de 4 dígitos protegerá tu información'
                : 'This 4-digit code will protect your information')
            : (i18n.language === 'es'
                ? 'Ingresa el mismo código nuevamente'
                : 'Enter the same code again')
          }
        </Text>

        {renderDots()}

        {error && (
          <Text style={styles.errorText}>
            {i18n.language === 'es' ? 'Los códigos no coinciden' : 'PINs do not match'}
          </Text>
        )}

        {renderKeypad()}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          title={i18n.language === 'es' ? 'Atrás' : 'Back'}
          variant="outline"
          onPress={handleBack}
          style={styles.backButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 28,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0D9488',
    marginHorizontal: 10,
  },
  dotFilled: {
    backgroundColor: '#0D9488',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
  },
  keypad: {
    marginTop: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 14,
  },
  keyEmpty: {
    width: 70,
    height: 70,
    marginHorizontal: 14,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0F172A',
  },
  keyTextDel: {
    fontSize: 24,
    color: '#64748B',
  },
  navigation: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FEFEFE',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  backButton: {
    width: '100%',
  },
});
