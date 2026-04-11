import { getPage, getTranslation, isVerseMarker } from '@/lib/quran-data';
import { getAyahPage, getWordMeaning } from '@/lib/page-helpers';
import type { Language, AyahLine } from '@/types/quran';

export type AyahWord = { text: string; isMatch: boolean };

export type Occurrence = {
  key: string;
  surah: number;
  ayah: number;
  pageNum: number;
  words: AyahWord[];
  translation: string;
  /** WBW meaning of the first matching word in the ayah */
  wbwMeaning: string;
};

/**
 * Build ayah words with match flags for highlighting.
 * Also returns the WBW meaning of the first matching word.
 */
export function getAyahWordsWithHighlight(
  pageNum: number,
  surah: number,
  ayah: number,
  matchSet: Set<string>,
  language: Language,
): { words: AyahWord[]; wbwMeaning: string } {
  const page = getPage(pageNum);
  const words: AyahWord[] = [];
  let wbwMeaning = '';

  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const w of (line as AyahLine).words) {
      if (w.s !== surah || w.v !== ayah) continue;
      if (isVerseMarker(w)) continue;
      const isMatch = matchSet.has(w.a);
      words.push({ text: w.a, isMatch });
      if (isMatch && !wbwMeaning) {
        wbwMeaning = getWordMeaning(w, language);
      }
    }
  }

  return { words, wbwMeaning };
}

/**
 * Highlight a substring in text by splitting into segments.
 * Returns segments with match flags for rendering.
 */
export function highlightInText(text: string, search: string): { text: string; bold: boolean }[] {
  if (!search || !text) return [{ text, bold: false }];

  const lowerText = text.toLowerCase();
  const lowerSearch = search.toLowerCase();
  const idx = lowerText.indexOf(lowerSearch);

  if (idx === -1) return [{ text, bold: false }];

  const segments: { text: string; bold: boolean }[] = [];
  if (idx > 0) segments.push({ text: text.slice(0, idx), bold: false });
  segments.push({ text: text.slice(idx, idx + search.length), bold: true });
  if (idx + search.length < text.length) {
    segments.push({ text: text.slice(idx + search.length), bold: false });
  }
  return segments;
}

/**
 * Resolve word locations to occurrences with highlight data.
 * When arabicFilter is set, only keeps locations whose word matches that exact form.
 */
export function resolveOccurrences(
  wordLocations: string[],
  arabicFilter: string | null,
  matchSet: Set<string>,
  language: Language,
): Occurrence[] {
  const seen = new Set<string>();
  const results: Occurrence[] = [];

  for (const loc of wordLocations) {
    const [s, v, w] = loc.split(':').map(Number);
    const ayahKey = `${s}:${v}`;
    if (seen.has(ayahKey)) continue;

    const pageNum = getAyahPage(s, v);

    if (arabicFilter) {
      const page = getPage(pageNum);
      let matched = false;
      for (const line of page.lines) {
        if (line.type !== 'ayah') continue;
        for (const word of (line as AyahLine).words) {
          if (word.s === s && word.v === v && word.w === w) {
            matched = word.a === arabicFilter;
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) continue;
    }

    seen.add(ayahKey);

    const { words, wbwMeaning } = getAyahWordsWithHighlight(pageNum, s, v, matchSet, language);

    let translationText = '';
    try {
      const translations = getTranslation(language, s);
      const t = translations.find((tr) => tr.ayah === v);
      if (t) translationText = t.text;
    } catch {}

    results.push({
      key: ayahKey,
      surah: s,
      ayah: v,
      pageNum,
      words,
      translation: translationText,
      wbwMeaning,
    });
  }
  return results;
}
