import { useState, useEffect } from 'react';
import { onBookmarkChange } from '@/lib/bookmarks';

/**
 * Returns a version number that increments on every bookmark change.
 * Use to force re-renders when bookmarks are added or removed.
 */
export function useBookmarkVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return onBookmarkChange(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  return version;
}
