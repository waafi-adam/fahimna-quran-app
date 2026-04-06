import 'expo-sqlite/localStorage/install';
import type { ReviewRecord } from '@/types/quran';
import { isDue, defaultReviewRecord } from '@/lib/srs';
import { onWordStatusSet } from '@/lib/word-status';

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

/** Create a review record for a newly "learning" word (if it doesn't already exist) */
export function ensureReviewRecord(arabic: string): void {
  if (!getStore()[arabic]) {
    getStore()[arabic] = defaultReviewRecord();
    scheduleSave();
    notify();
  }
}

export function getDueCount(): number {
  const store = getStore();
  let count = 0;
  for (const record of Object.values(store)) {
    if (isDue(record)) count++;
  }
  return count;
}

export function getDueArabicForms(): string[] {
  const store = getStore();
  const due: string[] = [];
  for (const [arabic, record] of Object.entries(store)) {
    if (isDue(record)) due.push(arabic);
  }
  return due;
}

export function getAllReviewedForms(): string[] {
  return Object.keys(getStore());
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

// === Auto-sync: word status changes → review records ===

onWordStatusSet((arabic, status) => {
  if (status === 'learning') {
    ensureReviewRecord(arabic);
  } else {
    // "new" or "known" (manually set) → remove from flashcard deck
    if (getReviewRecord(arabic)) {
      removeReviewRecord(arabic);
    }
  }
});
