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
  CaseWorkerEntryScreen,
  CaseWorkerDashboardScreen,
} from '../screens';

export type RootStackParamList = {
  Welcome: undefined;
  NameInput: undefined;
  AgeInput: undefined;
  ImmigrationStatus: undefined;
  LocationInput: undefined;
  CategorySelection: undefined;
  Questionnaire: undefined;
  Dashboard: undefined;
  Health: undefined;
  Jobs: undefined;
  Housing: undefined;
  CaseWorkerEntry: undefined;
  CaseWorkerDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { state } = useApp();

  // Determine initial route based on saved state
  const getInitialRoute = (): keyof RootStackParamList => {
    if (state.userRole === 'individual' && state.userProfile?.shareCode) {
      // User has completed onboarding
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

  // Use a key based on user state to force re-render when reset
  const navKey = state.userProfile?.id || state.caseWorkerProfile?.id || 'fresh';

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
        <Stack.Screen name="ImmigrationStatus" component={ImmigrationStatusScreen} />
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

        {/* Category Screens */}
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="Jobs" component={JobsScreen} />
        <Stack.Screen name="Housing" component={HousingScreen} />

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
