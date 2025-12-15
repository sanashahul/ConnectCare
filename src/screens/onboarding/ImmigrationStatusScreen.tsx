import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, SelectableCard, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';
import { ImmigrationStatus } from '../../types';

type RootStackParamList = {
  ImmigrationStatus: undefined;
  LocationInput: undefined;
  NameInput: undefined;
};

type ImmigrationStatusScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ImmigrationStatus'>;
};

const STATUS_OPTIONS: { id: ImmigrationStatus; icon: string }[] = [
  { id: 'citizen', icon: '🇺🇸' },
  { id: 'permanent_resident', icon: '🪪' },
  { id: 'visa_holder', icon: '📄' },
  { id: 'undocumented', icon: '🤝' },
  { id: 'asylum_seeker', icon: '🕊️' },
  { id: 'prefer_not_to_say', icon: '🔒' },
];

export const ImmigrationStatusScreen: React.FC<ImmigrationStatusScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const { dispatch } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<ImmigrationStatus | null>(null);

  const handleNext = () => {
    if (selectedStatus) {
      dispatch({ type: 'SET_IMMIGRATION_STATUS', payload: selectedStatus });
      dispatch({ type: 'SET_ONBOARDING_STEP', payload: 2 });
      navigation.navigate('LocationInput');
    }
  };

  const getStatusLabel = (status: ImmigrationStatus): string => {
    const labels: Record<ImmigrationStatus, string> = {
      citizen: t('onboarding.citizen'),
      permanent_resident: t('onboarding.permanentResident'),
      visa_holder: t('onboarding.visaHolder'),
      undocumented: t('onboarding.undocumented'),
      asylum_seeker: t('onboarding.asylumSeeker'),
      prefer_not_to_say: t('onboarding.preferNotToSay'),
    };
    return labels[status];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBar current={2} total={4} label="2 / 4" />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('onboarding.immigrationTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.immigrationSubtitle')}</Text>

        <View style={styles.note}>
          <Text style={styles.noteIcon}>🔒</Text>
          <Text style={styles.noteText}>{t('onboarding.immigrationNote')}</Text>
        </View>

        <View style={styles.options}>
          {STATUS_OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              title={getStatusLabel(option.id)}
              selected={selectedStatus === option.id}
              onPress={() => setSelectedStatus(option.id)}
              icon={<Text style={styles.optionIcon}>{option.icon}</Text>}
            />
          ))}
        </View>
      </ScrollView>

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
          disabled={!selectedStatus}
          style={styles.nextButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
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
    marginBottom: 16,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  noteIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  options: {
    marginTop: 8,
  },
  optionIcon: {
    fontSize: 24,
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
