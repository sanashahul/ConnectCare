export type Language = 'en' | 'es';

export type UserRole = 'individual' | 'caseworker';

export type ServiceCategory = 'healthcare' | 'employment' | 'housing';

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
}

export interface QuestionAnswer {
  questionId: string;
  answer: string | string[];
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
}

export interface UserProfile {
  id: string;
  name: string;
  immigrationStatus: ImmigrationStatus;
  location: Location;
  selectedCategories: ServiceCategory[];
  answers: QuestionAnswer[];
  shareCode?: string;
  connectedCaseWorkerId?: string;
  todos: TodoItem[];
  createdAt: string;
}

export interface CaseWorkerProfile {
  id: string;
  name: string;
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
}
