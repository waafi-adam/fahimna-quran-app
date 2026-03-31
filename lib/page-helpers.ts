import type { PageData, AyahLine, Word, Language } from '@/types/quran';
import { getChapter, getPage } from '@/lib/quran-data';

// === Section types for WBW / Sentence layouts ===

export type AyahSection = { type: 'ayah'; surah: number; verse: number; words: Word[] };
export type SurahSection = { type: 'surah_name'; surah: number };
export type BismillahSection = { type: 'bismillah' };
export type PageSection = AyahSection | SurahSection | BismillahSection;

/**
 * Extract logical sections from a page — merges words across mushaf lines
 * into complete ayahs. Also synthesizes bismillah lines from chapter data
 * (mushaf data omits them since they're decorative).
 */
export function getPageSections(page: PageData): PageSection[] {
  const sections: PageSection[] = [];
  const ayahWordMap = new Map<string, Word[]>();

  for (const line of page.lines) {
    if (line.type === 'surah_name') {
      sections.push({ type: 'surah_name', surah: line.surah });
      const chapter = getChapter(line.surah);
      if (chapter?.bismillahPre) {
        sections.push({ type: 'bismillah' });
      }
      continue;
    }
    if (line.type === 'bismillah') {
      sections.push({ type: 'bismillah' });
      continue;
    }
    // type === 'ayah'
    for (const word of line.words) {
      const key = `${word.s}:${word.v}`;
      if (!ayahWordMap.has(key)) {
        const words: Word[] = [];
        ayahWordMap.set(key, words);
        sections.push({ type: 'ayah', surah: word.s, verse: word.v, words });
      }
      ayahWordMap.get(key)!.push(word);
    }
  }

  return sections;
}

/** Get unique surah numbers on a page (from ayah words) */
export function getSurahsOnPage(page: PageData): number[] {
  const surahs = new Set<number>();
  for (const line of page.lines) {
    if (line.type === 'ayah') {
      for (const word of line.words) {
        surahs.add(word.s);
      }
    }
  }
  return [...surahs];
}

/** Get WBW meaning for the user's chosen language */
export function getWordMeaning(word: Word, lang: Language): string {
  switch (lang) {
    case 'en': return word.m;
    case 'id': return word.mi;
    case 'ur': return word.mu;
  }
}

/** Find which page (1-604) contains a given surah:ayah */
export function getAyahPage(surah: number, ayah: number): number {
  const chapter = getChapter(surah);
  if (!chapter) return 1;
  for (let p = chapter.startPage; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (word.s === surah && word.v === ayah) return p;
      }
    }
  }
  return chapter.startPage;
}

/** Get all words on a page (flattened from ayah lines) */
export function getAllWords(page: PageData): Word[] {
  return page.lines
    .filter((l): l is AyahLine => l.type === 'ayah')
    .flatMap((l) => l.words);
}
