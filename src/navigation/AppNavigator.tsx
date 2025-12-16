import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import {
  WelcomeScreen,
  NameInputScreen,
  ImmigrationStatusScreen,
  LocationInputScreen,
  CategorySelectionScreen,
  QuestionnaireScreen,
  DashboardScreen,
  CaseWorkerEntryScreen,
  CaseWorkerDashboardScreen,
} from '../screens';

export type RootStackParamList = {
  Welcome: undefined;
  NameInput: undefined;
  ImmigrationStatus: undefined;
  LocationInput: undefined;
  CategorySelection: undefined;
  Questionnaire: undefined;
  Dashboard: undefined;
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
