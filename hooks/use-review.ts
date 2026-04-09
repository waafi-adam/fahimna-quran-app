import { useSyncExternalStore, useCallback } from 'react';
import { onStatusChange } from '@/lib/word-status';
import { onReviewChange, countDueAndNew } from '@/lib/review-store';
import { getLearningArabicForms } from '@/lib/flashcard-data';

export function useDueCount(): number {
  // Subscribe to both word-status changes and review-record changes
  const subscribe = useCallback((cb: () => void) => {
    const unsub1 = onStatusChange(cb);
    const unsub2 = onReviewChange(cb);
    return () => { unsub1(); unsub2(); };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => countDueAndNew(getLearningArabicForms()),
  );
}
