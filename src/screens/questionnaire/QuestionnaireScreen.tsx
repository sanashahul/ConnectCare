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
import { Button, ProgressBar, AIAssistant } from '../../components';
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
      <AIAssistant />
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
  categoryBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  categoryBadgeText: {
    color: '#0D9488',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
  },
  question: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  selectHint: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    fontWeight: '500',
  },
  options: {
    gap: 14,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    shadowColor: '#0D9488',
    shadowOpacity: 0.1,
  },
  optionText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
    paddingRight: 14,
    lineHeight: 24,
  },
  optionTextSelected: {
    color: '#0F766E',
    fontWeight: '600',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#0D9488',
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0D9488',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#0D9488',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: 18,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  yesNoButtonSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    shadowColor: '#0D9488',
  },
  yesNoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334155',
  },
  yesNoTextSelected: {
    color: '#0D9488',
  },
  textInputContainer: {
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
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
