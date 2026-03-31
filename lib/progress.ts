import type { PageData, Juz } from '@/types/quran';
import { getPage, getChapter, isVerseMarker } from '@/lib/quran-data';
import { getWordStatus } from '@/lib/word-status';

export type ProgressCounts = {
  new: number;
  learning: number;
  known: number;
  total: number;
};

/** Compute word status counts for a single page */
export function getPageProgress(page: PageData): ProgressCounts {
  let n = 0,
    l = 0,
    k = 0;
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const word of line.words) {
      if (isVerseMarker(word)) continue;
      const s = getWordStatus(word);
      if (s === 'new') n++;
      else if (s === 'learning') l++;
      else k++;
    }
  }
  return { new: n, learning: l, known: k, total: n + l + k };
}

/** Compute word status counts for a surah (scans relevant pages) */
export function getSurahProgress(surahId: number): ProgressCounts {
  const chapter = getChapter(surahId);
  if (!chapter) return { new: 0, learning: 0, known: 0, total: 0 };

  let n = 0,
    l = 0,
    k = 0;

  for (let p = chapter.startPage; p <= 604; p++) {
    const page = getPage(p);
    let foundSurah = false;
    let pastSurah = false;

    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (word.s === surahId) {
          foundSurah = true;
          if (isVerseMarker(word)) continue;
          const s = getWordStatus(word);
          if (s === 'new') n++;
          else if (s === 'learning') l++;
          else k++;
        } else if (foundSurah) {
          pastSurah = true;
        }
      }
    }

    if (pastSurah || (!foundSurah && p > chapter.startPage)) break;
  }

  return { new: n, learning: l, known: k, total: n + l + k };
}

/** Comprehension % = (learning + known) / total */
export function comprehensionPercent(counts: ProgressCounts): number {
  if (counts.total === 0) return 0;
  return Math.round(((counts.known + counts.learning) / counts.total) * 100);
}

/** Known % = known / total */
export function knownPercent(counts: ProgressCounts): number {
  if (counts.total === 0) return 0;
  return Math.round((counts.known / counts.total) * 100);
}

/** Compute word status counts across all 604 pages */
export function getOverallProgress(): ProgressCounts {
  let n = 0, l = 0, k = 0;
  for (let p = 1; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;
        const s = getWordStatus(word);
        if (s === 'new') n++;
        else if (s === 'learning') l++;
        else k++;
      }
    }
  }
  return { new: n, learning: l, known: k, total: n + l + k };
}

/** Compute word status counts for a juz using its verseMapping */
export function getJuzProgress(juz: Juz): ProgressCounts {
  // Build a set of surah:ayah ranges from verseMapping
  const ranges: { surah: number; from: number; to: number }[] = [];
  for (const [surahStr, rangeStr] of Object.entries(juz.verseMapping)) {
    const surah = Number(surahStr);
    const [from, to] = rangeStr.split('-').map(Number);
    ranges.push({ surah, from, to });
  }

  // Find page range: first surah's startPage through last surah's pages
  const firstSurah = ranges[0].surah;
  const lastSurah = ranges[ranges.length - 1].surah;
  const startPage = getChapter(firstSurah)?.startPage ?? 1;
  // End page: either next surah's startPage - 1, or 604
  const nextChapter = getChapter(lastSurah + 1);
  const endPage = nextChapter ? nextChapter.startPage : 604;

  let n = 0, l = 0, k = 0;
  for (let p = startPage; p <= endPage; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;
        // Check if this word belongs to this juz
        const match = ranges.find(
          (r) => word.s === r.surah && word.v >= r.from && word.v <= r.to,
        );
        if (!match) continue;
        const s = getWordStatus(word);
        if (s === 'new') n++;
        else if (s === 'learning') l++;
        else k++;
      }
    }
  }
  return { new: n, learning: l, known: k, total: n + l + k };
}
