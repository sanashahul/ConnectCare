export type Language = 'en' | 'es';

export type UserRole = 'individual' | 'caseworker';

export type ServiceCategory = 'healthcare' | 'employment' | 'housing';

export type TaskCategory = 'housing' | 'employment' | 'healthcare' | 'documents' | 'benefits' | 'education' | 'other';

export type ImmigrationStatus =
  | 'citizen'
  | 'permanent_resident'
  | 'visa_holder'
  | 'undocumented'
  | 'asylum_seeker'
  | 'prefer_not_to_say';

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  labelEs: string;
}

export interface Question {
  id: string;
  category: ServiceCategory;
  question: string;
  questionEs: string;
  type: 'single' | 'multiple' | 'text' | 'yesno';
  options?: QuestionOption[];
  // Short "why we ask" note shown to the user, so every question is
  // transparently tied to how Casy will help them.
  reason?: string;
  reasonEs?: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[];
}

// A single recommended action in the user's personalized plan.
export interface PlanRecommendation {
  title: string;
  why: string;
  resourceName?: string;
  address?: string;
  phone?: string;
  website?: string;
  action: string;
  category: TaskCategory;
}

// The personalized plan Casy generates from the user's questionnaire answers,
// grounded in real resources fetched for their location.
export interface PersonalizedPlan {
  summary: string;
  recommendations: PlanRecommendation[];
  language: 'en' | 'es';
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'urgent' | 'normal';
  completed: boolean;
  createdBy: 'individual' | 'caseworker';
  createdAt: string;
  // Resource linking for clickable to-do items
  resourceType?: 'job' | 'housing' | 'clinic';
  resourceUrl?: string;
  resourcePhone?: string;
  category?: TaskCategory;
}

export type AgeGroup = 'under18' | '18-24' | '25-54' | '55plus';

export interface UserProfile {
  id: string;
  name: string;
  pin?: string; // 4-digit PIN for app security
  age?: number;
  ageGroup?: AgeGroup;
  immigrationStatus: ImmigrationStatus;
  location: Location;
  selectedCategories: ServiceCategory[];
  answers: QuestionAnswer[];
  shareCode?: string;
  connectedCaseWorkerId?: string;
  todos: TodoItem[];
  createdAt: string;
  // Casy's personalized plan, generated after the questionnaire.
  recommendations?: PersonalizedPlan;
  planGeneratedAt?: string;
  // Indices of plan recommendations the user has marked done (progress).
  planProgress?: number[];
  // Resources Casy saved to the user's "For You" sections from chat.
  savedResources?: PlanRecommendation[];
  // Casy's personalized picks per tab (housing/employment/healthcare),
  // generated from the person's answers so each tab is specific to them.
  categoryPicks?: { [category: string]: PlanRecommendation[] };
}

export interface CaseWorkerProfile {
  id: string;
  name: string;
  pin?: string; // 4-digit PIN for app security
  email?: string;
  connectedClients: string[]; // Array of UserProfile IDs/share codes
  createdAt: string;
}

export interface Resource {
  id: string;
  name: string;
  category: ServiceCategory;
  address: string;
  phone?: string;
  website?: string;
  distance?: number;
  rating?: number;
  description?: string;
  services?: string[];
  lat: number;
  lng: number;
  hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  isOpen?: boolean;
  acceptsWalkIns?: boolean;
  languages?: string[];
}

// ============================================
// CASE MANAGER COLLABORATION TYPES
// ============================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface CaseManagerMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'caseManager';
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface CaseManagerTask {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignedBy: 'user' | 'caseManager';
  assignedByName: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface CaseManagerNote {
  id: string;
  title: string;
  content: string;
  createdBy: 'caseManager';
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
  isPrivate: boolean; // If true, only case manager can see
}

export interface CaseManagerConnection {
  id: string;
  caseManagerId: string;
  caseManagerName: string;
  caseManagerEmail?: string;
  connectedAt: string;
  status: 'pending' | 'active' | 'disconnected';
}

export interface CaseManagerData {
  connection: CaseManagerConnection | null;
  messages: CaseManagerMessage[];
  tasks: CaseManagerTask[];
  notes: CaseManagerNote[];
  unreadMessages: number;
  pendingTasks: number;
}
