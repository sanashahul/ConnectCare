import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { UserProfile, ServiceCategory, TodoItem, TaskCategory } from '../../types';

const TASK_CATEGORIES: { id: TaskCategory; label: string; icon: string }[] = [
  { id: 'housing', label: 'Housing', icon: '🏠' },
  { id: 'employment', label: 'Jobs', icon: '💼' },
  { id: 'healthcare', label: 'Health', icon: '🏥' },
  { id: 'documents', label: 'Docs', icon: '📄' },
  { id: 'benefits', label: 'Benefits', icon: '💳' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'other', label: 'Other', icon: '📌' },
];

// Demo client data - in a real app this would come from an API
const DEMO_CLIENTS: Record<string, UserProfile> = {
  'ABC-123-XYZ': {
    id: 'demo1',
    name: 'John D.',
    immigrationStatus: 'citizen',
    location: { latitude: 40.7128, longitude: -74.006, city: 'New York', state: 'NY' },
    selectedCategories: ['healthcare', 'housing'],
    answers: [
      { questionId: 'health_1', answer: 'no' },
      { questionId: 'health_5', answer: 'yes' },
      { questionId: 'housing_1', answer: 'shelter' },
      { questionId: 'housing_3', answer: 'yes' },
    ],
    shareCode: 'ABC-123-XYZ',
    todos: [
      {
        id: '1',
        title: 'Apply for Medicaid',
        priority: 'urgent',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Visit VA office for housing voucher',
        priority: 'normal',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  'DEF-456-UVW': {
    id: 'demo2',
    name: 'Maria S.',
    immigrationStatus: 'permanent_resident',
    location: { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', state: 'CA' },
    selectedCategories: ['employment', 'housing'],
    answers: [
      { questionId: 'employ_1', answer: 'unemployed' },
      { questionId: 'employ_3', answer: 'yes' },
      { questionId: 'housing_1', answer: 'temp' },
    ],
    shareCode: 'DEF-456-UVW',
    todos: [
      {
        id: '3',
        title: 'Attend job fair on Friday',
        priority: 'urgent',
        completed: false,
        createdBy: 'caseworker',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
};

// Personal to-do type for case manager
interface PersonalTodo {
  id: string;
  title: string;
  clientId?: string; // Optional - link to a specific client
  clientName?: string;
  priority: 'urgent' | 'normal';
  completed: boolean;
  createdAt: string;
}

export const CaseWorkerDashboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [mainView, setMainView] = useState<'clients' | 'mytasks'>('clients');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'todos' | 'messages' | 'notes' | 'profile'>('todos');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'normal' | 'urgent'>('normal');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('other');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientCode, setNewClientCode] = useState('');
  const [addClientError, setAddClientError] = useState('');
  const [addClientLoading, setAddClientLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);
  const messagesScrollRef = useRef<ScrollView>(null);

  // Personal to-dos state
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>([
    {
      id: 'p1',
      title: 'Review housing applications',
      priority: 'urgent',
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'p2',
      title: 'Call county benefits office',
      priority: 'normal',
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [showAddPersonalTodo, setShowAddPersonalTodo] = useState(false);
  const [newPersonalTodoTitle, setNewPersonalTodoTitle] = useState('');
  const [newPersonalTodoPriority, setNewPersonalTodoPriority] = useState<'normal' | 'urgent'>('normal');
  const [newPersonalTodoClient, setNewPersonalTodoClient] = useState<string | null>(null);

  const clients = state.connectedClients;
  const caseWorkerName = state.caseWorkerProfile?.name || 'Case Worker';

  const getCategoryLabel = (category: ServiceCategory): string => {
    const labels: Record<ServiceCategory, string> = {
      healthcare: i18n.language === 'es' ? 'Salud' : 'Healthcare',
      employment: i18n.language === 'es' ? 'Empleo' : 'Employment',
      housing: i18n.language === 'es' ? 'Vivienda' : 'Housing',
    };
    return labels[category];
  };

  const getImmigrationLabel = (status: string): string => {
    const labels: Record<string, string> = {
      citizen: 'U.S. Citizen',
      permanent_resident: 'Permanent Resident',
      visa_holder: 'Visa Holder',
      undocumented: 'Undocumented',
      asylum_seeker: 'Asylum Seeker',
      prefer_not_to_say: 'Not disclosed',
    };
    return labels[status] || status;
  };

  const handleAddTask = () => {
    if (!selectedClient || !newTaskTitle.trim()) return;

    dispatch({
      type: 'ADD_CLIENT_TODO',
      payload: {
        clientId: selectedClient.shareCode || selectedClient.id,
        todo: {
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          category: newTaskCategory,
          completed: false,
          createdBy: 'caseworker',
        },
      },
    });

    setNewTaskTitle('');
    setNewTaskPriority('normal');
    setNewTaskCategory('other');
    setShowAddTask(false);
  };

  const handleToggleTodo = (todoId: string) => {
    if (!selectedClient) return;

    dispatch({
      type: 'TOGGLE_CLIENT_TODO',
      payload: {
        clientId: selectedClient.shareCode || selectedClient.id,
        todoId,
      },
    });
  };

  const formatShareCode = (text: string): string => {
    // Remove non-alphanumeric characters and uppercase
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Add dashes
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 9; i++) {
      if (i > 0 && i % 3 === 0) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handleAddClient = () => {
    const formattedCode = newClientCode.toUpperCase().trim();

    if (formattedCode.length < 11) {
      setAddClientError('Please enter a valid share code (e.g., ABC-123-XYZ)');
      return;
    }

    // Check if client already added
    const alreadyAdded = clients.some(c => c.shareCode === formattedCode);
    if (alreadyAdded) {
      setAddClientError('This client is already in your list');
      return;
    }

    setAddClientLoading(true);
    setAddClientError('');

    // Simulate API call to find client
    setTimeout(() => {
      const client = DEMO_CLIENTS[formattedCode];

      if (client) {
        dispatch({ type: 'ADD_CLIENT', payload: client });
        setShowAddClient(false);
        setNewClientCode('');
        setAddClientError('');
        Alert.alert('Success', `${client.name} has been added to your clients!`);
      } else {
        // For demo, also accept any properly formatted code
        if (/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(formattedCode)) {
          // Create a demo client with the entered code
          const newClient: UserProfile = {
            id: Date.now().toString(36),
            name: 'New Client',
            immigrationStatus: 'prefer_not_to_say',
            location: { latitude: 0, longitude: 0 },
            selectedCategories: ['healthcare'],
            answers: [],
            shareCode: formattedCode,
            todos: [],
            createdAt: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_CLIENT', payload: newClient });
          setShowAddClient(false);
          setNewClientCode('');
          setAddClientError('');
          Alert.alert('Success', 'Client has been added to your list!');
        } else {
          setAddClientError('Invalid code format. Please try again.');
        }
      }
      setAddClientLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!selectedClient || !messageInput.trim()) return;

    // In a real app, this would send to the user's CaseManagerData
    // For now, we'll show an alert since we need backend sync
    Alert.alert(
      'Message Sent',
      `Your message to ${selectedClient.name} has been sent.`,
      [{ text: 'OK' }]
    );
    setMessageInput('');
  };

  const handleAddNote = () => {
    if (!selectedClient || !newNote.trim()) return;

    Alert.alert(
      'Note Added',
      'Your note has been saved.',
      [{ text: 'OK' }]
    );
    setNewNote('');
    setShowAddNote(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAddPersonalTodo = () => {
    if (!newPersonalTodoTitle.trim()) return;

    const selectedClientData = newPersonalTodoClient
      ? clients.find(c => c.id === newPersonalTodoClient || c.shareCode === newPersonalTodoClient)
      : null;

    const newTodo: PersonalTodo = {
      id: Date.now().toString(36),
      title: newPersonalTodoTitle.trim(),
      clientId: newPersonalTodoClient || undefined,
      clientName: selectedClientData?.name,
      priority: newPersonalTodoPriority,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setPersonalTodos([newTodo, ...personalTodos]);
    setNewPersonalTodoTitle('');
    setNewPersonalTodoPriority('normal');
    setNewPersonalTodoClient(null);
    setShowAddPersonalTodo(false);
  };

  const handleTogglePersonalTodo = (todoId: string) => {
    setPersonalTodos(personalTodos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDeletePersonalTodo = (todoId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setPersonalTodos(personalTodos.filter(t => t.id !== todoId)),
        },
      ]
    );
  };

  const renderMyTasks = () => {
    const pendingTodos = personalTodos.filter(t => !t.completed);
    const completedTodos = personalTodos.filter(t => t.completed);

    // Group by client
    const todosByClient: Record<string, PersonalTodo[]> = { 'general': [] };
    pendingTodos.forEach(todo => {
      if (todo.clientId && todo.clientName) {
        if (!todosByClient[todo.clientId]) {
          todosByClient[todo.clientId] = [];
        }
        todosByClient[todo.clientId].push(todo);
      } else {
        todosByClient['general'].push(todo);
      }
    });

    return (
      <ScrollView style={styles.myTasksContainer}>
        <TouchableOpacity
          style={styles.addPersonalTodoButton}
          onPress={() => setShowAddPersonalTodo(true)}
        >
          <Text style={styles.addPersonalTodoText}>+ Add Personal Task</Text>
        </TouchableOpacity>

        {/* General tasks (not linked to a client) */}
        {todosByClient['general'].length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.taskSectionTitle}>📋 General Tasks</Text>
            {todosByClient['general'].map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={styles.personalTodoItem}
                onPress={() => handleTogglePersonalTodo(todo.id)}
                onLongPress={() => handleDeletePersonalTodo(todo.id)}
              >
                <View style={styles.todoCheckbox}>
                  <View style={styles.checkbox} />
                </View>
                <View style={styles.todoContent}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  {todo.priority === 'urgent' && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>Urgent</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tasks grouped by client */}
        {Object.entries(todosByClient)
          .filter(([key]) => key !== 'general')
          .map(([clientId, todos]) => {
            const client = clients.find(c => c.id === clientId || c.shareCode === clientId);
            return (
              <View key={clientId} style={styles.taskSection}>
                <View style={styles.clientTaskHeader}>
                  <View style={styles.clientTaskAvatar}>
                    <Text style={styles.clientTaskAvatarText}>
                      {client?.name.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.taskSectionTitle}>{client?.name || 'Client'}</Text>
                </View>
                {todos.map(todo => (
                  <TouchableOpacity
                    key={todo.id}
                    style={styles.personalTodoItem}
                    onPress={() => handleTogglePersonalTodo(todo.id)}
                    onLongPress={() => handleDeletePersonalTodo(todo.id)}
                  >
                    <View style={styles.todoCheckbox}>
                      <View style={styles.checkbox} />
                    </View>
                    <View style={styles.todoContent}>
                      <Text style={styles.todoTitle}>{todo.title}</Text>
                      {todo.priority === 'urgent' && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentText}>Urgent</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}

        {/* Completed tasks */}
        {completedTodos.length > 0 && (
          <View style={styles.taskSection}>
            <Text style={styles.completedHeader}>Completed ({completedTodos.length})</Text>
            {completedTodos.map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.personalTodoItem, styles.todoItemCompleted]}
                onPress={() => handleTogglePersonalTodo(todo.id)}
                onLongPress={() => handleDeletePersonalTodo(todo.id)}
              >
                <View style={styles.todoCheckbox}>
                  <View style={[styles.checkbox, styles.checkboxChecked]}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                </View>
                <View style={styles.todoContent}>
                  <Text style={[styles.todoTitle, styles.todoTitleCompleted]}>{todo.title}</Text>
                  {todo.clientName && (
                    <Text style={styles.todoClientName}>For: {todo.clientName}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {pendingTodos.length === 0 && completedTodos.length === 0 && (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No personal tasks</Text>
            <Text style={styles.emptySubtitle}>Add tasks to track your work for clients</Text>
          </View>
        )}

        <Text style={styles.taskHint}>Long press to delete a task</Text>
      </ScrollView>
    );
  };

  const renderClientsList = () => (
    <View style={styles.clientsList}>
      <View style={styles.clientsHeader}>
        <Text style={styles.clientsTitle}>{t('caseworker.dashboard.myClients')}</Text>
        <TouchableOpacity
          style={styles.addClientButton}
          onPress={() => setShowAddClient(true)}
        >
          <Text style={styles.addClientText}>+ {t('caseworker.dashboard.addClient')}</Text>
        </TouchableOpacity>
      </View>

      {clients.length === 0 ? (
        <View style={styles.emptyClients}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>{t('caseworker.dashboard.noClients')}</Text>
          <Text style={styles.emptySubtitle}>{t('caseworker.dashboard.noClientsDesc')}</Text>
        </View>
      ) : (
        clients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={[
              styles.clientCard,
              selectedClient?.id === client.id && styles.clientCardSelected,
            ]}
            onPress={() => setSelectedClient(client)}
          >
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientLocation}>
                {client.location.city && client.location.state
                  ? `${client.location.city}, ${client.location.state}`
                  : 'Location not set'}
              </Text>
              <View style={styles.clientCategories}>
                {client.selectedCategories.map((cat) => (
                  <View key={cat} style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{getCategoryLabel(cat)}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.clientTodoCount}>
              <Text style={styles.todoCountNumber}>
                {client.todos.filter((t) => !t.completed).length}
              </Text>
              <Text style={styles.todoCountLabel}>tasks</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderClientDetail = () => {
    if (!selectedClient) return null;

    const pendingTodos = selectedClient.todos.filter((t) => !t.completed);
    const completedTodos = selectedClient.todos.filter((t) => t.completed);

    // Find the updated client from state
    const currentClient = clients.find(
      (c) => c.id === selectedClient.id || c.shareCode === selectedClient.shareCode
    ) || selectedClient;

    return (
      <View style={styles.clientDetail}>
        {/* Client Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedClient(null)}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailName}>{currentClient.name}</Text>
            <Text style={styles.detailCode}>Code: {currentClient.shareCode}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.detailTabs}>
          <TouchableOpacity
            style={[styles.detailTab, activeTab === 'todos' && styles.detailTabActive]}
            onPress={() => setActiveTab('todos')}
          >
            <Text style={[styles.detailTabText, activeTab === 'todos' && styles.detailTabTextActive]}>
              📋 Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailTab, activeTab === 'messages' && styles.detailTabActive]}
            onPress={() => setActiveTab('messages')}
          >
            <Text style={[styles.detailTabText, activeTab === 'messages' && styles.detailTabTextActive]}>
              💬 Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailTab, activeTab === 'notes' && styles.detailTabActive]}
            onPress={() => setActiveTab('notes')}
          >
            <Text style={[styles.detailTabText, activeTab === 'notes' && styles.detailTabTextActive]}>
              📝 Notes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailTab, activeTab === 'profile' && styles.detailTabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.detailTabText, activeTab === 'profile' && styles.detailTabTextActive]}>
              👤 Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.detailContent}>
          {activeTab === 'todos' && (
            <View>
              <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => setShowAddTask(true)}
              >
                <Text style={styles.addTaskText}>+ {t('caseworker.clientDetail.addTask')}</Text>
              </TouchableOpacity>

              {currentClient.todos.filter((t) => !t.completed).map((todo) => (
                <TouchableOpacity
                  key={todo.id}
                  style={styles.todoItem}
                  onPress={() => handleToggleTodo(todo.id)}
                >
                  <View style={styles.todoCheckbox}>
                    <View style={styles.checkbox} />
                  </View>
                  <View style={styles.todoContent}>
                    <Text style={styles.todoTitle}>{todo.title}</Text>
                    <View style={styles.todoMeta}>
                      {todo.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {TASK_CATEGORIES.find(c => c.id === todo.category)?.icon}{' '}
                            {TASK_CATEGORIES.find(c => c.id === todo.category)?.label}
                          </Text>
                        </View>
                      )}
                      {todo.priority === 'urgent' && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentText}>Urgent</Text>
                        </View>
                      )}
                      <Text style={styles.todoCreator}>
                        Added by {todo.createdBy === 'caseworker' ? 'you' : 'client'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {currentClient.todos.filter((t) => t.completed).length > 0 && (
                <>
                  <Text style={styles.completedHeader}>Completed</Text>
                  {currentClient.todos.filter((t) => t.completed).map((todo) => (
                    <TouchableOpacity
                      key={todo.id}
                      style={[styles.todoItem, styles.todoItemCompleted]}
                      onPress={() => handleToggleTodo(todo.id)}
                    >
                      <View style={styles.todoCheckbox}>
                        <View style={[styles.checkbox, styles.checkboxChecked]}>
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                      </View>
                      <View style={styles.todoContent}>
                        <Text style={[styles.todoTitle, styles.todoTitleCompleted]}>
                          {todo.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === 'messages' && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.messagesContainer}
            >
              <ScrollView
                ref={messagesScrollRef}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
              >
                {/* Demo messages */}
                <View style={styles.messageDate}>
                  <Text style={styles.messageDateText}>Today</Text>
                </View>
                <View style={[styles.messageBubble, styles.messageBubbleClient]}>
                  <Text style={styles.messageText}>Hi, I have a question about my housing application.</Text>
                  <Text style={styles.messageTime}>9:30 AM</Text>
                </View>
                <View style={[styles.messageBubble, styles.messageBubbleCM]}>
                  <Text style={[styles.messageText, styles.messageTextCM]}>Of course! What would you like to know?</Text>
                  <Text style={[styles.messageTime, styles.messageTimeCM]}>9:32 AM</Text>
                </View>
                <View style={styles.emptyMessages}>
                  <Text style={styles.emptyMessagesText}>
                    Messages sync with the client's app in real-time
                  </Text>
                </View>
              </ScrollView>
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  value={messageInput}
                  onChangeText={setMessageInput}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}

          {activeTab === 'notes' && (
            <View style={styles.notesContainer}>
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={() => setShowAddNote(true)}
              >
                <Text style={styles.addNoteText}>+ Add Note</Text>
              </TouchableOpacity>

              {/* Demo notes */}
              <View style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>Initial Assessment</Text>
                  <Text style={styles.noteDate}>Dec 15</Text>
                </View>
                <Text style={styles.noteContent}>
                  Client is stable but needs assistance with housing voucher application.
                  Follow up next week on document collection.
                </Text>
              </View>
              <View style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>Housing Progress</Text>
                  <Text style={styles.noteDate}>Dec 10</Text>
                </View>
                <Text style={styles.noteContent}>
                  Submitted Section 8 application. Waiting list estimated 3-6 months.
                </Text>
              </View>

              <Text style={styles.notesInfo}>
                Notes are visible to the client in their app
              </Text>
            </View>
          )}

          {activeTab === 'profile' && (
            <View style={styles.profileContent}>
              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>
                  {t('caseworker.clientDetail.categories')}
                </Text>
                <View style={styles.profileCategories}>
                  {currentClient.selectedCategories.map((cat) => (
                    <View key={cat} style={styles.profileCategoryBadge}>
                      <Text style={styles.profileCategoryText}>{getCategoryLabel(cat)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>{t('caseworker.clientDetail.location')}</Text>
                <Text style={styles.profileValue}>
                  {currentClient.location.city && currentClient.location.state
                    ? `${currentClient.location.city}, ${currentClient.location.state}`
                    : 'Not set'}
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>
                  {t('caseworker.clientDetail.immigrationStatus')}
                </Text>
                <Text style={styles.profileValue}>
                  {getImmigrationLabel(currentClient.immigrationStatus)}
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileLabel}>
                  {t('caseworker.clientDetail.summary')}
                </Text>
                <Text style={styles.profileValue}>
                  {currentClient.answers.length} questions answered
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Add Task Modal */}
        <Modal visible={showAddTask} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('caseworker.clientDetail.addTask')}</Text>

              <TextInput
                style={styles.modalInput}
                placeholder={t('caseworker.clientDetail.taskTitle')}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {TASK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      newTaskCategory === cat.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => setNewTaskCategory(cat.id)}
                  >
                    <Text style={styles.categoryOptionIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryOptionText,
                        newTaskCategory === cat.id && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>{t('caseworker.clientDetail.taskPriority')}</Text>
              <View style={styles.priorityButtons}>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    newTaskPriority === 'normal' && styles.priorityButtonActive,
                  ]}
                  onPress={() => setNewTaskPriority('normal')}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      newTaskPriority === 'normal' && styles.priorityButtonTextActive,
                    ]}
                  >
                    {t('caseworker.clientDetail.normal')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    styles.priorityButtonUrgent,
                    newTaskPriority === 'urgent' && styles.priorityButtonUrgentActive,
                  ]}
                  onPress={() => setNewTaskPriority('urgent')}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      newTaskPriority === 'urgent' && styles.priorityButtonTextUrgentActive,
                    ]}
                  >
                    {t('caseworker.clientDetail.urgent')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowAddTask(false);
                    setNewTaskTitle('');
                    setNewTaskCategory('other');
                  }}
                >
                  <Text style={styles.modalCancelText}>{t('caseworker.clientDetail.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    !newTaskTitle.trim() && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                >
                  <Text style={styles.modalSaveText}>{t('caseworker.clientDetail.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {caseWorkerName}</Text>
        <Text style={styles.title}>{t('caseworker.dashboard.title')}</Text>
      </View>

      {/* Main Tab Bar */}
      {!selectedClient && (
        <View style={styles.mainTabBar}>
          <TouchableOpacity
            style={[styles.mainTab, mainView === 'clients' && styles.mainTabActive]}
            onPress={() => setMainView('clients')}
          >
            <Text style={[styles.mainTabText, mainView === 'clients' && styles.mainTabTextActive]}>
              👥 My Clients
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, mainView === 'mytasks' && styles.mainTabActive]}
            onPress={() => setMainView('mytasks')}
          >
            <Text style={[styles.mainTabText, mainView === 'mytasks' && styles.mainTabTextActive]}>
              ✓ My Tasks
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {selectedClient
        ? renderClientDetail()
        : mainView === 'clients'
          ? renderClientsList()
          : renderMyTasks()}

      {/* Add Client Modal */}
      <Modal visible={showAddClient} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <Text style={styles.addClientDescription}>
              Enter the client's share code to connect with them
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="ABC-123-XYZ"
              value={newClientCode}
              onChangeText={(text) => {
                setNewClientCode(formatShareCode(text));
                setAddClientError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              autoFocus
            />

            {addClientError ? (
              <Text style={styles.addClientError}>{addClientError}</Text>
            ) : null}

            <View style={styles.demoHint}>
              <Text style={styles.demoHintTitle}>Demo codes to try:</Text>
              <Text style={styles.demoCode}>ABC-123-XYZ</Text>
              <Text style={styles.demoCode}>DEF-456-UVW</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddClient(false);
                  setNewClientCode('');
                  setAddClientError('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  (newClientCode.length < 11 || addClientLoading) && styles.modalSaveButtonDisabled,
                ]}
                onPress={handleAddClient}
                disabled={newClientCode.length < 11 || addClientLoading}
              >
                <Text style={styles.modalSaveText}>
                  {addClientLoading ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Personal Todo Modal */}
      <Modal visible={showAddPersonalTodo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Personal Task</Text>
            <Text style={styles.addClientDescription}>
              Track your own to-dos for client support
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="What do you need to do?"
              value={newPersonalTodoTitle}
              onChangeText={setNewPersonalTodoTitle}
              autoFocus
            />

            <Text style={styles.modalLabel}>Link to Client (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
              <TouchableOpacity
                style={[
                  styles.clientSelectorItem,
                  !newPersonalTodoClient && styles.clientSelectorItemActive,
                ]}
                onPress={() => setNewPersonalTodoClient(null)}
              >
                <Text style={[
                  styles.clientSelectorText,
                  !newPersonalTodoClient && styles.clientSelectorTextActive,
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientSelectorItem,
                    newPersonalTodoClient === client.id && styles.clientSelectorItemActive,
                  ]}
                  onPress={() => setNewPersonalTodoClient(client.id)}
                >
                  <Text style={[
                    styles.clientSelectorText,
                    newPersonalTodoClient === client.id && styles.clientSelectorTextActive,
                  ]}>
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.priorityButtons}>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  newPersonalTodoPriority === 'normal' && styles.priorityButtonActive,
                ]}
                onPress={() => setNewPersonalTodoPriority('normal')}
              >
                <Text style={[
                  styles.priorityButtonText,
                  newPersonalTodoPriority === 'normal' && styles.priorityButtonTextActive,
                ]}>
                  Normal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  styles.priorityButtonUrgent,
                  newPersonalTodoPriority === 'urgent' && styles.priorityButtonUrgentActive,
                ]}
                onPress={() => setNewPersonalTodoPriority('urgent')}
              >
                <Text style={[
                  styles.priorityButtonText,
                  newPersonalTodoPriority === 'urgent' && styles.priorityButtonTextUrgentActive,
                ]}>
                  Urgent
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddPersonalTodo(false);
                  setNewPersonalTodoTitle('');
                  setNewPersonalTodoClient(null);
                  setNewPersonalTodoPriority('normal');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  !newPersonalTodoTitle.trim() && styles.modalSaveButtonDisabled,
                ]}
                onPress={handleAddPersonalTodo}
                disabled={!newPersonalTodoTitle.trim()}
              >
                <Text style={styles.modalSaveText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  // Main Tab Bar Styles
  mainTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 12,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  mainTabActive: {
    backgroundColor: '#0D9488',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  mainTabTextActive: {
    color: '#FFFFFF',
  },
  // My Tasks Styles
  myTasksContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  addPersonalTodoButton: {
    backgroundColor: '#0D9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addPersonalTodoText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  taskSection: {
    marginBottom: 20,
  },
  taskSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  clientTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientTaskAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  clientTaskAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  personalTodoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  todoClientName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyTasks: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  taskHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
    fontStyle: 'italic',
  },
  // Client Selector Styles
  clientSelector: {
    marginBottom: 16,
  },
  clientSelectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  clientSelectorItemActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  clientSelectorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  clientSelectorTextActive: {
    color: '#0D9488',
    fontWeight: '600',
  },
  clientsList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  clientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addClientButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addClientText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyClients: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientCardSelected: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clientLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  clientCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  clientTodoCount: {
    alignItems: 'center',
    marginLeft: 12,
  },
  todoCountNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  todoCountLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  clientDetail: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backArrow: {
    fontSize: 24,
    color: '#2563EB',
    marginRight: 16,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  detailTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  detailTabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailTabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  detailContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  addTaskButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  todoItemCompleted: {
    opacity: 0.6,
  },
  todoCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    color: '#1F2937',
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  todoCreator: {
    fontSize: 12,
    color: '#6B7280',
  },
  completedHeader: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 12,
  },
  profileContent: {
    paddingBottom: 24,
  },
  profileSection: {
    marginBottom: 24,
  },
  profileLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  profileCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileCategoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileCategoryText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  priorityButtonUrgent: {
    borderColor: '#E5E7EB',
  },
  priorityButtonUrgentActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  priorityButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  priorityButtonTextUrgentActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Category Selection Styles
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryOptionActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  categoryOptionIcon: {
    fontSize: 16,
  },
  categoryOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryOptionTextActive: {
    color: '#0D9488',
    fontWeight: '600',
  },
  // Messages Tab Styles
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageDate: {
    alignItems: 'center',
    marginVertical: 16,
  },
  messageDateText: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  messageBubbleClient: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageBubbleCM: {
    alignSelf: 'flex-end',
    backgroundColor: '#0D9488',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 20,
  },
  messageTextCM: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  messageTimeCM: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyMessages: {
    alignItems: 'center',
    marginTop: 32,
    padding: 20,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  messageInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  // Notes Tab Styles
  notesContainer: {
    flex: 1,
  },
  addNoteButton: {
    backgroundColor: '#0D9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addNoteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  noteDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  notesInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  // Add Client Modal Styles
  addClientDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  addClientError: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  demoHint: {
    marginTop: 24,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  demoHintTitle: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
  },
  demoCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350F',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
