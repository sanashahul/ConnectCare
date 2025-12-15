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
  const { t } = useTranslation();
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
      dispatch({ type: 'SET_ONBOARDING_STEP', payload: 3 });
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
          <ProgressBar current={3} total={4} label="3 / 4" />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{t('onboarding.locationTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.locationSubtitle')}</Text>

          {/* Location Detection */}
          {!showZipInput && !location && (
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
          )}

          {/* Location Detected */}
          {location && (
            <View style={styles.locationDetected}>
              <Text style={styles.locationIcon}>✓</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>{t('onboarding.locationDetected')}</Text>
                <Text style={styles.locationText}>
                  {location.city && location.state
                    ? `${location.city}, ${location.state}`
                    : location.zipCode || 'Location set'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setLocation(null);
                  setShowZipInput(false);
                }}
              >
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ZIP Code Input */}
          {(showZipInput || (!location && !isDetecting)) && !location && (
            <View style={styles.zipSection}>
              {!showZipInput && (
                <TouchableOpacity onPress={() => setShowZipInput(true)}>
                  <Text style={styles.manualLink}>{t('onboarding.enterManually')}</Text>
                </TouchableOpacity>
              )}

              {showZipInput && (
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
                    title="Find"
                    onPress={handleZipCodeSubmit}
                    disabled={zipCode.length < 5 || isDetecting}
                    loading={isDetecting}
                  />
                </View>
              )}
            </View>
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
  detectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  detectIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  detectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  locationDetected: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 24,
    color: '#059669',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  changeLink: {
    color: '#059669',
    fontWeight: '600',
  },
  zipSection: {
    marginTop: 16,
  },
  manualLink: {
    color: '#2563EB',
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  zipForm: {
    gap: 12,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
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
