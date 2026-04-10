import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import * as Clipboard from 'expo-clipboard';
import { seedDemoCaseManager } from '../../utils/seedDemoCaseManager';
import {
  CaseManagerMessage,
  CaseManagerTask,
  CaseManagerNote,
  TaskCategory,
  TaskStatus,
} from '../../types';

type CaseManagerScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

type TabType = 'messages' | 'tasks' | 'notes' | 'connect';

const TASK_CATEGORIES: { id: TaskCategory; label: string; labelEs: string; icon: string }[] = [
  { id: 'housing', label: 'Housing', labelEs: 'Vivienda', icon: '🏠' },
  { id: 'employment', label: 'Employment', labelEs: 'Empleo', icon: '💼' },
  { id: 'healthcare', label: 'Healthcare', labelEs: 'Salud', icon: '🏥' },
  { id: 'documents', label: 'Documents', labelEs: 'Documentos', icon: '📄' },
  { id: 'benefits', label: 'Benefits', labelEs: 'Beneficios', icon: '💳' },
  { id: 'education', label: 'Education', labelEs: 'Educación', icon: '📚' },
  { id: 'other', label: 'Other', labelEs: 'Otro', icon: '📌' },
];

export const CaseManagerScreen: React.FC<CaseManagerScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('connect');
  const [messageInput, setMessageInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<CaseManagerTask | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('other');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const scrollViewRef = useRef<ScrollView>(null);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;
  const cmData = state.caseManagerData;
  const isConnected = cmData.connection?.status === 'active';

  // Mark messages as read when viewing messages tab
  useEffect(() => {
    if (activeTab === 'messages' && cmData.unreadMessages > 0) {
      dispatch({ type: 'MARK_CM_MESSAGES_READ' });
    }
  }, [activeTab]);

  const handleCopyCode = async () => {
    if (userProfile?.shareCode) {
      await Clipboard.setStringAsync(userProfile.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    dispatch({
      type: 'ADD_CM_MESSAGE',
      payload: {
        senderId: userProfile?.id || '',
        senderType: 'user',
        senderName: userProfile?.name || 'You',
        content: messageInput.trim(),
        read: true,
      },
    });

    setMessageInput('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleToggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    dispatch({
      type: 'UPDATE_CM_TASK_STATUS',
      payload: { taskId, status: newStatus },
    });
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    dispatch({
      type: 'ADD_CM_TASK',
      payload: {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        category: newTaskCategory,
        status: 'pending',
        priority: newTaskPriority,
        assignedBy: 'user',
        assignedByName: userProfile?.name || 'You',
      },
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskCategory('other');
    setNewTaskPriority('medium');
    setShowAddTask(false);
  };

  const getFilteredTasks = () => {
    if (selectedCategory === 'all') {
      return cmData.tasks;
    }
    return cmData.tasks.filter((task) => task.category === selectedCategory);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(isSpanish ? 'es' : 'en', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return isSpanish ? 'Ayer' : 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(isSpanish ? 'es' : 'en', { weekday: 'short' });
    }
    return date.toLocaleDateString(isSpanish ? 'es' : 'en', { month: 'short', day: 'numeric' });
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'connect' && styles.tabActive]}
        onPress={() => setActiveTab('connect')}
      >
        <Text style={styles.tabIcon}>🔗</Text>
        <Text style={[styles.tabText, activeTab === 'connect' && styles.tabTextActive]}>
          {isSpanish ? 'Conectar' : 'Connect'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
        onPress={() => setActiveTab('messages')}
      >
        <Text style={styles.tabIcon}>💬</Text>
        <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
          {isSpanish ? 'Mensajes' : 'Messages'}
        </Text>
        {cmData.unreadMessages > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cmData.unreadMessages}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
        onPress={() => setActiveTab('tasks')}
      >
        <Text style={styles.tabIcon}>✅</Text>
        <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
          {isSpanish ? 'Tareas' : 'Tasks'}
        </Text>
        {cmData.pendingTasks > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cmData.pendingTasks}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
        onPress={() => setActiveTab('notes')}
      >
        <Text style={styles.tabIcon}>📝</Text>
        <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
          {isSpanish ? 'Notas' : 'Notes'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnectTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Connection Status */}
      <View style={[styles.statusCard, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
        <Text style={styles.statusIcon}>{isConnected ? '✓' : '○'}</Text>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>
            {isConnected
              ? (isSpanish ? 'Conectado' : 'Connected')
              : (isSpanish ? 'No Conectado' : 'Not Connected')}
          </Text>
          {isConnected && cmData.connection && (
            <Text style={styles.statusSubtitle}>
              {cmData.connection.caseManagerName}
            </Text>
          )}
        </View>
      </View>

      {/* Share Code Section */}
      <View style={styles.shareCodeSection}>
        <Text style={styles.sectionTitle}>
          {isSpanish ? 'Tu Código de Conexión' : 'Your Connection Code'}
        </Text>
        <Text style={styles.sectionDescription}>
          {isSpanish
            ? 'Comparte este código con tu gestor de caso para que puedan conectarse contigo.'
            : 'Share this code with your case manager so they can connect with you.'}
        </Text>

        <TouchableOpacity style={styles.shareCodeCard} onPress={handleCopyCode}>
          <Text style={styles.shareCode}>{userProfile?.shareCode || '---'}</Text>
          <View style={styles.copyButton}>
            <Text style={styles.copyButtonText}>
              {codeCopied ? '✓' : (isSpanish ? 'Copiar' : 'Copy')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <View style={styles.howItWorksSection}>
        <Text style={styles.sectionTitle}>
          {isSpanish ? 'Cómo Funciona' : 'How It Works'}
        </Text>
        <View style={styles.stepsList}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              {isSpanish
                ? 'Comparte tu código con tu gestor de caso'
                : 'Share your code with your case manager'}
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              {isSpanish
                ? 'Ellos ingresan el código en su app'
                : 'They enter the code in their app'}
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              {isSpanish
                ? 'Pueden enviar mensajes y asignarte tareas'
                : 'They can send messages and assign tasks'}
            </Text>
          </View>
        </View>
      </View>

      {/* Demo Connection Button */}
      {!isConnected && (
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => {
            seedDemoCaseManager(dispatch, { isSpanish });
            Alert.alert(
              isSpanish ? '¡Conectado!' : 'Connected!',
              isSpanish
                ? 'Ahora estás conectado con Sarah Johnson (demo). Revisa tus mensajes, tareas y notas.'
                : "You're now connected with Sarah Johnson (demo). Check your messages, tasks, and notes."
            );
          }}
        >
          <Text style={styles.demoButtonText}>
            {isSpanish ? '🎯 Probar con Demo' : '🎯 Try Demo Connection'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderMessagesTab = () => (
    <KeyboardAvoidingView
      style={styles.messagesContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {cmData.messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateTitle}>
              {isSpanish ? 'No hay mensajes' : 'No messages yet'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {isConnected
                ? (isSpanish ? 'Envía un mensaje a tu gestor de caso' : 'Send a message to your case manager')
                : (isSpanish ? 'Conecta con un gestor de caso primero' : 'Connect with a case manager first')}
            </Text>
          </View>
        ) : (
          cmData.messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.senderType === 'user' ? styles.messageBubbleUser : styles.messageBubbleCM,
              ]}
            >
              {message.senderType === 'caseManager' && (
                <Text style={styles.messageSender}>{message.senderName}</Text>
              )}
              <Text style={[
                styles.messageText,
                message.senderType === 'user' ? styles.messageTextUser : styles.messageTextCM,
              ]}>
                {message.content}
              </Text>
              <Text style={[
                styles.messageTime,
                message.senderType === 'user' ? styles.messageTimeUser : styles.messageTimeCM,
              ]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {isConnected && (
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder={isSpanish ? 'Escribe un mensaje...' : 'Type a message...'}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  const renderTasksTab = () => {
    const filteredTasks = getFilteredTasks();
    const pendingTasks = filteredTasks.filter((t) => t.status !== 'completed');
    const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Add Task Button */}
        {isConnected && (
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={() => setShowAddTask(true)}
          >
            <Text style={styles.addTaskButtonText}>
              + {isSpanish ? 'Agregar Tarea' : 'Add Task'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Category Filter - Square Grid */}
        <View style={styles.categoryGrid}>
          <TouchableOpacity
            style={[styles.categorySquare, selectedCategory === 'all' && styles.categorySquareActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={styles.categorySquareIcon}>📋</Text>
            <Text style={[styles.categorySquareText, selectedCategory === 'all' && styles.categorySquareTextActive]}>
              {isSpanish ? 'Todos' : 'All'}
            </Text>
          </TouchableOpacity>
          {TASK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categorySquare, selectedCategory === cat.id && styles.categorySquareActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.categorySquareIcon}>{cat.icon}</Text>
              <Text style={[styles.categorySquareText, selectedCategory === cat.id && styles.categorySquareTextActive]}>
                {isSpanish ? cat.labelEs : cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateTitle}>
              {isSpanish ? 'No hay tareas' : 'No tasks yet'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {isConnected
                ? (isSpanish ? 'Tu gestor de caso te asignará tareas' : 'Your case manager will assign tasks')
                : (isSpanish ? 'Conecta con un gestor de caso primero' : 'Connect with a case manager first')}
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <View style={styles.taskSection}>
                <Text style={styles.taskSectionTitle}>
                  {isSpanish ? 'Por Hacer' : 'To Do'} ({pendingTasks.length})
                </Text>
                {pendingTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    onPress={() => setSelectedTask(task)}
                  >
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => handleToggleTaskStatus(task.id, task.status)}
                    >
                      <Text style={styles.taskCheckboxIcon}>○</Text>
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskCategoryIcon}>
                          {TASK_CATEGORIES.find((c) => c.id === task.category)?.icon}
                        </Text>
                        <View style={[
                          styles.taskPriority,
                          task.priority === 'high' && styles.taskPriorityHigh,
                          task.priority === 'medium' && styles.taskPriorityMedium,
                          task.priority === 'low' && styles.taskPriorityLow,
                        ]}>
                          <Text style={styles.taskPriorityText}>
                            {task.priority === 'high' ? '!' : task.priority === 'medium' ? '•' : '○'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {task.description && (
                        <Text style={styles.taskDescriptionPreview} numberOfLines={1}>
                          {task.description}
                        </Text>
                      )}
                      <Text style={styles.taskAssignedBy}>
                        {isSpanish ? 'Asignado por' : 'Assigned by'} {task.assignedByName}
                        {task.description ? ' • Tap for details' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <View style={styles.taskSection}>
                <Text style={styles.taskSectionTitle}>
                  {isSpanish ? 'Completadas' : 'Completed'} ({completedTasks.length})
                </Text>
                {completedTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, styles.taskCardCompleted]}
                    onPress={() => handleToggleTaskStatus(task.id, task.status)}
                  >
                    <View style={[styles.taskCheckbox, styles.taskCheckboxCompleted]}>
                      <Text style={styles.taskCheckboxIconCompleted}>✓</Text>
                    </View>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>{task.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  const renderNotesTab = () => {
    const visibleNotes = cmData.notes.filter((note) => !note.isPrivate);

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {visibleNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📝</Text>
            <Text style={styles.emptyStateTitle}>
              {isSpanish ? 'No hay notas' : 'No notes yet'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {isConnected
                ? (isSpanish ? 'Tu gestor de caso compartirá notas aquí' : 'Your case manager will share notes here')
                : (isSpanish ? 'Conecta con un gestor de caso primero' : 'Connect with a case manager first')}
            </Text>
          </View>
        ) : (
          visibleNotes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteDate}>{formatTime(note.createdAt)}</Text>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteAuthor}>
                {isSpanish ? 'Por' : 'By'} {note.createdByName}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSpanish ? 'Conectar con mi Gestor' : 'Connect with my Case Manager'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Tab Content */}
      {activeTab === 'connect' && renderConnectTab()}
      {activeTab === 'messages' && renderMessagesTab()}
      {activeTab === 'tasks' && renderTasksTab()}
      {activeTab === 'notes' && renderNotesTab()}

      {/* Task Detail Modal */}
      <Modal visible={!!selectedTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalCategoryBadge}>
                    <Text style={styles.modalCategoryIcon}>
                      {TASK_CATEGORIES.find((c) => c.id === selectedTask.category)?.icon}
                    </Text>
                    <Text style={styles.modalCategoryText}>
                      {isSpanish
                        ? TASK_CATEGORIES.find((c) => c.id === selectedTask.category)?.labelEs
                        : TASK_CATEGORIES.find((c) => c.id === selectedTask.category)?.label}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTask(null)}>
                    <Text style={styles.modalCloseButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTaskTitle}>{selectedTask.title}</Text>

                {selectedTask.description && (
                  <View style={styles.modalNoteSection}>
                    <Text style={styles.modalNoteLabel}>
                      {isSpanish ? 'Nota de tu gestor:' : 'Note from your case manager:'}
                    </Text>
                    <View style={styles.modalNoteCard}>
                      <Text style={styles.modalNoteText}>{selectedTask.description}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalMeta}>
                  <Text style={styles.modalMetaText}>
                    {isSpanish ? 'Asignado por' : 'Assigned by'}: {selectedTask.assignedByName}
                  </Text>
                  <Text style={styles.modalMetaText}>
                    {isSpanish ? 'Prioridad' : 'Priority'}: {selectedTask.priority === 'high' ? (isSpanish ? 'Alta' : 'High') : selectedTask.priority === 'medium' ? (isSpanish ? 'Media' : 'Medium') : (isSpanish ? 'Baja' : 'Low')}
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={() => setSelectedTask(null)}
                  >
                    <Text style={styles.modalSecondaryButtonText}>
                      {isSpanish ? 'Cerrar' : 'Close'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryButton,
                      selectedTask.status === 'completed' && styles.modalUncompleteButton,
                    ]}
                    onPress={() => {
                      handleToggleTaskStatus(selectedTask.id, selectedTask.status);
                      setSelectedTask(null);
                    }}
                  >
                    <Text style={styles.modalPrimaryButtonText}>
                      {selectedTask.status === 'completed'
                        ? (isSpanish ? 'Marcar Pendiente' : 'Mark as To Do')
                        : (isSpanish ? 'Marcar Completada' : 'Mark Complete')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showAddTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.addTaskModalTitle}>
                {isSpanish ? 'Agregar Nueva Tarea' : 'Add New Task'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.addTaskInput}
              placeholder={isSpanish ? 'Título de la tarea' : 'Task title'}
              placeholderTextColor="#94A3B8"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />

            <TextInput
              style={styles.addTaskTextArea}
              placeholder={isSpanish ? 'Descripción (opcional)' : 'Description (optional)'}
              placeholderTextColor="#94A3B8"
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.addTaskLabel}>{isSpanish ? 'Categoría' : 'Category'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {TASK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    newTaskCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setNewTaskCategory(cat.id)}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryChipText,
                    newTaskCategory === cat.id && styles.categoryChipTextActive,
                  ]}>
                    {isSpanish ? cat.labelEs : cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.addTaskLabel}>{isSpanish ? 'Prioridad' : 'Priority'}</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity
                style={[styles.priorityChip, newTaskPriority === 'low' && styles.priorityChipLow]}
                onPress={() => setNewTaskPriority('low')}
              >
                <Text style={[styles.priorityChipText, newTaskPriority === 'low' && styles.priorityChipTextActive]}>
                  {isSpanish ? 'Baja' : 'Low'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.priorityChip, newTaskPriority === 'medium' && styles.priorityChipMedium]}
                onPress={() => setNewTaskPriority('medium')}
              >
                <Text style={[styles.priorityChipText, newTaskPriority === 'medium' && styles.priorityChipTextActive]}>
                  {isSpanish ? 'Media' : 'Medium'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.priorityChip, newTaskPriority === 'high' && styles.priorityChipHigh]}
                onPress={() => setNewTaskPriority('high')}
              >
                <Text style={[styles.priorityChipText, newTaskPriority === 'high' && styles.priorityChipTextActive]}>
                  {isSpanish ? 'Alta' : 'High'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowAddTask(false);
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, !newTaskTitle.trim() && styles.modalButtonDisabled]}
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {isSpanish ? 'Agregar' : 'Add Task'}
                </Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRight: {
    width: 40,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: '#5E8B7E',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Tab Content
  tabContent: {
    flex: 1,
    padding: 20,
  },
  // Connect Tab
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusConnected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  statusDisconnected: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  shareCodeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  shareCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5E8B7E',
    borderStyle: 'dashed',
  },
  shareCode: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5E8B7E',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#5E8B7E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  stepsList: {
    marginTop: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5E8B7E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Messages Tab
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    padding: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#5E8B7E',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageBubbleCM: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E8B7E',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextCM: {
    color: '#0F172A',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  messageTimeCM: {
    color: '#94A3B8',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#0F172A',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5E8B7E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Tasks Tab - Square Category Grid (3 per row)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 10,
    justifyContent: 'flex-start',
  },
  categorySquare: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categorySquareActive: {
    backgroundColor: '#EAF2EE',
    borderColor: '#5E8B7E',
    borderWidth: 3,
  },
  categorySquareIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  categorySquareText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  categorySquareTextActive: {
    color: '#5E8B7E',
  },
  taskSection: {
    marginBottom: 24,
  },
  taskSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskCheckboxCompleted: {
    backgroundColor: '#5E8B7E',
    borderColor: '#5E8B7E',
  },
  taskCheckboxIcon: {
    fontSize: 16,
    color: '#CBD5E1',
  },
  taskCheckboxIconCompleted: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskCategoryIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  taskPriority: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskPriorityHigh: {
    backgroundColor: '#FBEAC6',
  },
  taskPriorityMedium: {
    backgroundColor: '#FEF3C7',
  },
  taskPriorityLow: {
    backgroundColor: '#E0F2FE',
  },
  taskPriorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  taskAssignedBy: {
    fontSize: 11,
    color: '#94A3B8',
  },
  // Notes Tab
  noteCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noteContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },
  noteAuthor: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  // Task Detail Modal Styles
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalCategoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  modalCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E8B7E',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#9CA3AF',
    padding: 4,
  },
  modalTaskTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalNoteSection: {
    marginBottom: 20,
  },
  modalNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  modalNoteCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  modalNoteText: {
    fontSize: 15,
    color: '#78350F',
    lineHeight: 22,
  },
  modalMeta: {
    marginBottom: 24,
  },
  modalMetaText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#5E8B7E',
    alignItems: 'center',
  },
  modalUncompleteButton: {
    backgroundColor: '#F59E0B',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskDescriptionPreview: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Add Task Button
  addTaskButton: {
    backgroundColor: '#5E8B7E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // Add Task Modal Styles
  addTaskModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  addTaskInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: '#0F172A',
  },
  addTaskTextArea: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    marginBottom: 16,
    minHeight: 80,
    color: '#0F172A',
  },
  addTaskLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#EAF2EE',
    borderWidth: 2,
    borderColor: '#5E8B7E',
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#5E8B7E',
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  priorityChipLow: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0EA5E9',
  },
  priorityChipMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  priorityChipHigh: {
    backgroundColor: '#FBEAC6',
    borderColor: '#EF4444',
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  priorityChipTextActive: {
    color: '#1F2937',
  },
  modalButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});

export default CaseManagerScreen;
