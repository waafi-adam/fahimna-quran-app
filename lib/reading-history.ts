import { storage } from '@/lib/storage';

export type ReadingHistoryEntry = {
  page: number;
  timestamp: number;
};

const STORAGE_KEY = 'readingHistory';
const MAX_HISTORY = 20;

// In-memory cache
let _history: ReadingHistoryEntry[] | null = null;

function getStore(): ReadingHistoryEntry[] {
  if (_history == null) {
    _history = storage.get<ReadingHistoryEntry[]>(STORAGE_KEY, []);
  }
  return _history;
}

function save() {
  storage.set(STORAGE_KEY, getStore());
  notify();
}

// Change notification
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function onReadingHistoryChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getReadingHistory(): ReadingHistoryEntry[] {
  return getStore();
}

export function recordPageVisit(page: number): void {
  const store = getStore();
  // Remove existing entry for this page (dedup)
  const idx = store.findIndex((e) => e.page === page);
  if (idx >= 0) {
    store.splice(idx, 1);
  }
  // Add to end (most recent)
  store.push({ page, timestamp: Date.now() });
  // Cap at MAX_HISTORY
  while (store.length > MAX_HISTORY) {
    store.shift();
  }
  _history = store;
  save();
}
