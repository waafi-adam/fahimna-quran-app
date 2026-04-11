import type { ExactFlashCard, LemmaFlashCard, LemmaFormEntry, Language, DerivedForm } from '@/types/quran';
import { getPage, isVerseMarker, getLemmaById, getLemmaForms } from '@/lib/quran-data';
import { getWordStatus, onStatusChange } from '@/lib/word-status';
import { getFormMeaning } from '@/components/forms-table';

// === Exact card reference index (all Quran words, built once) ===

let _cardIndex: Map<string, ExactFlashCard> | null = null;

/** Build a deduplicated index of all words across all 604 pages */
function buildCardIndex(): Map<string, ExactFlashCard> {
  const index = new Map<string, ExactFlashCard>();

  for (let p = 1; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;

        const arabic = word.a;
        const existing = index.get(arabic);

        if (existing) {
          if (!existing.meanings.includes(word.m)) {
            existing.meanings.push(word.m);
          }
          if (existing.locations.length < 5) {
            existing.locations.push(`${word.s}:${word.v}:${word.w}`);
          }
        } else {
          index.set(arabic, {
            kind: 'exact',
            arabic,
            meanings: [word.m],
            transliteration: word.t,
            locations: [`${word.s}:${word.v}:${word.w}`],
            lemmaId: word.li,
            rootId: word.ri,
          });
        }
      }
    }
  }

  return index;
}

function ensureIndex(): Map<string, ExactFlashCard> {
  if (!_cardIndex) _cardIndex = buildCardIndex();
  return _cardIndex;
}

// === Learning groups (derived from word-status, invalidated on status change) ===

type LearningGroups = {
  byLemma: Map<number, Set<string>>;
  orphans: string[];
  allLearning: string[];
};

let _learningGroupsCache: LearningGroups | null = null;

function buildLearningGroups(): LearningGroups {
  const byLemma = new Map<number, Set<string>>();
  const orphanSet = new Set<string>();
  const allLearningSet = new Set<string>();
  const seen = new Set<string>();

  for (let p = 1; p <= 604; p++) {
    const page = getPage(p);
    for (const line of page.lines) {
      if (line.type !== 'ayah') continue;
      for (const word of line.words) {
        if (isVerseMarker(word)) continue;
        if (seen.has(word.a)) continue;
        seen.add(word.a);

        if (getWordStatus(word) !== 'learning') continue;
        allLearningSet.add(word.a);

        if (word.li != null) {
          let set = byLemma.get(word.li);
          if (!set) {
            set = new Set();
            byLemma.set(word.li, set);
          }
          set.add(word.a);
        } else {
          orphanSet.add(word.a);
        }
      }
    }
  }

  return {
    byLemma,
    orphans: Array.from(orphanSet),
    allLearning: Array.from(allLearningSet),
  };
}

function getLearningGroups(): LearningGroups {
  if (!_learningGroupsCache) _learningGroupsCache = buildLearningGroups();
  return _learningGroupsCache;
}

/** Invalidate the cached reference index + learning groups (e.g., on reset). */
export function invalidateCardIndex(): void {
  _cardIndex = null;
  _learningGroupsCache = null;
}

// Invalidate learning groups whenever any word status changes. The reference
// index stays valid — it's pure Quran data, not user state.
onStatusChange(() => {
  _learningGroupsCache = null;
});

// === Exact card API ===

export function getFlashCard(arabic: string): ExactFlashCard | undefined {
  return ensureIndex().get(arabic);
}

export function getFlashCards(arabicForms: string[]): ExactFlashCard[] {
  const index = ensureIndex();
  const cards: ExactFlashCard[] = [];
  for (const form of arabicForms) {
    const card = index.get(form);
    if (card) cards.push(card);
  }
  return cards;
}

/**
 * Get all unique Arabic forms whose word-status is "learning".
 * Source of truth for the exact-mode flashcard deck.
 */
export function getLearningArabicForms(): string[] {
  return getLearningGroups().allLearning;
}

// === Lemma card API ===

/** Lemma IDs that have at least one form in "learning" status. */
export function getLearningLemmaIds(): number[] {
  return Array.from(getLearningGroups().byLemma.keys());
}

/** Learning forms with no `li` — fall back to exact cards mixed into the lemma deck. */
export function getOrphanLearningForms(): string[] {
  return getLearningGroups().orphans;
}

/** Build a lemma flashcard for the given lemma ID in the given language. */
export function getLemmaFlashCard(lemmaId: number, language: Language): LemmaFlashCard | undefined {
  const lemma = getLemmaById(lemmaId);
  if (!lemma) return undefined;

  const derivedForms: DerivedForm[] = getLemmaForms(lemmaId);
  if (derivedForms.length === 0) return undefined;

  const learningSet = getLearningGroups().byLemma.get(lemmaId) ?? new Set<string>();
  const refIndex = ensureIndex();

  const forms: LemmaFormEntry[] = derivedForms.map((f) => {
    const arabic = f[0];
    const exactCard = refIndex.get(arabic);
    return {
      arabic,
      meaning: getFormMeaning(f, language),
      count: f[4],
      isLearning: learningSet.has(arabic),
      locations: exactCard?.locations ?? [],
    };
  });

  // Sort: learning forms first, then by count desc
  forms.sort((a, b) => {
    if (a.isLearning !== b.isLearning) return a.isLearning ? -1 : 1;
    return b.count - a.count;
  });

  const learningForms = forms.filter((f) => f.isLearning).map((f) => f.arabic);

  return {
    kind: 'lemma',
    lemmaId,
    lemmaArabic: lemma.arabic,
    lemmaArabicClean: lemma.arabicClean,
    totalCount: lemma.count,
    forms,
    learningForms,
  };
}

export function getLemmaFlashCards(ids: number[], language: Language): LemmaFlashCard[] {
  const out: LemmaFlashCard[] = [];
  for (const id of ids) {
    const card = getLemmaFlashCard(id, language);
    if (card) out.push(card);
  }
  return out;
}
