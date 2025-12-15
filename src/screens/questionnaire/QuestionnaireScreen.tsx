import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ProgressBar } from '../../components';
import { useApp } from '../../context/AppContext';
import { getQuestionsByCategory } from '../../data/questions';
import { Question, ServiceCategory } from '../../types';

type RootStackParamList = {
  Questionnaire: undefined;
  Dashboard: undefined;
  CategorySelection: undefined;
};

type QuestionnaireScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Questionnaire'>;
};

export const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({
  navigation,
}) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Get all questions for selected categories
  const allQuestions = useMemo(() => {
    const categories = state.userProfile?.selectedCategories || [];
    let questions: Question[] = [];
    categories.forEach((category) => {
      questions = [...questions, ...getQuestionsByCategory(category)];
    });
    return questions;
  }, [state.userProfile?.selectedCategories]);

  const currentQuestion = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const getCurrentCategoryLabel = (category: ServiceCategory): string => {
    return t(`questionnaire.category.${category}`);
  };

  const getQuestionText = (question: Question): string => {
    return i18n.language === 'es' ? question.questionEs : question.question;
  };

  const getOptionLabel = (option: { label: string; labelEs: string }): string => {
    return i18n.language === 'es' ? option.labelEs : option.label;
  };

  const handleAnswer = (answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleSingleSelect = (optionId: string) => {
    handleAnswer(optionId);
  };

  const handleMultiSelect = (optionId: string) => {
    const currentAnswer = (answers[currentQuestion.id] as string[]) || [];
    if (currentAnswer.includes(optionId)) {
      handleAnswer(currentAnswer.filter((id) => id !== optionId));
    } else {
      handleAnswer([...currentAnswer, optionId]);
    }
  };

  const handleYesNo = (value: 'yes' | 'no') => {
    handleAnswer(value);
  };

  const handleTextAnswer = (text: string) => {
    handleAnswer(text);
  };

  const handleNext = () => {
    // Save current answer to context
    const answer = answers[currentQuestion.id];
    if (answer) {
      dispatch({
        type: 'SET_ANSWER',
        payload: {
          questionId: currentQuestion.id,
          answer,
        },
      });
    }

    if (isLastQuestion) {
      // Complete onboarding
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (!answer) return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    if (typeof answer === 'string' && answer.trim() === '') return false;
    return true;
  };

  if (!currentQuestion) {
    return null;
  }

  const renderOptions = () => {
    switch (currentQuestion.type) {
      case 'single':
        return (
          <View style={styles.options}>
            {currentQuestion.options?.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSingleSelect(option.id)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {getOptionLabel(option)}
                  </Text>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'multiple':
        const selectedMultiple = (answers[currentQuestion.id] as string[]) || [];
        return (
          <View style={styles.options}>
            <Text style={styles.selectHint}>{t('questionnaire.selectAll')}</Text>
            {currentQuestion.options?.map((option) => {
              const isSelected = selectedMultiple.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleMultiSelect(option.id)}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {getOptionLabel(option)}
                  </Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'yesno':
        const yesNoAnswer = answers[currentQuestion.id] as string;
        return (
          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={[styles.yesNoButton, yesNoAnswer === 'yes' && styles.yesNoButtonSelected]}
              onPress={() => handleYesNo('yes')}
            >
              <Text style={[styles.yesNoText, yesNoAnswer === 'yes' && styles.yesNoTextSelected]}>
                {t('questionnaire.yes')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.yesNoButton, yesNoAnswer === 'no' && styles.yesNoButtonSelected]}
              onPress={() => handleYesNo('no')}
            >
              <Text style={[styles.yesNoText, yesNoAnswer === 'no' && styles.yesNoTextSelected]}>
                {t('questionnaire.no')}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'text':
        return (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={t('questionnaire.typeAnswer')}
              placeholderTextColor="#9CA3AF"
              value={(answers[currentQuestion.id] as string) || ''}
              onChangeText={handleTextAnswer}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <ProgressBar
          current={currentIndex + 1}
          total={totalQuestions}
          label={t('questionnaire.progress', {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {getCurrentCategoryLabel(currentQuestion.category)}
          </Text>
        </View>
      </View>

      {/* Question */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.question}>{getQuestionText(currentQuestion)}</Text>
        {renderOptions()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          title={t('questionnaire.previous')}
          variant="outline"
          onPress={handlePrevious}
          style={styles.backButton}
        />
        <Button
          title={isLastQuestion ? t('questionnaire.finish') : t('questionnaire.next')}
          onPress={handleNext}
          disabled={!canProceed()}
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
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  categoryBadgeText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    lineHeight: 32,
  },
  selectHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  options: {
    gap: 12,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    paddingRight: 12,
  },
  optionTextSelected: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  yesNoButtonSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  yesNoText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  yesNoTextSelected: {
    color: '#2563EB',
  },
  textInputContainer: {
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 120,
    textAlignVertical: 'top',
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
