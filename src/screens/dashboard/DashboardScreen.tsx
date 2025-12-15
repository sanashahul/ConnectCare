import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { Resource, ServiceCategory } from '../../types';
import { getSampleResources, filterResourcesByAnswers } from '../../utils/resources';
import { formatDistance } from '../../utils/location';
import * as Clipboard from 'expo-clipboard';

type TabType = 'resources' | 'todos' | 'caseworker';

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const userProfile = state.userProfile;
  const categories = userProfile?.selectedCategories || [];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (activeCategory && userProfile?.location) {
      loadResources();
    }
  }, [activeCategory, userProfile?.location]);

  const loadResources = async () => {
    if (!activeCategory || !userProfile?.location) return;

    setIsLoading(true);
    try {
      // Get sample resources for demo
      const rawResources = getSampleResources(userProfile.location, activeCategory);
      // Filter based on user's answers
      const filtered = filterResourcesByAnswers(
        rawResources,
        userProfile.answers,
        activeCategory
      );
      setResources(filtered);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
    setIsLoading(false);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleDirections = (resource: Resource) => {
    const url = `https://maps.google.com/?q=${resource.lat},${resource.lng}`;
    Linking.openURL(url);
  };

  const handleWebsite = (url: string) => {
    Linking.openURL(url);
  };

  const handleCopyCode = async () => {
    if (userProfile?.shareCode) {
      await Clipboard.setStringAsync(userProfile.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleToggleTodo = (todoId: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: todoId });
  };

  const handleAddTodo = () => {
    // Note: For production, you'd want a modal with TextInput for cross-platform support
    // Alert.prompt is iOS-only. Using Alert.alert for demo purposes.
    Alert.alert(
      'Add Task',
      'This would open a task input modal in the full app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Sample Task',
          onPress: () => {
            dispatch({
              type: 'ADD_TODO',
              payload: {
                title: 'New task - tap to edit',
                priority: 'normal',
                completed: false,
                createdBy: 'individual',
              },
            });
          },
        },
      ]
    );
  };

  const getCategoryLabel = (category: ServiceCategory): string => {
    return t(`dashboard.resources.${category}`);
  };

  const getCategoryIcon = (category: ServiceCategory): string => {
    const icons: Record<ServiceCategory, string> = {
      healthcare: '🏥',
      employment: '💼',
      housing: '🏠',
    };
    return icons[category];
  };

  const renderResourcesTab = () => (
    <View style={styles.tabContent}>
      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryTab, activeCategory === category && styles.categoryTabActive]}
            onPress={() => setActiveCategory(category)}
          >
            <Text style={styles.categoryTabIcon}>{getCategoryIcon(category)}</Text>
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === category && styles.categoryTabTextActive,
              ]}
            >
              {getCategoryLabel(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resources List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>{t('dashboard.resources.loading')}</Text>
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('dashboard.resources.noResults')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.resourcesList}>
          {resources.map((resource) => (
            <View key={resource.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <Text style={styles.resourceName}>{resource.name}</Text>
                {resource.distance && (
                  <Text style={styles.resourceDistance}>
                    {formatDistance(resource.distance)}
                  </Text>
                )}
              </View>
              <Text style={styles.resourceAddress}>{resource.address}</Text>
              {resource.description && (
                <Text style={styles.resourceDescription}>{resource.description}</Text>
              )}
              {resource.services && resource.services.length > 0 && (
                <View style={styles.servicesTags}>
                  {resource.services.slice(0, 3).map((service, idx) => (
                    <View key={idx} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{service}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.resourceActions}>
                {resource.phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(resource.phone!)}
                  >
                    <Text style={styles.actionIcon}>📞</Text>
                    <Text style={styles.actionText}>{t('dashboard.resources.call')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDirections(resource)}
                >
                  <Text style={styles.actionIcon}>🗺️</Text>
                  <Text style={styles.actionText}>{t('dashboard.resources.directions')}</Text>
                </TouchableOpacity>
                {resource.website && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleWebsite(resource.website!)}
                  >
                    <Text style={styles.actionIcon}>🌐</Text>
                    <Text style={styles.actionText}>{t('dashboard.resources.website')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderTodosTab = () => {
    const todos = userProfile?.todos || [];
    const pendingTodos = todos.filter((t) => !t.completed);
    const completedTodos = todos.filter((t) => t.completed);

    return (
      <View style={styles.tabContent}>
        <View style={styles.todosHeader}>
          <Text style={styles.todosTitle}>{t('dashboard.todos.title')}</Text>
          <TouchableOpacity style={styles.addTodoButton} onPress={handleAddTodo}>
            <Text style={styles.addTodoText}>+ {t('dashboard.todos.addNew')}</Text>
          </TouchableOpacity>
        </View>

        {todos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>{t('dashboard.todos.empty')}</Text>
            <Text style={styles.emptySubtitle}>{t('dashboard.todos.emptyDesc')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.todosList}>
            {pendingTodos.map((todo) => (
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
                  {todo.priority === 'urgent' && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>{t('dashboard.todos.urgent')}</Text>
                    </View>
                  )}
                  {todo.createdBy === 'caseworker' && (
                    <Text style={styles.todoCreator}>
                      {t('dashboard.todos.addedBy', { name: 'Case Worker' })}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {completedTodos.length > 0 && (
              <>
                <Text style={styles.completedHeader}>Completed</Text>
                {completedTodos.map((todo) => (
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
          </ScrollView>
        )}
      </View>
    );
  };

  const renderCaseworkerTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.caseworkerSection}>
        <Text style={styles.sectionTitle}>{t('dashboard.caseworker.title')}</Text>

        {userProfile?.connectedCaseWorkerId ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedIcon}>
              <Text style={styles.connectedIconText}>👥</Text>
            </View>
            <Text style={styles.connectedStatus}>{t('dashboard.caseworker.connected')}</Text>
            <TouchableOpacity style={styles.disconnectButton}>
              <Text style={styles.disconnectText}>{t('dashboard.caseworker.disconnect')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notConnectedCard}>
            <Text style={styles.notConnectedTitle}>
              {t('dashboard.caseworker.notConnected')}
            </Text>
            <Text style={styles.notConnectedDesc}>
              {t('dashboard.caseworker.notConnectedDesc')}
            </Text>

            <View style={styles.shareCodeSection}>
              <Text style={styles.shareCodeLabel}>{t('dashboard.caseworker.yourCode')}</Text>
              <TouchableOpacity style={styles.shareCodeBox} onPress={handleCopyCode}>
                <Text style={styles.shareCode}>{userProfile?.shareCode || '---'}</Text>
                <Text style={styles.copyIcon}>📋</Text>
              </TouchableOpacity>
              <Text style={styles.tapToCopy}>
                {codeCopied
                  ? t('dashboard.caseworker.codeCopied')
                  : t('dashboard.caseworker.tapToCopy')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('dashboard.greeting', { name: userProfile?.name || 'Friend' })}
        </Text>
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
          onPress={() => setActiveTab('resources')}
        >
          <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>
            {t('dashboard.tabs.resources')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'todos' && styles.tabActive]}
          onPress={() => setActiveTab('todos')}
        >
          <Text style={[styles.tabText, activeTab === 'todos' && styles.tabTextActive]}>
            {t('dashboard.tabs.todos')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'caseworker' && styles.tabActive]}
          onPress={() => setActiveTab('caseworker')}
        >
          <Text style={[styles.tabText, activeTab === 'caseworker' && styles.tabTextActive]}>
            {t('dashboard.tabs.caseworker')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'resources' && renderResourcesTab()}
      {activeTab === 'todos' && renderTodosTab()}
      {activeTab === 'caseworker' && renderCaseworkerTab()}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  tabContent: {
    flex: 1,
  },
  categoryTabs: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryTabIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryTabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryTabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  emptyContainer: {
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
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  resourcesList: {
    paddingHorizontal: 24,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  resourceDistance: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  resourceAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  servicesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceTagText: {
    fontSize: 12,
    color: '#4B5563',
  },
  resourceActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  todosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  todosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addTodoButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTodoText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todosList: {
    paddingHorizontal: 24,
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
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  urgentText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  todoCreator: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  completedHeader: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 12,
  },
  caseworkerSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  connectedCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  connectedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectedIconText: {
    fontSize: 32,
  },
  connectedStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 16,
  },
  disconnectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  disconnectText: {
    color: '#DC2626',
    fontWeight: '500',
  },
  notConnectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notConnectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  notConnectedDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareCodeSection: {
    alignItems: 'center',
    width: '100%',
  },
  shareCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  shareCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  shareCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 2,
    marginRight: 12,
  },
  copyIcon: {
    fontSize: 20,
  },
  tapToCopy: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
});
