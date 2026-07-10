export default {
  // Welcome Screen
  welcome: {
    title: 'ConnectCare',
    subtitle: 'Conectándote con la ayuda que necesitas',
    needServices: 'Necesito Servicios',
    needServicesDesc: 'Comenzar mi evaluación',
    aiCaseManager: 'AI Gestor de Caso',
    aiCaseManagerDesc: 'Tu guía personal 24/7',
    caseworker: 'Soy Trabajador Social',
    caseworkerDesc: 'Ingresar código',
    selectLanguage: 'Seleccionar Idioma',
  },

  // Onboarding
  onboarding: {
    next: 'Siguiente',
    back: 'Atrás',
    skip: 'Omitir',
    getStarted: 'Comenzar',

    // Name screen
    nameTitle: '¿Cuál es tu nombre?',
    nameSubtitle: 'Esto nos ayuda a personalizar tu experiencia',
    namePlaceholder: 'Ingresa tu nombre',
    preferAnonymous: 'Prefiero mantenerme anónimo',

    // Immigration screen
    immigrationTitle: 'Estado Migratorio',
    immigrationSubtitle: 'Esto nos ayuda a encontrar recursos disponibles para ti',
    immigrationNote: 'Tu información es privada y segura',
    citizen: 'Ciudadano de EE.UU.',
    permanentResident: 'Residente Permanente (Green Card)',
    visaHolder: 'Titular de Visa',
    undocumented: 'Indocumentado',
    asylumSeeker: 'Solicitante de Asilo / Refugiado',
    preferNotToSay: 'Prefiero no decir',

    // Location screen
    locationTitle: 'Tu Ubicación',
    locationSubtitle: 'Usamos esto para encontrar recursos cerca de ti',
    detectLocation: 'Usar Mi Ubicación Actual',
    enterManually: 'Ingresar Código Postal',
    zipPlaceholder: 'Ingresa código postal',
    locationDetected: 'Ubicación detectada',
    locationError: 'No se pudo detectar la ubicación',

    // Category selection
    categoryTitle: '¿En qué necesitas ayuda?',
    categorySubtitle: 'Selecciona todas las que apliquen',
    healthcare: 'Salud',
    healthcareDesc: 'Atención médica, salud mental, dental',
    employment: 'Empleo',
    employmentDesc: 'Búsqueda de trabajo, capacitación, ayuda con currículum',
    housing: 'Vivienda',
    housingDesc: 'Refugio, programas de vivienda, asistencia de renta',
    selectAtLeastOne: 'Por favor selecciona al menos una categoría',
  },

  // Questionnaire
  questionnaire: {
    title: 'Evaluación',
    progress: 'Pregunta {{current}} de {{total}}',
    category: {
      healthcare: 'Preguntas de Salud',
      employment: 'Preguntas de Empleo',
      housing: 'Preguntas de Vivienda',
    },
    yes: 'Sí',
    no: 'No',
    next: 'Siguiente',
    previous: 'Anterior',
    finish: 'Finalizar',
    selectOne: 'Selecciona una opción',
    selectAll: 'Selecciona todas las que apliquen',
    typeAnswer: 'Escribe tu respuesta',
  },

  // Dashboard
  dashboard: {
    title: 'Tu Panel',
    greeting: 'Hola, {{name}}',
    tabs: {
      resources: 'Recursos',
      todos: 'Lista de Tareas',
      caseworker: 'Trabajador Social',
    },
    resources: {
      healthcare: 'Recursos de Salud',
      employment: 'Recursos de Empleo',
      housing: 'Recursos de Vivienda',
      nearby: 'Cerca de ti',
      miles: 'millas',
      call: 'Llamar',
      directions: 'Direcciones',
      website: 'Sitio Web',
      noResults: 'No se encontraron recursos en tu área',
      loading: 'Buscando recursos cerca de ti...',
    },
    todos: {
      title: 'Tu Lista de Tareas',
      addNew: 'Agregar Nueva Tarea',
      empty: 'No hay tareas aún',
      emptyDesc: 'Las tareas tuyas o de tu trabajador social aparecerán aquí',
      markComplete: 'Marcar Completa',
      urgent: 'Urgente',
      dueDate: 'Fecha límite: {{date}}',
      addedBy: 'Agregada por {{name}}',
    },
    caseworker: {
      title: 'Trabajador Social',
      notConnected: 'Sin Trabajador Social Conectado',
      notConnectedDesc: 'Comparte tu código con un trabajador social para conectarte',
      yourCode: 'Tu Código',
      shareCode: 'Compartir Código',
      tapToCopy: 'Toca para copiar',
      codeCopied: '¡Código copiado!',
      connected: 'Conectado',
      connectedTo: 'Conectado con {{name}}',
      disconnect: 'Desconectar',
    },
  },

  // Case Worker Interface
  caseworker: {
    enterCode: 'Ingresar Código',
    enterCodeDesc: 'Ingresa el código compartido por tu cliente',
    codePlaceholder: 'ABC-123-XYZ',
    connect: 'Conectar',
    invalidCode: 'Código inválido. Por favor intenta de nuevo.',

    dashboard: {
      title: 'Panel del Trabajador Social',
      myClients: 'Mis Clientes',
      noClients: 'Sin Clientes Aún',
      noClientsDesc: 'Ingresa un código para conectarte con un cliente',
      addClient: 'Agregar Cliente',
      viewProfile: 'Ver Perfil',
    },

    clientDetail: {
      profile: 'Perfil',
      todos: 'Lista de Tareas',
      resources: 'Recursos',
      summary: 'Resumen de Evaluación',
      categories: 'Categorías Seleccionadas',
      location: 'Ubicación',
      immigrationStatus: 'Estado Migratorio',
      addTask: 'Agregar Tarea',
      taskTitle: 'Título de la Tarea',
      taskDescription: 'Descripción (opcional)',
      taskDueDate: 'Fecha Límite (opcional)',
      taskPriority: 'Prioridad',
      urgent: 'Urgente',
      normal: 'Normal',
      save: 'Guardar',
      cancel: 'Cancelar',
    },
  },

  // Common
  common: {
    loading: 'Cargando...',
    error: 'Algo salió mal',
    retry: 'Intentar de Nuevo',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    done: 'Listo',
    close: 'Cerrar',
    search: 'Buscar',
    filter: 'Filtrar',
    all: 'Todos',
    settings: 'Configuración',
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
  },
};
