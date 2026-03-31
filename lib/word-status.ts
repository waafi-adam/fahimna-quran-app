import 'expo-sqlite/localStorage/install';
import type { Word, WordStatus, PropagationMode } from '@/types/quran';
import { getRootById, getLemmaById, isVerseMarker } from '@/lib/quran-data';

const NUM_TO_STATUS: WordStatus[] = ['new', 'learning', 'known'];
const STATUS_TO_NUM: Record<WordStatus, number> = { new: 0, learning: 1, known: 2 };

const STORAGE_KEY = 'word-statuses';

// In-memory status store — sparse (only non-"new" entries stored)
let _statuses: Record<string, number> | null = null;

function getStore(): Record<string, number> {
  if (_statuses == null) {
    _statuses = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  }
  return _statuses!;
}

// Debounced persistence
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStore()));
  }, 500);
}

// Change notification
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to any word status change. Returns unsubscribe function. */
export function onStatusChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const wordKey = (word: Word) => `${word.s}:${word.v}:${word.w}`;

/** Get a word's current status */
export function getWordStatus(word: Word): WordStatus {
  if (isVerseMarker(word)) return 'known';
  return NUM_TO_STATUS[getStore()[wordKey(word)] ?? 0];
}

/** Set a word's status with propagation. Returns number of words updated. */
export function setWordStatus(
  word: Word,
  status: WordStatus,
  propagation: PropagationMode,
): number {
  const num = STATUS_TO_NUM[status];
  const store = getStore();
  let updated = 0;

  const setKey = (key: string) => {
    if (num === 0) {
      delete store[key];
    } else {
      store[key] = num;
    }
    updated++;
  };

  if (propagation === 'exact' || (word.ri == null && word.li == null)) {
    setKey(wordKey(word));
  } else if (propagation === 'lemma' && word.li != null) {
    const lemma = getLemmaById(word.li);
    if (lemma) {
      for (const loc of lemma.words) setKey(loc);
    }
  } else if (propagation === 'root' && word.ri != null) {
    const root = getRootById(word.ri);
    if (root) {
      for (const loc of root.words) setKey(loc);
    }
  }

  if (updated > 0) {
    scheduleSave();
    notify();
  }
  return updated;
}

/** Get status counts for a list of words (skips verse markers) */
export function getWordCounts(
  words: Word[],
): { new: number; learning: number; known: number; total: number } {
  let n = 0,
    l = 0,
    k = 0;
  for (const w of words) {
    if (isVerseMarker(w)) continue;
    const s = getWordStatus(w);
    if (s === 'new') n++;
    else if (s === 'learning') l++;
    else k++;
  }
  return { new: n, learning: l, known: k, total: n + l + k };
}

/** Reset all word progress */
export function resetAllProgress(): void {
  _statuses = {};
  localStorage.removeItem(STORAGE_KEY);
  notify();
}
