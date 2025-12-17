import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';
import { ServiceCategory } from '../../types';

type RootStackParamList = {
  CategorySelection: undefined;
  Questionnaire: undefined;
  LocationInput: undefined;
};

type CategorySelectionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CategorySelection'>;
};

interface CategoryOption {
  id: ServiceCategory;
  icon: string;
  color: string;
  bgColor: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'healthcare', icon: '🏥', color: '#0D9488', bgColor: '#CCFBF1' },
  { id: 'employment', icon: '💼', color: '#EA580C', bgColor: '#FFEDD5' },
  { id: 'housing', icon: '🏠', color: '#7C3AED', bgColor: '#EDE9FE' },
];

export const CategorySelectionScreen: React.FC<CategorySelectionScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const { dispatch } = useApp();
  const [selectedCategories, setSelectedCategories] = useState<ServiceCategory[]>([]);

  const toggleCategory = (category: ServiceCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleNext = () => {
    if (selectedCategories.length > 0) {
      dispatch({ type: 'SET_CATEGORIES', payload: selectedCategories });
      dispatch({ type: 'SET_ONBOARDING_STEP', payload: 5 });
      navigation.navigate('Questionnaire');
    }
  };

  const getCategoryLabel = (category: ServiceCategory): string => {
    return t(`onboarding.${category}`);
  };

  const getCategoryDescription = (category: ServiceCategory): string => {
    return t(`onboarding.${category}Desc`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBar current={5} total={5} label="5 / 5" />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('onboarding.categoryTitle')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.categorySubtitle')}</Text>

        <View style={styles.categories}>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && { borderColor: category.color, borderWidth: 3 },
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.bgColor }]}>
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                </View>
                <Text style={styles.categoryTitle}>{getCategoryLabel(category.id)}</Text>
                <Text style={styles.categoryDescription}>
                  {getCategoryDescription(category.id)}
                </Text>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && { backgroundColor: category.color, borderColor: category.color },
                  ]}
                >
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCategories.length === 0 && (
          <Text style={styles.hint}>{t('onboarding.selectAtLeastOne')}</Text>
        )}

        {selectedCategories.length > 0 && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedText}>
              {selectedCategories.length} selected • {selectedCategories.length * 10} questions
            </Text>
          </View>
        )}
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
          title={t('onboarding.getStarted')}
          onPress={handleNext}
          disabled={selectedCategories.length === 0}
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
    paddingHorizontal: 24,
    paddingTop: 32,
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
    marginBottom: 32,
    lineHeight: 26,
  },
  categories: {
    gap: 18,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    position: 'relative',
  },
  categoryIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoryEmoji: {
    fontSize: 44,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  categoryDescription: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  checkbox: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 28,
    fontWeight: '500',
  },
  selectedInfo: {
    backgroundColor: '#F0FDFA',
    borderRadius: 18,
    padding: 20,
    marginTop: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#99F6E4',
  },
  selectedText: {
    color: '#0D9488',
    fontSize: 15,
    fontWeight: '700',
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
