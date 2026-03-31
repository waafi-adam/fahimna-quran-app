import { storage } from '@/lib/storage';

export type Bookmark = {
  page: number;
  sura?: number;
  ayah?: number;
  timestamp: number;
};

const STORAGE_KEY = 'bookmarks';

// In-memory cache
let _bookmarks: Bookmark[] | null = null;

function getStore(): Bookmark[] {
  if (_bookmarks == null) {
    _bookmarks = storage.get<Bookmark[]>(STORAGE_KEY, []);
  }
  return _bookmarks;
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

export function onBookmarkChange(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getBookmarks(): Bookmark[] {
  return getStore();
}

export function isPageBookmarked(page: number): boolean {
  return getStore().some((b) => b.page === page && b.sura == null);
}

export function isAyahBookmarked(sura: number, ayah: number): boolean {
  return getStore().some((b) => b.sura === sura && b.ayah === ayah);
}

export function togglePageBookmark(page: number): void {
  const store = getStore();
  const idx = store.findIndex((b) => b.page === page && b.sura == null);
  if (idx >= 0) {
    store.splice(idx, 1);
  } else {
    store.push({ page, timestamp: Date.now() });
  }
  _bookmarks = store;
  save();
}

export function toggleAyahBookmark(sura: number, ayah: number, page: number): void {
  const store = getStore();
  const idx = store.findIndex((b) => b.sura === sura && b.ayah === ayah);
  if (idx >= 0) {
    store.splice(idx, 1);
  } else {
    store.push({ page, sura, ayah, timestamp: Date.now() });
  }
  _bookmarks = store;
  save();
}

export function removeBookmark(bookmark: Bookmark): void {
  const store = getStore();
  const idx = bookmark.sura != null
    ? store.findIndex((b) => b.sura === bookmark.sura && b.ayah === bookmark.ayah)
    : store.findIndex((b) => b.page === bookmark.page && b.sura == null);
  if (idx >= 0) {
    store.splice(idx, 1);
    _bookmarks = store;
    save();
  }
}
