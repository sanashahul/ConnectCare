/**
 * CategoryTodoList - shows the user's to-do items for a single category
 * (health, jobs, or housing), used inside each category screen so people see
 * only the tasks relevant to that area.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useApp } from '../context/AppContext';

interface Props {
  category: 'healthcare' | 'employment' | 'housing';
  isSpanish: boolean;
}

const TITLES: Record<string, { en: string; es: string }> = {
  healthcare: { en: 'My Health To-Dos', es: 'Mis Tareas de Salud' },
  employment: { en: 'My Job To-Dos', es: 'Mis Tareas de Empleo' },
  housing: { en: 'My Housing To-Dos', es: 'Mis Tareas de Vivienda' },
};

export const CategoryTodoList: React.FC<Props> = ({ category, isSpanish }) => {
  const { state, dispatch } = useApp();
  const all = (state.userProfile?.todos || []).filter((t) => t.category === category);
  const pending = all.filter((t) => !t.completed);
  const done = all.filter((t) => t.completed);
  const title = isSpanish ? TITLES[category].es : TITLES[category].en;

  const renderItem = (todo: any) => (
    <View key={todo.id} style={styles.item}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.checkbox, todo.completed && styles.checkboxDone]}
          onPress={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
        >
          <Text style={styles.check}>{todo.completed ? '✓' : ''}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, todo.completed && styles.titleDone]}>{todo.title}</Text>
          {!!todo.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {todo.description}
            </Text>
          )}
        </View>
      </View>
      {(!!todo.resourcePhone || !!todo.resourceUrl) && (
        <View style={styles.actions}>
          {!!todo.resourcePhone && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${todo.resourcePhone}`)}
            >
              <Text style={styles.actionText}>📞 {isSpanish ? 'Llamar' : 'Call'}</Text>
            </TouchableOpacity>
          )}
          {!!todo.resourceUrl && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(todo.resourceUrl)}
            >
              <Text style={styles.actionText}>🌐 {isSpanish ? 'Sitio' : 'Website'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View>
      <Text style={styles.header}>{title}</Text>

      {all.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyText}>
            {isSpanish
              ? 'Aún no hay tareas aquí. Pídele a Casy que agregue una.'
              : 'No tasks here yet. Ask Casy to add one.'}
          </Text>
        </View>
      ) : (
        <>
          {pending.map(renderItem)}
          {done.length > 0 && (
            <>
              <Text style={styles.doneLabel}>{isSpanish ? 'Completadas' : 'Completed'}</Text>
              {done.map(renderItem)}
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  check: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  title: { fontSize: 15.5, fontWeight: '600', color: '#0F172A' },
  titleDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  desc: { fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 36 },
  actionBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  actionText: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  doneLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 34, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
});
