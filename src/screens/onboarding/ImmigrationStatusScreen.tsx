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
    backgroundColor: '#FEFEFE',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
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
    marginBottom: 20,
    lineHeight: 26,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 21,
    fontWeight: '500',
  },
  options: {
    marginTop: 4,
  },
  optionIcon: {
    fontSize: 26,
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
