import 'expo-sqlite/localStorage/install';
import type { ReviewRecord } from '@/types/quran';
import { isDue, defaultReviewRecord } from '@/lib/srs';

const STORAGE_KEY = 'reviews';
const STATS_KEY = 'review-stats';

// In-memory store — keyed by exact Arabic form
let _records: Record<string, ReviewRecord> | null = null;

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

export function getReviewRecord(arabic: string): ReviewRecord | null {
  return getStore()[arabic] ?? null;
}

export function setReviewRecord(arabic: string, record: ReviewRecord): void {
  getStore()[arabic] = record;
  scheduleSave();
  notify();
}

export function removeReviewRecord(arabic: string): void {
  delete getStore()[arabic];
  scheduleSave();
  notify();
}

/**
 * Given all "learning" Arabic forms (from word-status), return those that are
 * due for review: either new (no review record) or have a due record.
 */
export function getDueAndNewForms(learningForms: string[]): string[] {
  const store = getStore();
  const result: string[] = [];
  for (const arabic of learningForms) {
    const record = store[arabic];
    if (!record || isDue(record)) {
      result.push(arabic);
    }
  }
  return result;
}

/** Count how many learning forms are due or new */
export function countDueAndNew(learningForms: string[]): number {
  const store = getStore();
  let count = 0;
  for (const arabic of learningForms) {
    const record = store[arabic];
    if (!record || isDue(record)) count++;
  }
  return count;
}

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
