import { useState, useEffect, useCallback } from 'react';
import type { Word, WordStatus } from '@/types/quran';
import { getWordStatus, onStatusChange } from '@/lib/word-status';

/** React hook — returns word status, re-renders when any status changes */
export function useWordStatus(word: Word): WordStatus {
  const [status, setStatus] = useState(() => getWordStatus(word));

  useEffect(() => {
    // Re-read on mount in case it changed between render and effect
    setStatus(getWordStatus(word));

    return onStatusChange(() => {
      setStatus(getWordStatus(word));
    });
  }, [word.s, word.v, word.w]);

  return status;
}

/**
 * Returns a version number that increments on every word status change.
 * Use in page-level components to force re-render when any word changes.
 */
export function useWordStatusVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return onStatusChange(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  return version;
}
