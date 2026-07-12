/**
 * useCasyNoteRouter - routes each Casy chat exchange to the right category's
 * notes by topic. In a single conversation, a message about health lands in
 * Health notes and a later message about housing lands in Housing notes.
 *
 * Usage: call record(userMessage, reply, fallback) after each exchange, and
 * reset() when the chat closes so the next chat starts fresh notes.
 */
import { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { classifyCategory, NoteCategory } from '../services/aiService';

type Bucket = { id: string; createdAt: string; messages: { role: 'user' | 'model'; content: string }[] };

export function useCasyNoteRouter() {
  const { dispatch } = useApp();
  // One note bucket per category, for the life of this chat session.
  const buckets = useRef<Record<string, Bucket>>({});

  const reset = () => {
    buckets.current = {};
  };

  const record = async (
    userMessage: string,
    reply: string,
    fallback: NoteCategory,
    isSpanish: boolean
  ) => {
    let cat = await classifyCategory(userMessage);
    // If it doesn't clearly fit a tab, keep it with wherever the chat started
    // (the tab you opened Casy from). On the dashboard, fallback is 'general'.
    if (cat === 'general') cat = fallback;

    const key = cat;
    const bucket =
      buckets.current[key] ||
      (buckets.current[key] = {
        id: `note_${Date.now()}_${Math.floor(Math.random() * 1e6)}_${key}`,
        createdAt: new Date().toISOString(),
        messages: [],
      });
    bucket.messages.push({ role: 'user', content: userMessage }, { role: 'model', content: reply });

    const firstUser = bucket.messages.find((m) => m.role === 'user')?.content || '';
    const title = firstUser
      ? firstUser.length > 64 ? `${firstUser.slice(0, 64)}…` : firstUser
      : isSpanish ? 'Conversación con Casy' : 'Chat with Casy';

    dispatch({
      type: 'SAVE_CASY_NOTE',
      payload: {
        id: bucket.id,
        category: cat,
        createdAt: bucket.createdAt,
        updatedAt: new Date().toISOString(),
        title,
        messages: [...bucket.messages],
      },
    });
  };

  return { record, reset };
}
