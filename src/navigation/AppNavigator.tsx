import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import {
  WelcomeScreen,
  NameInputScreen,
  AgeInputScreen,
  ImmigrationStatusScreen,
  LocationInputScreen,
  CategorySelectionScreen,
  QuestionnaireScreen,
  DashboardScreen,
  HealthScreen,
  JobsScreen,
  HousingScreen,
  SavedFromCasyScreen,
  PinSetupScreen,
} from '../screens';
import { PlanScreen } from '../screens/plan/PlanScreen';
import { IntakeChatScreen } from '../screens/intake/IntakeChatScreen';
import { PinLockScreen } from '../screens/PinLockScreen';
import { LoadingScreen } from '../screens/LoadingScreen';

export type RootStackParamList = {
  Welcome: undefined;
  NameInput: undefined;
  AgeInput: undefined;
  ImmigrationStatus: undefined;
  PinSetup: undefined;
  LocationInput: undefined;
  CategorySelection: undefined;
  Questionnaire: undefined;
  Dashboard: undefined;
  Plan: undefined;
  IntakeChat: undefined;
  Health: undefined;
  Jobs: undefined;
  Housing: undefined;
  SavedFromCasy: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { state, dispatch } = useApp();

  // Onboarding is complete once the user has a shareCode set.
  const hasCompletedOnboarding = !!state.userProfile?.shareCode;
  const hasPinSet = !!state.userProfile?.pin;
  const shouldShowPinLock = hasCompletedOnboarding && hasPinSet && state.isLocked;

  const getInitialRoute = (): keyof RootStackParamList => {
    if (state.userProfile?.shareCode) {
      // Just finished the questionnaire: the navigator remounts (its key is
      // tied to shareCode), so land directly on the Plan screen instead of
      // the Dashboard - otherwise the reset-to-Plan is thrown away and the
      // user is dumped on the "build my plan" card.
      if (state.startPlanAfterOnboarding) {
        return 'Plan';
      }
      return 'Dashboard';
    }
    return 'Welcome';
  };

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  if (shouldShowPinLock) {
    return <PinLockScreen onUnlock={() => dispatch({ type: 'UNLOCK_APP' })} />;
  }

  // Re-key on completed onboarding so navigation resets cleanly after reset.
  const navKey = state.userProfile?.shareCode || 'onboarding';

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#F9FAFB' },
        }}
      >
        {/* Welcome */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />

        {/* Onboarding */}
        <Stack.Screen name="NameInput" component={NameInputScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
        <Stack.Screen name="ImmigrationStatus" component={ImmigrationStatusScreen} />
        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        <Stack.Screen name="LocationInput" component={LocationInputScreen} />
        <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />

        {/* Questionnaire */}
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />

        {/* Dashboard */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Plan */}
        <Stack.Screen name="Plan" component={PlanScreen} />

        {/* Conversational intake */}
        <Stack.Screen name="IntakeChat" component={IntakeChatScreen} />

        {/* Category Screens */}
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="Jobs" component={JobsScreen} />
        <Stack.Screen name="Housing" component={HousingScreen} />
        <Stack.Screen name="SavedFromCasy" component={SavedFromCasyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
