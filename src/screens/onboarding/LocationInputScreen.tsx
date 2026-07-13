import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';
import { getCurrentLocation, getLocationFromZip } from '../../utils/location';
import { Location } from '../../types';

type RootStackParamList = {
  LocationInput: undefined;
  CategorySelection: undefined;
  ImmigrationStatus: undefined;
};

type LocationInputScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LocationInput'>;
};

export const LocationInputScreen: React.FC<LocationInputScreenProps> = ({
  navigation,
}) => {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const { dispatch } = useApp();
  const [location, setLocation] = useState<Location | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [showZipInput, setShowZipInput] = useState(false);
  const [error, setError] = useState('');

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setError('');

    const detectedLocation = await getCurrentLocation();

    if (detectedLocation) {
      setLocation(detectedLocation);
      setShowZipInput(false);
    } else {
      setError(t('onboarding.locationError'));
      setShowZipInput(true);
    }

    setIsDetecting(false);
  };

  const handleZipCodeSubmit = async () => {
    if (zipCode.length < 5) {
      setError('Please enter a valid ZIP code');
      return;
    }

    setIsDetecting(true);
    setError('');

    const locationFromZip = await getLocationFromZip(zipCode);

    if (locationFromZip) {
      setLocation(locationFromZip);
    } else {
      setError('Could not find location for this ZIP code');
    }

    setIsDetecting(false);
  };

  const handleNext = () => {
    if (location) {
      dispatch({ type: 'SET_LOCATION', payload: location });
      dispatch({ type: 'SET_ONBOARDING_STEP', payload: 5 });
      navigation.navigate('CategorySelection');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress */}
        <View style={styles.progressContainer}>
          <ProgressBar current={5} total={6} label="5 / 6" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{t('onboarding.locationTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.locationSubtitle')}</Text>

          {location ? (
            /* Confirmed location - ZIP shown clearly so they can verify it */
            <View style={styles.locationDetected}>
              <Text style={styles.locationIcon}>✓</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>
                  {isSpanish ? 'TU UBICACIÓN' : 'YOUR LOCATION'}
                </Text>
                <Text style={styles.locationText}>
                  {location.city
                    ? `${location.city}${location.state ? ', ' + location.state : ''}`
                    : isSpanish ? 'Ubicación fijada' : 'Location set'}
                </Text>
                {!!location.zipCode && (
                  <Text style={styles.locationZip}>
                    {isSpanish ? 'Código postal' : 'ZIP'} {location.zipCode}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setLocation(null);
                  setShowZipInput(false);
                }}
              >
                <Text style={styles.changeLink}>{isSpanish ? 'Cambiar' : 'Change'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ZIP entry - the clearest, most accurate way to set location */}
              <Text style={styles.zipLabel}>
                {isSpanish ? 'Ingresa tu código postal' : 'Enter your ZIP code'}
              </Text>
              <View style={styles.zipForm}>
                <Input
                  placeholder={t('onboarding.zipPlaceholder')}
                  value={zipCode}
                  onChangeText={(text) => {
                    setZipCode(text.replace(/[^0-9]/g, '').slice(0, 5));
                    setError('');
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Button
                  title={isSpanish ? 'Buscar' : 'Find'}
                  onPress={handleZipCodeSubmit}
                  disabled={zipCode.length < 5 || isDetecting}
                  loading={isDetecting}
                />
              </View>
              <Text style={styles.zipHint}>
                {isSpanish
                  ? 'Tu código postal nos da tu ubicación más exacta (mejor que el GPS).'
                  : 'Your ZIP code gives us your most accurate location (more precise than GPS).'}
              </Text>

              {/* GPS as a secondary option */}
              <Text style={styles.orText}>{isSpanish ? '— o —' : '— or —'}</Text>
              <TouchableOpacity
                style={styles.detectButton}
                onPress={handleDetectLocation}
                disabled={isDetecting}
              >
                {isDetecting ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <>
                    <Text style={styles.detectIcon}>📍</Text>
                    <Text style={styles.detectText}>{t('onboarding.detectLocation')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Error Message */}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
            disabled={!location}
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
  detectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  detectIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  detectText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D9488',
  },
  locationDetected: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  locationIcon: {
    fontSize: 28,
    color: '#16A34A',
    marginRight: 14,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    color: '#16A34A',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14532D',
  },
  locationZip: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    marginTop: 4,
  },
  zipLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  zipHint: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 19,
  },
  orText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
    marginVertical: 18,
  },
  changeLink: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 14,
  },
  zipSection: {
    marginTop: 20,
  },
  manualLink: {
    color: '#0D9488',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  zipForm: {
    gap: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
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
