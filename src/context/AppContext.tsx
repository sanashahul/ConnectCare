import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  CaseWorkerProfile,
  ServiceCategory,
  ImmigrationStatus,
  Location,
  QuestionAnswer,
  TodoItem,
  UserRole,
  AgeGroup,
  CaseManagerData,
  CaseManagerMessage,
  CaseManagerTask,
  CaseManagerNote,
  CaseManagerConnection,
  TaskCategory,
  TaskStatus,
  TaskPriority,
} from '../types';

// Storage keys
const USER_PROFILE_KEY = '@connectcare_user_profile';
const CASEWORKER_PROFILE_KEY = '@connectcare_caseworker_profile';
const CLIENTS_KEY = '@connectcare_clients';
const CASE_MANAGER_DATA_KEY = '@connectcare_case_manager_data';

// Generate a share code
export const generateShareCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) code += '-';
  }
  return code;
};

// Generate unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Empty case manager data
const createEmptyCaseManagerData = (): CaseManagerData => ({
  connection: null,
  messages: [],
  tasks: [],
  notes: [],
  unreadMessages: 0,
  pendingTasks: 0,
});

interface AppState {
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  caseWorkerProfile: CaseWorkerProfile | null;
  connectedClients: UserProfile[];
  currentClientId: string | null;
  isLoading: boolean;
  onboardingStep: number;
  caseManagerData: CaseManagerData;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'SET_ONBOARDING_STEP'; payload: number }
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_USER_AGE'; payload: { age: number; ageGroup: AgeGroup } }
  | { type: 'SET_IMMIGRATION_STATUS'; payload: ImmigrationStatus }
  | { type: 'SET_LOCATION'; payload: Location }
  | { type: 'SET_CATEGORIES'; payload: ServiceCategory[] }
  | { type: 'SET_ANSWER'; payload: QuestionAnswer }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'ADD_TODO'; payload: Omit<TodoItem, 'id' | 'createdAt'> }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'SET_CASEWORKER_PROFILE'; payload: CaseWorkerProfile }
  | { type: 'ADD_CLIENT'; payload: UserProfile }
  | { type: 'SET_CURRENT_CLIENT'; payload: string | null }
  | { type: 'ADD_CLIENT_TODO'; payload: { clientId: string; todo: Omit<TodoItem, 'id' | 'createdAt'> } }
  | { type: 'TOGGLE_CLIENT_TODO'; payload: { clientId: string; todoId: string } }
  | { type: 'UPDATE_CLIENT_TODO_DESCRIPTION'; payload: { clientId: string; todoId: string; description: string } }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  | { type: 'RESET_STATE' }
  // Case Manager Collaboration Actions
  | { type: 'SET_CM_CONNECTION'; payload: CaseManagerConnection | null }
  | { type: 'ADD_CM_MESSAGE'; payload: Omit<CaseManagerMessage, 'id' | 'timestamp'> }
  | { type: 'MARK_CM_MESSAGES_READ' }
  | { type: 'ADD_CM_TASK'; payload: Omit<CaseManagerTask, 'id' | 'createdAt'> }
  | { type: 'UPDATE_CM_TASK_STATUS'; payload: { taskId: string; status: TaskStatus } }
  | { type: 'DELETE_CM_TASK'; payload: string }
  | { type: 'ADD_CM_NOTE'; payload: Omit<CaseManagerNote, 'id' | 'createdAt'> }
  | { type: 'LOAD_CM_DATA'; payload: CaseManagerData };

const initialState: AppState = {
  userRole: null,
  userProfile: null,
  caseWorkerProfile: null,
  connectedClients: [],
  currentClientId: null,
  isLoading: true,
  onboardingStep: 0,
  caseManagerData: createEmptyCaseManagerData(),
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };

    case 'SET_ONBOARDING_STEP':
      return { ...state, onboardingStep: action.payload };

    case 'SET_USER_NAME':
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          name: action.payload,
        },
      };

    case 'SET_USER_AGE':
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          age: action.payload.age,
          ageGroup: action.payload.ageGroup,
        },
      };

    case 'SET_IMMIGRATION_STATUS':
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          immigrationStatus: action.payload,
        },
      };

    case 'SET_LOCATION':
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          location: action.payload,
        },
      };

    case 'SET_CATEGORIES':
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          selectedCategories: action.payload,
        },
      };

    case 'SET_ANSWER': {
      const currentAnswers = state.userProfile?.answers || [];
      const existingIndex = currentAnswers.findIndex(
        (a) => a.questionId === action.payload.questionId
      );
      let newAnswers: QuestionAnswer[];
      if (existingIndex >= 0) {
        newAnswers = [...currentAnswers];
        newAnswers[existingIndex] = action.payload;
      } else {
        newAnswers = [...currentAnswers, action.payload];
      }
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          answers: newAnswers,
        },
      };
    }

    case 'COMPLETE_ONBOARDING': {
      const shareCode = generateShareCode();
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          shareCode,
        },
      };
    }

    case 'ADD_TODO': {
      const newTodo: TodoItem = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          todos: [...(state.userProfile?.todos || []), newTodo],
        },
      };
    }

    case 'TOGGLE_TODO': {
      const todos = state.userProfile?.todos || [];
      const updatedTodos = todos.map((todo) =>
        todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo
      );
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          todos: updatedTodos,
        },
      };
    }

    case 'DELETE_TODO': {
      const todos = state.userProfile?.todos || [];
      return {
        ...state,
        userProfile: {
          ...(state.userProfile || createEmptyUserProfile()),
          todos: todos.filter((todo) => todo.id !== action.payload),
        },
      };
    }

    case 'SET_CASEWORKER_PROFILE':
      return { ...state, caseWorkerProfile: action.payload };

    case 'ADD_CLIENT':
      return {
        ...state,
        connectedClients: [...state.connectedClients, action.payload],
      };

    case 'SET_CURRENT_CLIENT':
      return { ...state, currentClientId: action.payload };

    case 'ADD_CLIENT_TODO': {
      const clients = state.connectedClients.map((client) => {
        if (client.shareCode === action.payload.clientId || client.id === action.payload.clientId) {
          const newTodo: TodoItem = {
            ...action.payload.todo,
            id: generateId(),
            createdAt: new Date().toISOString(),
          };
          return { ...client, todos: [...client.todos, newTodo] };
        }
        return client;
      });
      return { ...state, connectedClients: clients };
    }

    case 'TOGGLE_CLIENT_TODO': {
      const clients = state.connectedClients.map((client) => {
        if (client.shareCode === action.payload.clientId || client.id === action.payload.clientId) {
          const updatedTodos = client.todos.map((todo) =>
            todo.id === action.payload.todoId
              ? { ...todo, completed: !todo.completed }
              : todo
          );
          return { ...client, todos: updatedTodos };
        }
        return client;
      });
      return { ...state, connectedClients: clients };
    }

    case 'UPDATE_CLIENT_TODO_DESCRIPTION': {
      const clients = state.connectedClients.map((client) => {
        if (client.shareCode === action.payload.clientId || client.id === action.payload.clientId) {
          const updatedTodos = client.todos.map((todo) =>
            todo.id === action.payload.todoId
              ? { ...todo, description: action.payload.description }
              : todo
          );
          return { ...client, todos: updatedTodos };
        }
        return client;
      });
      return { ...state, connectedClients: clients };
    }

    case 'LOAD_STATE':
      return { ...state, ...action.payload, isLoading: false };

    case 'RESET_STATE':
      return { ...initialState, isLoading: false };

    // Case Manager Collaboration Reducers
    case 'SET_CM_CONNECTION':
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          connection: action.payload,
        },
      };

    case 'ADD_CM_MESSAGE': {
      const newMessage: CaseManagerMessage = {
        ...action.payload,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };
      const isFromCaseManager = action.payload.senderType === 'caseManager';
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          messages: [...state.caseManagerData.messages, newMessage],
          unreadMessages: isFromCaseManager
            ? state.caseManagerData.unreadMessages + 1
            : state.caseManagerData.unreadMessages,
        },
      };
    }

    case 'MARK_CM_MESSAGES_READ':
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          messages: state.caseManagerData.messages.map((msg) => ({ ...msg, read: true })),
          unreadMessages: 0,
        },
      };

    case 'ADD_CM_TASK': {
      const newTask: CaseManagerTask = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const pendingCount = action.payload.status === 'pending' || action.payload.status === 'in_progress'
        ? state.caseManagerData.pendingTasks + 1
        : state.caseManagerData.pendingTasks;
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          tasks: [...state.caseManagerData.tasks, newTask],
          pendingTasks: pendingCount,
        },
      };
    }

    case 'UPDATE_CM_TASK_STATUS': {
      const tasks = state.caseManagerData.tasks.map((task) =>
        task.id === action.payload.taskId
          ? {
              ...task,
              status: action.payload.status,
              completedAt: action.payload.status === 'completed' ? new Date().toISOString() : undefined,
            }
          : task
      );
      const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          tasks,
          pendingTasks,
        },
      };
    }

    case 'DELETE_CM_TASK': {
      const tasks = state.caseManagerData.tasks.filter((t) => t.id !== action.payload);
      const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          tasks,
          pendingTasks,
        },
      };
    }

    case 'ADD_CM_NOTE': {
      const newNote: CaseManagerNote = {
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        caseManagerData: {
          ...state.caseManagerData,
          notes: [...state.caseManagerData.notes, newNote],
        },
      };
    }

    case 'LOAD_CM_DATA':
      return {
        ...state,
        caseManagerData: action.payload,
      };

    default:
      return state;
  }
};

const createEmptyUserProfile = (): UserProfile => ({
  id: generateId(),
  name: '',
  immigrationStatus: 'prefer_not_to_say',
  location: { latitude: 0, longitude: 0 },
  selectedCategories: [],
  answers: [],
  todos: [],
  createdAt: new Date().toISOString(),
});

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  saveState: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved state on mount
  useEffect(() => {
    loadSavedState();
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (!state.isLoading) {
      saveState();
    }
  }, [state.userProfile, state.caseWorkerProfile, state.connectedClients, state.caseManagerData]);

  const loadSavedState = async () => {
    try {
      const [userProfileStr, caseWorkerStr, clientsStr, cmDataStr] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(CASEWORKER_PROFILE_KEY),
        AsyncStorage.getItem(CLIENTS_KEY),
        AsyncStorage.getItem(CASE_MANAGER_DATA_KEY),
      ]);

      const loadedState: Partial<AppState> = {};

      if (userProfileStr) {
        loadedState.userProfile = JSON.parse(userProfileStr);
        loadedState.userRole = 'individual';
      }

      if (caseWorkerStr) {
        loadedState.caseWorkerProfile = JSON.parse(caseWorkerStr);
        if (!loadedState.userRole) {
          loadedState.userRole = 'caseworker';
        }
      }

      if (clientsStr) {
        loadedState.connectedClients = JSON.parse(clientsStr);
      }

      if (cmDataStr) {
        loadedState.caseManagerData = JSON.parse(cmDataStr);
      }

      dispatch({ type: 'LOAD_STATE', payload: loadedState });
    } catch (error) {
      console.error('Error loading saved state:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveState = async () => {
    try {
      const promises: Promise<void>[] = [];

      if (state.userProfile) {
        promises.push(
          AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(state.userProfile))
        );
      }

      if (state.caseWorkerProfile) {
        promises.push(
          AsyncStorage.setItem(CASEWORKER_PROFILE_KEY, JSON.stringify(state.caseWorkerProfile))
        );
      }

      if (state.connectedClients.length > 0) {
        promises.push(
          AsyncStorage.setItem(CLIENTS_KEY, JSON.stringify(state.connectedClients))
        );
      }

      // Always save case manager data (even if empty, to ensure clean state)
      promises.push(
        AsyncStorage.setItem(CASE_MANAGER_DATA_KEY, JSON.stringify(state.caseManagerData))
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, saveState }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
