// === Page data (pages/{1-604}.json) ===

export type Word = {
  id: number;
  /** Arabic text (QPC Hafs encoding) */
  a: string;
  /** English WBW meaning */
  m: string;
  /** Indonesian WBW meaning */
  mi: string;
  /** Urdu WBW meaning */
  mu: string;
  /** Transliteration */
  t: string;
  /** Surah number */
  s: number;
  /** Verse (ayah) number */
  v: number;
  /** Word position within ayah */
  w: number;
  /** Root ID (index into roots.json) */
  ri?: number;
  /** Lemma ID (index into lemmas.json) */
  li?: number;
};

export type AyahLine = {
  type: 'ayah';
  line: number;
  words: Word[];
};

export type SurahNameLine = {
  type: 'surah_name';
  line: number;
  surah: number;
};

export type BismillahLine = {
  type: 'bismillah';
  line: number;
};

export type PageLine = AyahLine | SurahNameLine | BismillahLine;

export type PageData = {
  page: number;
  lines: PageLine[];
};

// === Chapter data (chapters.json) ===

export type SurahInfo = {
  text: string; // HTML
};

export type Chapter = {
  id: number;
  name: string;
  nameSimple: string;
  nameArabic: string;
  revelationOrder: number;
  revelationPlace: 'makkah' | 'madinah';
  versesCount: number;
  bismillahPre: boolean;
  startPage: number;
  juz: number;
  info: {
    en: SurahInfo;
    id: SurahInfo;
    ur: SurahInfo;
  };
};

// === Juz / Hizb / Rub ===

export type VerseMapping = Record<string, string>; // surah number → "from-to" ayah range

export type Juz = {
  id: number;
  versesCount: number;
  firstVerse: string; // "surah:ayah"
  lastVerse: string;
  verseMapping: VerseMapping;
};

export type Hizb = {
  id: number;
  versesCount: number;
  firstVerse: string;
  lastVerse: string;
  verseMapping: VerseMapping;
};

export type Rub = {
  id: number;
  versesCount: number;
  firstVerse: string;
  lastVerse: string;
  verseMapping: VerseMapping;
  snippet: string; // Arabic text snippet
};

// === Roots / Lemmas / Stems (lazy loaded) ===

export type Root = {
  id: number;
  arabic: string; // e.g. "د ع و"
  count: number;
  words: string[]; // "surah:ayah:word" locations
};

export type Lemma = {
  id: number;
  arabic: string;
  arabicClean: string;
  count: number;
  words: string[]; // "surah:ayah:word" locations
};

export type Stem = {
  id: number;
  arabic: string;
  arabicClean: string;
  count: number;
  words: string[];
};

// === Translations (translations/{lang}/{1-114}.json) ===

export type AyahTranslation = {
  ayah: number;
  text: string;
  /** Transliteration (EN only) */
  tl?: string;
};

// === Audio (audio/reciters.json + audio/{slug}/{1-114}.json) ===

export type Reciter = {
  slug: string;
  name: string;
  style: string; // "Mujawwad" | "Murattal"
};

/** [wordIndexInPage, wordPositionInAyah, startMs, endMs] */
export type AudioSegment = [number, number, number, number];

export type AudioAyah = {
  ayah: number;
  url: string;
  seg: AudioSegment[];
};

// === Tafsirs (tafsirs/index.json + tafsirs/{lang}/{slug}/{1-114}.json) ===

export type TafsirMeta = {
  id: string;
  name: string;
};

export type TafsirIndex = {
  en: TafsirMeta[];
  id: TafsirMeta[];
  ur: TafsirMeta[];
};

/** Per-surah tafsir: keys are ayah numbers. Value is HTML string or int reference to another ayah. */
export type TafsirSurah = Record<string, string | number>;

// === Themes / Topics ===

export type AyahTheme = {
  theme: string;
  surah: number;
  from: number;
  to: number;
  keywords: string;
  totalAyahs: number;
};

export type Topic = {
  id: number;
  name: string;
  nameArabic: string;
  parentId: number | null;
  description: string;
  ayahs: string[]; // "surah:ayah"
};

// === Similar Ayahs / Mutashabihat ===

export type SimilarAyah = {
  verse: string; // "surah:ayah"
  match: string;
  words: number;
  coverage: number;
  score: number;
};

export type MutashabihatSource = {
  key: string; // "surah:ayah"
  from: number;
  to: number;
};

export type Mutashabihat = {
  id: number;
  surahs: number;
  ayahs: number;
  count: number;
  source: MutashabihatSource;
  ayah: Record<string, [number, number][]>; // "surah:ayah" → [[fromWord, toWord], ...]
};

// === Derived forms (pre-computed by scripts/generate-usages.js) ===

/** [arabic, meaningEN, meaningID, meaningUR, count] */
export type DerivedForm = [string, string, string, string, number];

// === App types ===

export type Language = 'en' | 'id' | 'ur';

export type WordStatus = 'new' | 'learning' | 'known';

export type ReaderLayout = 'wbw' | 'sentence' | 'mushaf';

export type ReaderMode = 'reading' | 'learning';

export type PropagationMode = 'lemma' | 'root' | 'exact';

export type DoubleTapAction = 'learning' | 'known' | 'cycle';

export type ThemeMode = 'light' | 'dark' | 'system';

export type SwipeAction = 'none' | 'known' | 'learning';

// === Flashcard / SRS types ===

export type ReviewRecord = {
  /** Timestamp (ms) when next review is due */
  due: number;
  /** Current interval in days */
  interval: number;
  /** SM-2 ease factor (default 2.5) */
  ease: number;
  /** Consecutive successful reviews */
  reps: number;
  /** 0 = in learning steps, 1+ = in review phase */
  step: number;
};

/** Forgot=0, Hard=1, Good=2, Easy=3 */
export type ReviewGrade = 0 | 1 | 2 | 3;

export type FlashcardMode = 'exact' | 'lemma';

export type ExactFlashCard = {
  kind: 'exact';
  /** Exact Arabic word form */
  arabic: string;
  /** All distinct WBW meanings for this form */
  meanings: string[];
  /** Transliteration */
  transliteration: string;
  /** Sample locations ["s:v:w", ...] for context */
  locations: string[];
  /** Lemma id from the first encountered instance */
  lemmaId?: number;
  /** Root id from the first encountered instance */
  rootId?: number;
};

export type LemmaFormEntry = {
  /** Exact Arabic form */
  arabic: string;
  /** Meaning in the current language */
  meaning: string;
  /** Quran-wide count of this form */
  count: number;
  /** True if this form currently has 'learning' status */
  isLearning: boolean;
  /** Sampled locations (up to 5) of this form */
  locations: string[];
};

export type LemmaFlashCard = {
  kind: 'lemma';
  lemmaId: number;
  /** Canonical lemma citation form */
  lemmaArabic: string;
  lemmaArabicClean: string;
  /** Total Quran-wide count across all forms */
  totalCount: number;
  /** All forms of the lemma, sorted learning-first then by count desc */
  forms: LemmaFormEntry[];
  /** Arabic of forms currently in 'learning' status — what graduation collapses */
  learningForms: string[];
};

export type FlashCard = ExactFlashCard | LemmaFlashCard;

// === Grammar / Morphology (morphology/{1-114}.json) ===

/** A single morphological segment of a word (prefix, stem, or suffix) */
export type WordSegment = {
  /** Arabic text of this segment */
  ar: string;
  /** Arabic grammar label (e.g., حرف جر) */
  posAr: string;
  /** English grammar label (e.g., Preposition) */
  posEn: string;
  /** Segment type */
  type: 'prefix' | 'stem' | 'suffix';
};

/** Full morphology + إعراب entry for a single word */
export type WordMorphology = {
  /** Segmentation into prefix/stem/suffix parts */
  seg: WordSegment[];
  /** Part of speech (English) */
  pos: string;
  /** Part of speech (Arabic) */
  posAr: string;
  /** Morphological pattern / وزن */
  pattern?: string;
  /** Gender: m / f */
  gender?: string;
  /** Number: s (singular) / d (dual) / p (plural) */
  number?: string;
  /** Person: 1 / 2 / 3 */
  person?: string;
  /** Grammatical case: nom / acc / gen */
  case?: string;
  /** Arabic case label (مرفوع / منصوب / مجرور) */
  caseAr?: string;
  /** Verb mood: ind / sub / jus */
  mood?: string;
  /** Voice: act / pass */
  voice?: string;
  /** State: def / indef / const */
  state?: string;
  /** Derivation type (e.g., verbal noun, active participle) */
  derivation?: string;
  /** Full إعراب sentence in Arabic */
  irab?: string;
  /** Arabic syntactic role (e.g., فاعل, مبتدأ) */
  syntacticRole?: string;
  /** English syntactic role (e.g., Subject, Predicate) */
  syntacticRoleEn?: string;
};

/** Per-surah morphology file: keyed by "ayah:word" */
export type SurahMorphology = Record<string, WordMorphology>;
