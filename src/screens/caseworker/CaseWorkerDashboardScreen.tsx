import React, { useState } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { UserProfile, ServiceCategory, TodoItem } from '../../types';

export const CaseWorkerDashboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'todos' | 'resources'>('todos');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'normal' | 'urgent'>('normal');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientCode, setNewClientCode] = useState('');

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
          completed: false,
          createdBy: 'caseworker',
        },
      },
    });

    setNewTaskTitle('');
    setNewTaskPriority('normal');
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

  const handleAddClient = () => {
    // This would typically validate and fetch client data
    Alert.alert('Info', 'Enter the share code on the previous screen to add clients');
    setShowAddClient(false);
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
            <Text
              style={[
                styles.detailTabText,
                activeTab === 'todos' && styles.detailTabTextActive,
              ]}
            >
              {t('caseworker.clientDetail.todos')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailTab, activeTab === 'profile' && styles.detailTabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text
              style={[
                styles.detailTabText,
                activeTab === 'profile' && styles.detailTabTextActive,
              ]}
            >
              {t('caseworker.clientDetail.profile')}
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

      {/* Content */}
      {selectedClient ? renderClientDetail() : renderClientsList()}
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
});
