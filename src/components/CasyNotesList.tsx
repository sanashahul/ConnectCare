/**
 * CasyNotesList - the "Casy Notes" for one category: every conversation the
 * person had with Casy on this tab, saved by date. Tap a note to reopen the
 * full conversation ("the things discussed").
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { CasyAvatar } from './CasyAvatar';
import { CasyNote, ServiceCategory } from '../types';

interface Props {
  category: ServiceCategory;
  isSpanish: boolean;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatWhen = (iso: string, isSpanish: boolean): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = isSpanish ? MONTHS_ES : MONTHS_EN;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h12}:${m} ${ampm}`;
};

export const CasyNotesList: React.FC<Props> = ({ category, isSpanish }) => {
  const { state, dispatch } = useApp();
  const [openNote, setOpenNote] = useState<CasyNote | null>(null);

  const notes = (state.userProfile?.casyNotes || [])
    .filter((n) => n.category === category)
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

  const confirmDelete = (note: CasyNote) => {
    Alert.alert(
      isSpanish ? 'Eliminar nota' : 'Delete note',
      isSpanish ? '¿Eliminar esta conversación guardada?' : 'Delete this saved conversation?',
      [
        { text: isSpanish ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: isSpanish ? 'Eliminar' : 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'DELETE_CASY_NOTE', payload: note.id });
            setOpenNote(null);
          },
        },
      ]
    );
  };

  if (notes.length === 0) {
    return (
      <View style={styles.empty}>
        <CasyAvatar size={44} />
        <Text style={styles.emptyTitle}>
          {isSpanish ? 'Aún no hay notas' : 'No notes yet'}
        </Text>
        <Text style={styles.emptyText}>
          {isSpanish
            ? 'Cuando hables con Casy aquí, tus conversaciones se guardan por fecha para que puedas volver a abrirlas.'
            : 'When you chat with Casy here, your conversations are saved by date so you can reopen them.'}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.hint}>
        {isSpanish
          ? 'Tus conversaciones con Casy, guardadas por fecha.'
          : 'Your conversations with Casy, saved by date.'}
      </Text>

      {notes.map((note) => (
        <TouchableOpacity
          key={note.id}
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => setOpenNote(note)}
        >
          <View style={styles.cardIcon}>
            <CasyAvatar size={30} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardDate}>{formatWhen(note.updatedAt || note.createdAt, isSpanish)}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {note.title}
            </Text>
            <Text style={styles.cardMeta}>
              {note.messages.length}{' '}
              {isSpanish
                ? note.messages.length === 1 ? 'mensaje' : 'mensajes'
                : note.messages.length === 1 ? 'message' : 'messages'}
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Note detail: the full conversation */}
      <Modal visible={!!openNote} animationType="slide" onRequestClose={() => setOpenNote(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOpenNote(null)} style={styles.modalBack}>
              <Text style={styles.modalBackText}>← {isSpanish ? 'Volver' : 'Back'}</Text>
            </TouchableOpacity>
            {!!openNote && (
              <TouchableOpacity onPress={() => confirmDelete(openNote)}>
                <Text style={styles.modalDelete}>{isSpanish ? 'Eliminar' : 'Delete'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!openNote && (
            <>
              <View style={styles.modalTitleRow}>
                <CasyAvatar size={28} />
                <Text style={styles.modalDate}>
                  {formatWhen(openNote.createdAt, isSpanish)}
                </Text>
              </View>
              <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {openNote.messages.map((m, i) => (
                  <View
                    key={i}
                    style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleCasy]}
                  >
                    <Text style={[styles.bubbleRole, m.role === 'user' ? styles.roleUser : styles.roleCasy]}>
                      {m.role === 'user' ? (isSpanish ? 'Tú' : 'You') : 'Casy'}
                    </Text>
                    <Text style={[styles.bubbleText, m.role === 'user' && { color: '#FFFFFF' }]}>
                      {m.content}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardIcon: { width: 34, alignItems: 'center' },
  cardDate: { fontSize: 12, color: '#0D9488', fontWeight: '800' },
  cardTitle: { fontSize: 15, color: '#0F172A', fontWeight: '600', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  cardArrow: { fontSize: 22, color: '#CBD5E1', fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  emptyText: { fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20, marginTop: 6 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalBack: { paddingVertical: 4 },
  modalBackText: { fontSize: 16, color: '#0D9488', fontWeight: '700' },
  modalDelete: { fontSize: 15, color: '#DC2626', fontWeight: '700' },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalDate: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  modalBody: { flex: 1 },
  bubble: { borderRadius: 16, padding: 12, marginBottom: 10, maxWidth: '90%' },
  bubbleUser: { backgroundColor: '#0D9488', alignSelf: 'flex-end' },
  bubbleCasy: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start' },
  bubbleRole: { fontSize: 11, fontWeight: '800', marginBottom: 3 },
  roleUser: { color: '#CCFBF1' },
  roleCasy: { color: '#0D9488' },
  bubbleText: { fontSize: 14.5, color: '#0F172A', lineHeight: 20 },
});
