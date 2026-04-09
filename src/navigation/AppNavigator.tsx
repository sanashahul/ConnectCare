import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import {
  WelcomeScreen,
  NameInputScreen,
  AgeInputScreen,
  LocationInputScreen,
  CategorySelectionScreen,
  QuestionnaireScreen,
  IntakeSummaryScreen,
  DashboardScreen,
  HealthScreen,
  JobsScreen,
  HousingScreen,
  CaseManagerScreen,
  CaseWorkerEntryScreen,
  CaseWorkerDashboardScreen,
  PinSetupScreen,
} from '../screens';
import { PinLockScreen } from '../screens/PinLockScreen';

export type RootStackParamList = {
  Welcome: undefined;
  NameInput: undefined;
  AgeInput: undefined;
  PinSetup: undefined;
  LocationInput: undefined;
  CategorySelection: undefined;
  Questionnaire: undefined;
  IntakeSummary: undefined;
  Dashboard: undefined;
  Health: undefined;
  Jobs: undefined;
  Housing: undefined;
  CaseManager: undefined;
  CaseWorkerEntry: undefined;
  CaseWorkerDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { state, dispatch } = useApp();

  // Check if user has completed onboarding
  // For caseworkers: onboarding complete when they have connected to at least one client
  // For users: onboarding complete when shareCode is set
  const hasCompletedOnboarding = state.userRole === 'caseworker'
    ? !!state.caseWorkerProfile && state.connectedClients.length > 0
    : !!state.userProfile?.shareCode;

  // Check if user has a PIN set and app should be locked
  const hasPinSet = state.userRole === 'caseworker'
    ? !!state.caseWorkerProfile?.pin
    : !!state.userProfile?.pin;

  // Only show PIN lock if onboarding is complete, PIN is set, and app is locked
  const shouldShowPinLock = hasCompletedOnboarding && hasPinSet && state.isLocked;

  // Determine initial route based on saved state
  const getInitialRoute = (): keyof RootStackParamList => {
    if (state.userRole === 'individual' && state.userProfile?.shareCode) {
      // First-time completion of intake: show the welcome summary carousel
      // before dropping the user on the dashboard. Once they've swiped
      // through it once, hasSeenIntakeSummary flips and every subsequent
      // app open goes straight to the dashboard.
      if (!state.userProfile.hasSeenIntakeSummary) {
        return 'IntakeSummary';
      }
      return 'Dashboard';
    }
    if (state.userRole === 'caseworker' && state.caseWorkerProfile) {
      // Case worker is logged in
      return 'CaseWorkerDashboard';
    }
    return 'Welcome';
  };

  if (state.isLoading) {
    return null; // Or a loading screen
  }

  // Show PIN lock screen if app is locked and user has PIN
  if (shouldShowPinLock) {
    return <PinLockScreen onUnlock={() => dispatch({ type: 'UNLOCK_APP' })} />;
  }

  // Use a key based on completed user state to force re-render when reset
  // Important: Use shareCode (set at onboarding completion) instead of id to avoid
  // resetting navigation during onboarding when userProfile is first created
  const navKey = state.userProfile?.shareCode || state.caseWorkerProfile?.id || 'onboarding';

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

        {/* Individual Onboarding */}
        <Stack.Screen name="NameInput" component={NameInputScreen} />
        <Stack.Screen name="AgeInput" component={AgeInputScreen} />
        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        <Stack.Screen name="LocationInput" component={LocationInputScreen} />
        <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />

        {/* Questionnaire */}
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />

        {/* Intake Summary - post-intake welcome carousel */}
        <Stack.Screen
          name="IntakeSummary"
          component={IntakeSummaryScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Dashboard */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Category Screens */}
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="Jobs" component={JobsScreen} />
        <Stack.Screen name="Housing" component={HousingScreen} />
        <Stack.Screen name="CaseManager" component={CaseManagerScreen} />

        {/* Case Worker */}
        <Stack.Screen name="CaseWorkerEntry" component={CaseWorkerEntryScreen} />
        <Stack.Screen
          name="CaseWorkerDashboard"
          component={CaseWorkerDashboardScreen}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
