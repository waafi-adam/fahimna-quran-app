import { useState, useEffect } from 'react';
import { onReadingHistoryChange } from '@/lib/reading-history';

export function useReadingHistoryVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    return onReadingHistoryChange(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  return version;
}
