import { useSyncExternalStore } from 'react';
import type { Word, WordStatus } from '@/types/quran';
import { getWordStatus, onStatusChange } from '@/lib/word-status';

/** React hook — returns word status, re-renders on any status change */
export function useWordStatus(word: Word): WordStatus {
  return useSyncExternalStore(
    onStatusChange,
    () => getWordStatus(word),
  );
}

/** Forces a re-render whenever any word status changes. Use in page-level components. */
let _version = 0;
const subscribe = (cb: () => void) => {
  return onStatusChange(() => {
    _version++;
    cb();
  });
};
export function useWordStatusVersion(): number {
  return useSyncExternalStore(subscribe, () => _version);
}
