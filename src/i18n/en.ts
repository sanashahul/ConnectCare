export default {
  // Welcome Screen
  welcome: {
    title: 'ConnectCare',
    subtitle: 'Connecting you to the care you need',
    needServices: 'I Need Services',
    needServicesDesc: 'Start your assessment',
    aiCaseManager: 'AI Case Manager',
    aiCaseManagerDesc: 'Your 24/7 personal guide',
    caseworker: "I'm a Case Worker",
    caseworkerDesc: 'Enter share code',
    selectLanguage: 'Select Language',
  },

  // Onboarding
  onboarding: {
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    getStarted: 'Get Started',

    // Name screen
    nameTitle: "What's your name?",
    nameSubtitle: 'This helps us personalize your experience',
    namePlaceholder: 'Enter your name',
    preferAnonymous: 'Prefer to stay anonymous',

    // Immigration screen
    immigrationTitle: 'Immigration Status',
    immigrationSubtitle: 'This helps us find resources available to you',
    immigrationNote: 'Your information is private and secure',
    citizen: 'U.S. Citizen',
    permanentResident: 'Permanent Resident (Green Card)',
    visaHolder: 'Visa Holder',
    undocumented: 'Undocumented',
    asylumSeeker: 'Asylum Seeker / Refugee',
    preferNotToSay: 'Prefer not to say',

    // Location screen
    locationTitle: 'Your Location',
    locationSubtitle: 'We use this to find resources near you',
    detectLocation: 'Use My Current Location',
    enterManually: 'Enter ZIP Code Instead',
    zipPlaceholder: 'Enter ZIP code',
    locationDetected: 'Location detected',
    locationError: 'Could not detect location',

    // Category selection
    categoryTitle: 'What do you need help with?',
    categorySubtitle: 'Select all that apply',
    healthcare: 'Healthcare',
    healthcareDesc: 'Medical care, mental health, dental',
    employment: 'Employment',
    employmentDesc: 'Job search, training, resume help',
    housing: 'Housing',
    housingDesc: 'Shelter, housing programs, rent assistance',
    selectAtLeastOne: 'Please select at least one category',
  },

  // Questionnaire
  questionnaire: {
    title: 'Assessment',
    progress: 'Question {{current}} of {{total}}',
    category: {
      healthcare: 'Healthcare Questions',
      employment: 'Employment Questions',
      housing: 'Housing Questions',
    },
    yes: 'Yes',
    no: 'No',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    selectOne: 'Select one',
    selectAll: 'Select all that apply',
    typeAnswer: 'Type your answer',
  },

  // Dashboard
  dashboard: {
    title: 'Your Dashboard',
    greeting: 'Hello, {{name}}',
    tabs: {
      resources: 'Resources',
      todos: 'To-Do List',
      caseworker: 'Case Worker',
    },
    resources: {
      healthcare: 'Healthcare Resources',
      employment: 'Employment Resources',
      housing: 'Housing Resources',
      nearby: 'Near you',
      miles: 'miles away',
      call: 'Call',
      directions: 'Directions',
      website: 'Website',
      noResults: 'No resources found in your area',
      loading: 'Finding resources near you...',
    },
    todos: {
      title: 'Your To-Do List',
      addNew: 'Add New Task',
      empty: 'No tasks yet',
      emptyDesc: 'Tasks from you or your case worker will appear here',
      markComplete: 'Mark Complete',
      urgent: 'Urgent',
      dueDate: 'Due: {{date}}',
      addedBy: 'Added by {{name}}',
    },
    caseworker: {
      title: 'Case Worker',
      notConnected: 'No Case Worker Connected',
      notConnectedDesc: 'Share your code with a case worker to connect',
      yourCode: 'Your Share Code',
      shareCode: 'Share Code',
      tapToCopy: 'Tap to copy',
      codeCopied: 'Code copied!',
      connected: 'Connected',
      connectedTo: 'Connected to {{name}}',
      disconnect: 'Disconnect',
    },
  },

  // Case Worker Interface
  caseworker: {
    enterCode: 'Enter Share Code',
    enterCodeDesc: 'Enter the code shared by your client',
    codePlaceholder: 'ABC-123-XYZ',
    connect: 'Connect',
    invalidCode: 'Invalid code. Please try again.',

    dashboard: {
      title: 'Case Worker Dashboard',
      myClients: 'My Clients',
      noClients: 'No Clients Yet',
      noClientsDesc: 'Enter a share code to connect with a client',
      addClient: 'Add Client',
      viewProfile: 'View Profile',
    },

    clientDetail: {
      profile: 'Profile',
      todos: 'To-Do List',
      resources: 'Resources',
      summary: 'Assessment Summary',
      categories: 'Selected Categories',
      location: 'Location',
      immigrationStatus: 'Immigration Status',
      addTask: 'Add Task',
      taskTitle: 'Task Title',
      taskDescription: 'Description (optional)',
      taskDueDate: 'Due Date (optional)',
      taskPriority: 'Priority',
      urgent: 'Urgent',
      normal: 'Normal',
      save: 'Save',
      cancel: 'Cancel',
    },
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Try Again',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
  },
};
