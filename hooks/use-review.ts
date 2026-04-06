import { useSyncExternalStore } from 'react';
import { getDueCount, onReviewChange } from '@/lib/review-store';

export function useDueCount(): number {
  return useSyncExternalStore(
    onReviewChange,
    () => getDueCount(),
  );
}
