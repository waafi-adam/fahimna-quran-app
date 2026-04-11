import { useSyncExternalStore, useCallback } from 'react';
import { onStatusChange } from '@/lib/word-status';
import { onReviewChange, countDueAndNewKeys, lemmaReviewKey } from '@/lib/review-store';
import {
  getLearningArabicForms,
  getLearningLemmaIds,
  getOrphanLearningForms,
} from '@/lib/flashcard-data';
import type { FlashcardMode } from '@/types/quran';

export function useDueCount(mode: FlashcardMode = 'exact'): number {
  // Subscribe to both word-status changes and review-record changes
  const subscribe = useCallback((cb: () => void) => {
    const unsub1 = onStatusChange(cb);
    const unsub2 = onReviewChange(cb);
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return useSyncExternalStore(subscribe, () => {
    if (mode === 'exact') {
      return countDueAndNewKeys(getLearningArabicForms());
    }
    // Lemma mode: lemma cards + orphan exact cards
    const lemmaKeys = getLearningLemmaIds().map(lemmaReviewKey);
    return (
      countDueAndNewKeys(lemmaKeys) +
      countDueAndNewKeys(getOrphanLearningForms())
    );
  });
}
