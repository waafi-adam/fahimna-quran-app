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

export type DailyStats = {
  date: string; // YYYY-MM-DD
  reviewed: number;
  graduated: number;
  promoted: number; // new → learning transitions today
  mastered: number; // new/learning → known transitions today
};

function emptyStats(date: string): DailyStats {
  return { date, reviewed: 0, graduated: 0, promoted: 0, mastered: 0 };
}

/** Coerce any value to a finite number; anything else (object, NaN, undefined) becomes 0. */
function toNum(v: unknown, warnKey?: string): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (__DEV__ && v != null && typeof v !== 'number') {
    // eslint-disable-next-line no-console
    console.warn(
      `[review-store] non-numeric stat coerced to 0${warnKey ? ` at ${warnKey}` : ''}:`,
      v,
    );
  }
  return 0;
}

function ensureFields(raw: unknown, fallbackDate?: string): DailyStats {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const date = typeof s.date === 'string' ? s.date : (fallbackDate ?? todayKey());
  return {
    date,
    reviewed: toNum(s.reviewed, `${date}.reviewed`),
    graduated: toNum(s.graduated, `${date}.graduated`),
    promoted: toNum(s.promoted, `${date}.promoted`),
    mastered: toNum(s.mastered, `${date}.mastered`),
  };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return dateKey(new Date());
}

function getStatsStore(): Record<string, DailyStats> {
  const raw: unknown = JSON.parse(localStorage.getItem(STATS_KEY) ?? '{}');
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, DailyStats> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = ensureFields(v, k);
  }
  return out;
}

// One-time sanitization on module load: rewrite the stats store through
// ensureFields so any legacy/corrupt entries get normalized to numbers.
(function sanitizeStatsStoreOnLoad() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const clean: Record<string, DailyStats> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      clean[k] = ensureFields(v, k);
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(clean));
  } catch {
    // best-effort — if parsing fails, reset to empty
    localStorage.setItem(STATS_KEY, '{}');
  }
})();

function saveStatsStore(store: Record<string, DailyStats>): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(store));
}

function bumpToday(field: 'reviewed' | 'graduated' | 'promoted' | 'mastered', by: number): void {
  if (by <= 0) return;
  const store = getStatsStore();
  const key = todayKey();
  const existing = store[key] ? ensureFields(store[key]) : emptyStats(key);
  existing[field] += by;
  store[key] = existing;
  saveStatsStore(store);
  listeners.forEach((fn) => fn());
}

export function recordReview(graduated: boolean): void {
  const store = getStatsStore();
  const key = todayKey();
  const existing = store[key] ? ensureFields(store[key]) : emptyStats(key);
  existing.reviewed++;
  if (graduated) existing.graduated++;
  store[key] = existing;
  saveStatsStore(store);
  listeners.forEach((fn) => fn());
}

export function recordPromoted(count = 1): void {
  bumpToday('promoted', count);
}

export function recordMastered(count = 1): void {
  bumpToday('mastered', count);
}

export function getTodayStats(): DailyStats {
  const store = getStatsStore();
  return store[todayKey()] ? ensureFields(store[todayKey()]) : emptyStats(todayKey());
}

/** Get daily stats for a date range (inclusive), oldest first. Missing days are zeros. */
export function getDailyStatsRange(fromDate: Date, toDate: Date): DailyStats[] {
  const store = getStatsStore();
  const result: DailyStats[] = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const k = dateKey(cursor);
    result.push(store[k] ? ensureFields(store[k]) : emptyStats(k));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
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
