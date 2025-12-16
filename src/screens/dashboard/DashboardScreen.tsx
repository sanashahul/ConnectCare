import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import * as Clipboard from 'expo-clipboard';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

// AI Case Manager quick topics
const AI_TOPICS = [
  { id: 'shelter', label: 'Find Shelter', labelEs: 'Buscar Refugio', icon: '🏠', category: 'housing' },
  { id: 'clinic', label: 'Free Clinic', labelEs: 'Clínica Gratis', icon: '🏥', category: 'healthcare' },
  { id: 'job', label: 'Find Jobs', labelEs: 'Buscar Trabajo', icon: '💼', category: 'employment' },
  { id: 'food', label: 'Food Help', labelEs: 'Ayuda Comida', icon: '🍽️', category: 'general' },
  { id: 'documents', label: 'Get ID/Docs', labelEs: 'Obtener ID', icon: '🪪', category: 'general' },
  { id: '211', label: 'Call 211', labelEs: 'Llamar 211', icon: '📞', category: 'general' },
];

// Suggested to-do items for each topic
const TOPIC_TODOS: Record<string, { en: string; es: string }[]> = {
  shelter: [
    { en: 'Call 211 for shelter info', es: 'Llamar al 211 para info de refugio' },
    { en: 'Visit local shelter before 5pm', es: 'Visitar refugio local antes de las 5pm' },
  ],
  clinic: [
    { en: 'Call 211 for free clinics nearby', es: 'Llamar al 211 para clínicas gratis' },
    { en: 'Visit findahealthcenter.hrsa.gov', es: 'Visitar findahealthcenter.hrsa.gov' },
    { en: 'Gather documents for clinic visit', es: 'Reunir documentos para visita a clínica' },
  ],
  job: [
    { en: 'Update resume at library', es: 'Actualizar currículum en biblioteca' },
    { en: 'Visit workforce development center', es: 'Visitar centro de desarrollo laboral' },
    { en: 'Search jobs on Indeed.com', es: 'Buscar trabajos en Indeed.com' },
  ],
  food: [
    { en: 'Call 211 for food banks', es: 'Llamar al 211 para bancos de comida' },
    { en: 'Apply for SNAP benefits', es: 'Aplicar para beneficios SNAP' },
    { en: 'Find local food pantry', es: 'Encontrar despensa de comida local' },
  ],
  documents: [
    { en: 'Request birth certificate copy', es: 'Solicitar copia de acta de nacimiento' },
    { en: 'Visit SSA office for Social Security card', es: 'Visitar oficina SSA para tarjeta SS' },
    { en: 'Gather ID documents', es: 'Reunir documentos de identificación' },
  ],
  '211': [
    { en: 'Call 211 for resources', es: 'Llamar al 211 para recursos' },
    { en: 'Text ZIP code to 898-211', es: 'Enviar código postal al 898-211' },
  ],
};

// AI responses based on topic
const getAIResponse = (topicId: string, isSpanish: boolean, location?: string): string => {
  const responses: Record<string, { en: string; es: string }> = {
    shelter: {
      en: `I can help you find shelter. Here are your options:\n\n📞 Call 211 - They have real-time info on available beds${location ? ` in ${location}` : ''}.\n\n📞 National Homeless Hotline: 1-800-231-6946 (24/7)\n\n💡 Tip: Many shelters have specific check-in times (usually 5-8pm). Call ahead to reserve a bed.`,
      es: `Puedo ayudarte a encontrar refugio. Aquí están tus opciones:\n\n📞 Llama al 211 - Tienen información en tiempo real sobre camas disponibles${location ? ` en ${location}` : ''}.\n\n📞 Línea Nacional: 1-800-231-6946 (24/7)\n\n💡 Consejo: Muchos refugios tienen horarios específicos de entrada (usualmente 5-8pm). Llama con anticipación.`,
    },
    clinic: {
      en: `Here's how to find free healthcare:\n\n🏥 Federally Qualified Health Centers serve everyone regardless of ability to pay.\n\n📱 Visit findahealthcenter.hrsa.gov to find one near you.\n\n📞 Call 211 for local free clinics.\n\n💡 Many centers offer sliding-scale fees based on your income.`,
      es: `Así puedes encontrar atención médica gratuita:\n\n🏥 Los Centros de Salud Federalmente Calificados atienden a todos sin importar la capacidad de pago.\n\n📱 Visita findahealthcenter.hrsa.gov para encontrar uno cerca.\n\n📞 Llama al 211 para clínicas gratuitas locales.\n\n💡 Muchos centros ofrecen tarifas basadas en tus ingresos.`,
    },
    job: {
      en: `Here are ways to find work:\n\n💼 Indeed.com, LinkedIn - Popular job sites\n🏛️ USAJobs.gov - Government jobs\n📍 Local workforce development center\n\n⚡ Quick-hire jobs: Warehouse, restaurant, retail, cleaning, delivery\n\n💡 Tip: Libraries offer free resume help!`,
      es: `Aquí hay formas de encontrar trabajo:\n\n💼 Indeed.com, LinkedIn - Sitios de empleo populares\n🏛️ USAJobs.gov - Trabajos del gobierno\n📍 Centro de desarrollo laboral local\n\n⚡ Trabajos de contratación rápida: Almacén, restaurante, retail, limpieza, entregas\n\n💡 Consejo: ¡Las bibliotecas ofrecen ayuda gratuita con currículos!`,
    },
    food: {
      en: `Here's how to get food assistance:\n\n🍽️ Call 211 for local food banks\n📱 FeedingAmerica.org - Find pantries nearby\n⛪ Many churches offer free meals\n\n📋 Apply for SNAP (food stamps) at your local social services office.\n\n💡 Food banks usually don't require proof of income.`,
      es: `Así puedes obtener asistencia alimentaria:\n\n🍽️ Llama al 211 para bancos de comida locales\n📱 FeedingAmerica.org - Encuentra despensas cerca\n⛪ Muchas iglesias ofrecen comidas gratis\n\n📋 Aplica para SNAP (cupones de comida) en tu oficina local de servicios sociales.\n\n💡 Los bancos de comida usualmente no requieren prueba de ingresos.`,
    },
    documents: {
      en: `Here's how to replace important documents:\n\n🪪 Birth Certificate: Contact vital records in your birth state\n📋 Social Security Card: Visit ssa.gov or local SSA office\n🚗 Driver's License: Visit DMV with proof of identity\n\n💡 Many shelters and social service agencies help with document replacement for free. Call 211 for local resources.`,
      es: `Así puedes reemplazar documentos importantes:\n\n🪪 Acta de nacimiento: Contacta el registro civil del estado donde naciste\n📋 Tarjeta de Seguro Social: Visita ssa.gov o la oficina local de SSA\n🚗 Licencia de conducir: Visita el DMV con prueba de identidad\n\n💡 Muchos refugios y agencias de servicios sociales ayudan con el reemplazo de documentos gratis. Llama al 211.`,
    },
    '211': {
      en: `211 is a free, confidential service that connects you to local resources 24/7.\n\n📞 Just dial 211 from any phone\n💬 Or text your ZIP code to 898-211\n🌐 Visit 211.org\n\nThey can help with:\n• Shelter & housing\n• Food assistance\n• Healthcare\n• Utility assistance\n• Job resources\n• And more!`,
      es: `211 es un servicio gratuito y confidencial que te conecta con recursos locales 24/7.\n\n📞 Solo marca 211 desde cualquier teléfono\n💬 O envía tu código postal al 898-211\n🌐 Visita 211.org\n\nPueden ayudarte con:\n• Refugio y vivienda\n• Asistencia alimentaria\n• Atención médica\n• Asistencia de servicios\n• Recursos de empleo\n• ¡Y más!`,
    },
  };

  const response = responses[topicId];
  return response ? (isSpanish ? response.es : response.en) : '';
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  topicId?: string; // Track which topic this response is for
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useApp();
  const [showAI, setShowAI] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const isSpanish = i18n.language === 'es';
  const userProfile = state.userProfile;
  const categories = userProfile?.selectedCategories || [];

  const handleCopyCode = async () => {
    if (userProfile?.shareCode) {
      await Clipboard.setStringAsync(userProfile.shareCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAITopic = (topicId: string) => {
    const topic = AI_TOPICS.find((t) => t.id === topicId);
    if (!topic) return;

    setCurrentTopic(topicId);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: isSpanish ? topic.labelEs : topic.label,
    };

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: getAIResponse(topicId, isSpanish, userProfile?.location?.city),
      topicId: topicId,
    };

    setChatMessages([...chatMessages, userMessage, aiResponse]);

    // Scroll to bottom after adding messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAddTodo = (title: string) => {
    if (!title.trim()) return;

    dispatch({
      type: 'ADD_TODO',
      payload: {
        title: title.trim(),
        completed: false,
        category: currentTopic as any || 'general',
      },
    });

    Alert.alert(
      isSpanish ? '¡Agregado!' : 'Added!',
      isSpanish ? 'Tarea agregada a tu lista' : 'Task added to your to-do list',
      [{ text: 'OK' }]
    );
  };

  const handleQuickAddTodo = (todo: { en: string; es: string }) => {
    handleAddTodo(isSpanish ? todo.es : todo.en);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
    };

    // Simple keyword matching for response
    let responseId = '211'; // Default to 211 info
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('shelter') || lowerInput.includes('sleep') || lowerInput.includes('refugio') || lowerInput.includes('dormir')) {
      responseId = 'shelter';
    } else if (lowerInput.includes('clinic') || lowerInput.includes('doctor') || lowerInput.includes('health') || lowerInput.includes('médico') || lowerInput.includes('clínica')) {
      responseId = 'clinic';
    } else if (lowerInput.includes('job') || lowerInput.includes('work') || lowerInput.includes('trabajo') || lowerInput.includes('empleo')) {
      responseId = 'job';
    } else if (lowerInput.includes('food') || lowerInput.includes('hungry') || lowerInput.includes('eat') || lowerInput.includes('comida') || lowerInput.includes('hambre')) {
      responseId = 'food';
    } else if (lowerInput.includes('id') || lowerInput.includes('document') || lowerInput.includes('birth') || lowerInput.includes('license') || lowerInput.includes('documento') || lowerInput.includes('identificación')) {
      responseId = 'documents';
    }

    setCurrentTopic(responseId);

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: getAIResponse(responseId, isSpanish, userProfile?.location?.city),
      topicId: responseId,
    };

    setChatMessages([...chatMessages, userMessage, aiResponse]);
    setUserInput('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderCategoryGrid = () => {
    const allCategories = [
      { id: 'healthcare', icon: '🏥', label: 'Health', labelEs: 'Salud', color: '#F0FDFA', iconBg: '#CCFBF1', screen: 'Health' },
      { id: 'employment', icon: '💼', label: 'Jobs', labelEs: 'Empleo', color: '#FFF7ED', iconBg: '#FFEDD5', screen: 'Jobs' },
      { id: 'housing', icon: '🏠', label: 'Housing', labelEs: 'Vivienda', color: '#F5F3FF', iconBg: '#EDE9FE', screen: 'Housing' },
    ];

    // Filter to show only selected categories, but always show AI
    const displayCategories = allCategories.filter((cat) => categories.includes(cat.id as any));

    return (
      <View style={styles.categoryGrid}>
        {displayCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: category.color }]}
            onPress={() => navigation.navigate(category.screen)}
          >
            <View style={[styles.categoryIconContainer, { backgroundColor: category.iconBg }]}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
            </View>
            <Text style={styles.categoryLabel}>
              {isSpanish ? category.labelEs : category.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* AI Case Manager Block */}
        <TouchableOpacity
          style={[styles.categoryCard, styles.aiCategoryCard]}
          onPress={() => setShowAI(true)}
        >
          <View style={[styles.categoryIconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.categoryIcon}>🤖</Text>
          </View>
          <Text style={styles.categoryLabel}>
            {isSpanish ? 'AI Gestor' : 'AI Case Manager'}
          </Text>
          <Text style={styles.categorySubLabel}>
            {isSpanish ? 'Ayuda personalizada' : 'Personal help'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTodos = () => {
    const todos = userProfile?.todos || [];
    const pendingTodos = todos.filter((t) => !t.completed);
    const completedCount = todos.filter((t) => t.completed).length;

    return (
      <View style={styles.todosSection}>
        <View style={styles.todoHeader}>
          <View>
            <Text style={styles.todoHeaderTitle}>
              {isSpanish ? 'Mi Lista de Tareas' : 'My To-Do List'}
            </Text>
            <Text style={styles.todoHeaderSubtitle}>
              {pendingTodos.length > 0
                ? (isSpanish ? `${pendingTodos.length} pendiente${pendingTodos.length > 1 ? 's' : ''}` : `${pendingTodos.length} pending`)
                : (isSpanish ? '¡Todo hecho!' : 'All done!')}
              {completedCount > 0 && ` • ${completedCount} ${isSpanish ? 'completado' : 'done'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addTodoButton}
            onPress={() => setShowAddTodo(true)}
          >
            <Text style={styles.addTodoButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {pendingTodos.length === 0 ? (
          <View style={styles.emptyTodos}>
            <Text style={styles.emptyTodosEmoji}>✨</Text>
            <Text style={styles.emptyTodosText}>
              {isSpanish
                ? 'Usa el AI Case Manager para agregar tareas'
                : 'Use AI Case Manager to add tasks'}
            </Text>
          </View>
        ) : (
          <>
            {pendingTodos.slice(0, 4).map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={styles.todoItem}
                onPress={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
              >
                <View style={styles.todoCheckbox}>
                  <Text style={styles.todoCheckmark}></Text>
                </View>
                <Text style={styles.todoText}>{todo.title}</Text>
                <TouchableOpacity
                  style={styles.todoDeleteButton}
                  onPress={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}
                >
                  <Text style={styles.todoDeleteText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {pendingTodos.length > 4 && (
              <Text style={styles.moreText}>
                +{pendingTodos.length - 4} {isSpanish ? 'más' : 'more'}
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  const renderAddTodoModal = () => (
    <Modal visible={showAddTodo} animationType="slide" transparent>
      <View style={styles.addTodoOverlay}>
        <View style={styles.addTodoModal}>
          <View style={styles.addTodoHeader}>
            <Text style={styles.addTodoTitle}>
              {isSpanish ? 'Nueva Tarea' : 'New Task'}
            </Text>
            <TouchableOpacity onPress={() => setShowAddTodo(false)}>
              <Text style={styles.addTodoClose}>×</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.addTodoInput}
            value={newTodoText}
            onChangeText={setNewTodoText}
            placeholder={isSpanish ? 'Escribe tu tarea...' : 'Enter your task...'}
            placeholderTextColor="#94A3B8"
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.addTodoSubmit,
              !newTodoText.trim() && styles.addTodoSubmitDisabled,
            ]}
            onPress={() => {
              if (newTodoText.trim()) {
                handleAddTodo(newTodoText);
                setNewTodoText('');
                setShowAddTodo(false);
              }
            }}
            disabled={!newTodoText.trim()}
          >
            <Text style={styles.addTodoSubmitText}>
              {isSpanish ? 'Agregar' : 'Add Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAIModal = () => (
    <Modal visible={showAI} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.aiContainer}>
        <View style={styles.aiHeader}>
          <TouchableOpacity onPress={() => {
            setShowAI(false);
            setChatMessages([]);
            setCurrentTopic(null);
          }} style={styles.aiCloseButton}>
            <Text style={styles.aiCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.aiTitleContainer}>
            <Text style={styles.aiTitle}>🤖 {isSpanish ? 'AI Gestor de Caso' : 'AI Case Manager'}</Text>
            <Text style={styles.aiSubtitle}>{isSpanish ? 'Tu asistente personal' : 'Your personal assistant'}</Text>
          </View>
          <View style={styles.aiSpacer} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.aiContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length === 0 ? (
            <View style={styles.aiWelcome}>
              <Text style={styles.aiWelcomeEmoji}>👋</Text>
              <Text style={styles.aiWelcomeTitle}>
                {isSpanish ? '¿Cómo puedo ayudarte hoy?' : 'How can I help you today?'}
              </Text>
              <Text style={styles.aiWelcomeSubtitle}>
                {isSpanish ? 'Toca un tema para empezar' : 'Tap a topic to get started'}
              </Text>

              <View style={styles.aiTopicsGrid}>
                {AI_TOPICS.map((topic) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={styles.aiTopicCard}
                    onPress={() => handleAITopic(topic.id)}
                  >
                    <Text style={styles.aiTopicIcon}>{topic.icon}</Text>
                    <Text style={styles.aiTopicLabel}>
                      {isSpanish ? topic.labelEs : topic.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.chatContainer}>
              {chatMessages.map((message, index) => (
                <View key={message.id}>
                  <View
                    style={[
                      styles.chatBubble,
                      message.type === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatText,
                        message.type === 'user' ? styles.userText : styles.aiText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>

                  {/* Show todo suggestions after AI responses */}
                  {message.type === 'ai' && message.topicId && TOPIC_TODOS[message.topicId] && (
                    <View style={styles.todoSuggestionsContainer}>
                      <Text style={styles.todoSuggestionsTitle}>
                        📝 {isSpanish ? 'Agregar a tu lista:' : 'Add to your to-do list:'}
                      </Text>
                      <View style={styles.todoSuggestions}>
                        {TOPIC_TODOS[message.topicId].map((todo, todoIndex) => (
                          <TouchableOpacity
                            key={todoIndex}
                            style={styles.todoSuggestionChip}
                            onPress={() => handleQuickAddTodo(todo)}
                          >
                            <Text style={styles.todoSuggestionText}>
                              + {isSpanish ? todo.es : todo.en}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {/* Quick topics after conversation */}
              <Text style={styles.moreTopicsLabel}>
                {isSpanish ? '¿Más preguntas?' : 'More questions?'}
              </Text>
              <View style={styles.quickTopicsRow}>
                {AI_TOPICS.map((topic) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={styles.quickTopicChip}
                    onPress={() => handleAITopic(topic.id)}
                  >
                    <Text style={styles.quickTopicText}>
                      {topic.icon} {isSpanish ? topic.labelEs : topic.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.aiInputContainer}>
            <TextInput
              style={styles.aiInput}
              value={userInput}
              onChangeText={setUserInput}
              placeholder={isSpanish ? 'Escribe tu pregunta...' : 'Type your question...'}
              placeholderTextColor="#94A3B8"
              multiline
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity style={styles.aiSendButton} onPress={handleSendMessage}>
              <Text style={styles.aiSendText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {isSpanish ? '¡Hola' : 'Hello'}, {userProfile?.name || 'Friend'}! 👋
            </Text>
            <Text style={styles.subtitle}>
              {isSpanish ? 'Tus recursos personalizados' : 'Your personalized resources'}
            </Text>
          </View>
        </View>

        {/* Share Code Card */}
        {userProfile?.shareCode && (
          <TouchableOpacity style={styles.shareCodeCard} onPress={handleCopyCode}>
            <View style={styles.shareCodeContent}>
              <Text style={styles.shareCodeLabel}>
                {isSpanish ? 'Tu Código de Compartir' : 'Your Share Code'}
              </Text>
              <Text style={styles.shareCode}>{userProfile.shareCode}</Text>
            </View>
            <View style={styles.copyButton}>
              <Text style={styles.copyButtonText}>
                {codeCopied ? '✓' : isSpanish ? 'Copiar' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Grid */}
        <Text style={styles.sectionHeader}>
          {isSpanish ? 'Explorar Recursos' : 'Explore Resources'}
        </Text>
        {renderCategoryGrid()}

        {/* Todos */}
        {renderTodos()}

        {/* Quick Help */}
        <View style={styles.quickHelpSection}>
          <Text style={styles.sectionHeader}>
            {isSpanish ? 'Ayuda Rápida' : 'Quick Help'}
          </Text>
          <View style={styles.quickHelpGrid}>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('211'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>📞</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Llamar 211' : 'Call 211'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('food'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>🍽️</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Comida' : 'Food'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickHelpCard}
              onPress={() => {
                setShowAI(true);
                setTimeout(() => handleAITopic('documents'), 100);
              }}
            >
              <Text style={styles.quickHelpIcon}>🪪</Text>
              <Text style={styles.quickHelpLabel}>{isSpanish ? 'Documentos' : 'Documents'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* AI Modal */}
      {renderAIModal()}

      {/* Add Todo Modal */}
      {renderAddTodoModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  shareCodeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  shareCodeContent: {
    flex: 1,
  },
  shareCodeLabel: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareCode: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '47%',
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  todosSection: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 14,
  },
  todoText: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  moreText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  quickHelpSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickHelpCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickHelpIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickHelpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  // AI Modal Styles
  aiContainer: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  aiCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCloseText: {
    fontSize: 18,
    color: '#64748B',
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiSpacer: {
    width: 40,
  },
  aiContent: {
    flex: 1,
  },
  aiWelcome: {
    padding: 24,
  },
  aiWelcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiWelcomeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  aiTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiTopicCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiTopicIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  aiTopicLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  chatContainer: {
    padding: 20,
  },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#0D9488',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#0F172A',
  },
  quickTopicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  quickTopicChip: {
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  quickTopicText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FEFEFE',
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  aiSendText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // New styles for enhanced features
  aiCategoryCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  categorySubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  todoHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  todoHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  addTodoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTodoButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -2,
  },
  emptyTodos: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTodosEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTodosText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  todoCheckmark: {
    color: '#0D9488',
    fontSize: 14,
  },
  todoDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoDeleteText: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: '600',
  },
  // Add Todo Modal Styles
  addTodoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addTodoModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  addTodoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addTodoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  addTodoClose: {
    fontSize: 28,
    color: '#64748B',
  },
  addTodoInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  addTodoSubmit: {
    backgroundColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  addTodoSubmitDisabled: {
    backgroundColor: '#CBD5E1',
  },
  addTodoSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Todo Suggestions in AI
  todoSuggestionsContainer: {
    marginLeft: 0,
    marginBottom: 16,
    paddingLeft: 8,
  },
  todoSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  todoSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  todoSuggestionChip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todoSuggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  // AI Modal enhancements
  aiTitleContainer: {
    alignItems: 'center',
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  aiWelcomeEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 16,
  },
  moreTopicsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 24,
    marginBottom: 8,
  },
});
