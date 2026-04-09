import type { FlashCard } from '@/types/quran';
import { getPage, isVerseMarker } from '@/lib/quran-data';
import { getWordStatus } from '@/lib/word-status';

// Cache the full card index (built once, invalidated on status change)
let _cardIndex: Map<string, FlashCard> | null = null;

/** Build a deduplicated index of all words across all 604 pages */
function buildCardIndex(): Map<string, FlashCard> {
  const index = new Map<string, FlashCard>();

  for (let p = 1; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;

        const arabic = word.a;
        const existing = index.get(arabic);

        if (existing) {
          // Add meaning if distinct
          if (!existing.meanings.includes(word.m)) {
            existing.meanings.push(word.m);
          }
          // Add location (cap at 5 examples)
          if (existing.locations.length < 5) {
            existing.locations.push(`${word.s}:${word.v}:${word.w}`);
          }
        } else {
          index.set(arabic, {
            arabic,
            meanings: [word.m],
            transliteration: word.t,
            locations: [`${word.s}:${word.v}:${word.w}`],
          });
        }
      }
    }
  }

  return index;
}

function ensureIndex(): Map<string, FlashCard> {
  if (!_cardIndex) _cardIndex = buildCardIndex();
  return _cardIndex;
}

/** Invalidate the cached index (call when word statuses change en masse, e.g., reset) */
export function invalidateCardIndex(): void {
  _cardIndex = null;
}

/** Get the FlashCard for a specific Arabic form */
export function getFlashCard(arabic: string): FlashCard | undefined {
  return ensureIndex().get(arabic);
}

/** Get FlashCards for a list of Arabic forms */
export function getFlashCards(arabicForms: string[]): FlashCard[] {
  const index = ensureIndex();
  const cards: FlashCard[] = [];
  for (const form of arabicForms) {
    const card = index.get(form);
    if (card) cards.push(card);
  }
  return cards;
}

/**
 * Get all unique Arabic forms whose word-status is "learning".
 * Scans all 604 pages. This is the source of truth for the flashcard deck.
 */
export function getLearningArabicForms(): string[] {
  const seen = new Set<string>();
  const forms: string[] = [];

  for (let p = 1; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;
        if (seen.has(word.a)) continue;
        seen.add(word.a);

        if (getWordStatus(word) === 'learning') {
          forms.push(word.a);
        }
      }
    }
  }

  return forms;
}
