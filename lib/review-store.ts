import 'expo-sqlite/localStorage/install';
import type { ReviewRecord } from '@/types/quran';
import { isDue, defaultReviewRecord } from '@/lib/srs';

const STORAGE_KEY = 'reviews';
const STATS_KEY = 'review-stats';

// In-memory store — keyed by a generic string:
//   - Exact cards use the raw Arabic form
//   - Lemma cards use `lemma:${lemmaId}`
// Arabic forms never contain ASCII ':' so the prefix is collision-safe.
let _records: Record<string, ReviewRecord> | null = null;

export const lemmaReviewKey = (lemmaId: number): string => `lemma:${lemmaId}`;

function getStore(): Record<string, ReviewRecord> {
  if (_records == null) {
    _records = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  }
  return _records!;
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

export function onReviewChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// === Public API ===

export function getReviewRecord(key: string): ReviewRecord | null {
  return getStore()[key] ?? null;
}

export function setReviewRecord(key: string, record: ReviewRecord): void {
  getStore()[key] = record;
  scheduleSave();
  notify();
}

export function removeReviewRecord(key: string): void {
  delete getStore()[key];
  scheduleSave();
  notify();
}

/**
 * Given a list of review keys (exact arabic forms or `lemma:<id>`), return
 * those that are due for review: either new (no record) or with a due record.
 */
export function getDueAndNewKeys(keys: string[]): string[] {
  const store = getStore();
  const result: string[] = [];
  for (const key of keys) {
    const record = store[key];
    if (!record || isDue(record)) {
      result.push(key);
    }
  }
  return result;
}

/** Count how many keys are due or new */
export function countDueAndNewKeys(keys: string[]): number {
  const store = getStore();
  let count = 0;
  for (const key of keys) {
    const record = store[key];
    if (!record || isDue(record)) count++;
  }
  return count;
}

// --- Back-compat aliases (exact-mode API) ---
export const getDueAndNewForms = getDueAndNewKeys;
export const countDueAndNew = countDueAndNewKeys;

// === Daily stats ===

type DailyStats = {
  date: string; // YYYY-MM-DD
  reviewed: number;
  graduated: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStatsStore(): Record<string, DailyStats> {
  return JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}');
}

function saveStatsStore(store: Record<string, DailyStats>): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(store));
}

export function recordReview(graduated: boolean): void {
  const store = getStatsStore();
  const key = todayKey();
  if (!store[key]) store[key] = { date: key, reviewed: 0, graduated: 0 };
  store[key].reviewed++;
  if (graduated) store[key].graduated++;
  saveStatsStore(store);
}

export function getTodayStats(): DailyStats {
  const store = getStatsStore();
  return store[todayKey()] ?? { date: todayKey(), reviewed: 0, graduated: 0 };
}

export function getStreak(): number {
  const store = getStatsStore();
  let streak = 0;
  const date = new Date();

  // Check if today has reviews — if so, include today
  const todayStats = store[todayKey()];
  if (!todayStats || todayStats.reviewed === 0) {
    // No reviews today yet — start counting from yesterday
    date.setDate(date.getDate() - 1);
  }

  while (true) {
    const key = date.toISOString().slice(0, 10);
    const stats = store[key];
    if (stats && stats.reviewed > 0) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
