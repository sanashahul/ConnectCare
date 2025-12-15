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
  { id: 'healthcare', icon: '🏥', color: '#059669', bgColor: '#D1FAE5' },
  { id: 'employment', icon: '💼', color: '#D97706', bgColor: '#FEF3C7' },
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
      dispatch({ type: 'SET_ONBOARDING_STEP', payload: 4 });
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
        <ProgressBar current={4} total={4} label="4 / 4" />
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
    marginBottom: 24,
  },
  categories: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryEmoji: {
    fontSize: 36,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  checkbox: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  selectedInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  selectedText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
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
