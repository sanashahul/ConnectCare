import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';
import { AgeGroup } from '../../types';

type RootStackParamList = {
  NameInput: undefined;
  AgeInput: undefined;
  ImmigrationStatus: undefined;
};

type AgeInputScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AgeInput'>;
};

interface AgeOption {
  id: AgeGroup;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  minAge: number;
  maxAge: number;
}

const ageOptions: AgeOption[] = [
  {
    id: 'under18',
    label: 'Under 18',
    labelEs: 'Menor de 18',
    description: "We have special resources for youth",
    descriptionEs: 'Tenemos recursos especiales para jóvenes',
    minAge: 0,
    maxAge: 17,
  },
  {
    id: '18-24',
    label: '18 - 24',
    labelEs: '18 - 24',
    description: 'Young adult resources and opportunities',
    descriptionEs: 'Recursos y oportunidades para adultos jóvenes',
    minAge: 18,
    maxAge: 24,
  },
  {
    id: '25-54',
    label: '25 - 54',
    labelEs: '25 - 54',
    description: 'Full range of services available',
    descriptionEs: 'Gama completa de servicios disponibles',
    minAge: 25,
    maxAge: 54,
  },
  {
    id: '55plus',
    label: '55+',
    labelEs: '55+',
    description: 'Senior-specific programs and support',
    descriptionEs: 'Programas y apoyo específicos para mayores',
    minAge: 55,
    maxAge: 120,
  },
];

export const AgeInputScreen: React.FC<AgeInputScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { dispatch } = useApp();
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const isSpanish = i18n.language === 'es';

  const handleSelect = (option: AgeOption) => {
    setSelectedAge(option.id);
  };

  const handleNext = () => {
    if (!selectedAge) return;

    const option = ageOptions.find(o => o.id === selectedAge);
    if (!option) return;

    // Use middle of range as approximate age
    const approximateAge = option.id === 'under18' ? 16 :
                          option.id === '18-24' ? 21 :
                          option.id === '25-54' ? 35 : 60;

    dispatch({
      type: 'SET_USER_AGE',
      payload: {
        age: approximateAge,
        ageGroup: selectedAge
      }
    });
    dispatch({ type: 'SET_ONBOARDING_STEP', payload: 2 });
    navigation.navigate('ImmigrationStatus');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBar current={2} total={6} label="2 / 6" />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {isSpanish ? '¿Cuántos años tienes?' : 'How old are you?'}
        </Text>
        <Text style={styles.subtitle}>
          {isSpanish
            ? 'Esto nos ayuda a encontrar los recursos adecuados para ti'
            : 'This helps us find the right resources for you'}
        </Text>

        <View style={styles.optionsContainer}>
          {ageOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedAge === option.id && styles.optionCardSelected,
                option.id === 'under18' && styles.youthCard,
                option.id === 'under18' && selectedAge === option.id && styles.youthCardSelected,
              ]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  selectedAge === option.id && styles.optionLabelSelected,
                ]}>
                  {isSpanish ? option.labelEs : option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedAge === option.id && styles.optionDescriptionSelected,
                ]}>
                  {isSpanish ? option.descriptionEs : option.description}
                </Text>
              </View>
              <View style={[
                styles.radioOuter,
                selectedAge === option.id && styles.radioOuterSelected,
              ]}>
                {selectedAge === option.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Youth support message */}
        {selectedAge === 'under18' && (
          <View style={styles.youthMessage}>
            <Text style={styles.youthMessageIcon}>💚</Text>
            <Text style={styles.youthMessageText}>
              {isSpanish
                ? 'No estás solo/a. Tenemos recursos especiales y personas que pueden ayudarte. Tu seguridad es nuestra prioridad.'
                : "You're not alone. We have special resources and people who can help you. Your safety is our priority."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          title={isSpanish ? 'Atrás' : 'Back'}
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Button
          title={isSpanish ? 'Siguiente' : 'Next'}
          onPress={handleNext}
          disabled={!selectedAge}
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
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
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
    marginBottom: 32,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  optionCardSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  youthCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  youthCardSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#0D9488',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  optionDescriptionSelected: {
    color: '#0F766E',
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: '#0D9488',
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0D9488',
  },
  youthMessage: {
    marginTop: 24,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  youthMessageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  youthMessageText: {
    flex: 1,
    fontSize: 15,
    color: '#065F46',
    lineHeight: 22,
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
