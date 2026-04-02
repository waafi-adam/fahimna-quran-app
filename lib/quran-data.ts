import type {
  Chapter, Juz, Hizb, Rub, PageData, AyahTranslation,
  Reciter, AudioAyah, TafsirIndex, TafsirSurah,
  Root, Lemma, Word, Language, DerivedForm,
} from '@/types/quran';

// === Eagerly loaded startup data ===

const chapters: Chapter[] = require('@/assets/data/chapters.json');
const juzList: Juz[] = require('@/assets/data/juz.json');
const hizbList: Hizb[] = require('@/assets/data/hizb.json');
const rubList: Rub[] = require('@/assets/data/rub.json');
const reciters: Reciter[] = require('@/assets/data/audio/reciters.json');
const tafsirIndex: TafsirIndex = require('@/assets/data/tafsirs/index.json');

// === Derived indexes ===

const chapterMap = new Map(chapters.map((c) => [c.id, c]));

// === Dynamic data via require.context ===
// Files are in the JS bundle but only parsed on first access.

const pagesCtx = require.context('../assets/data/pages', false, /\.json$/);

const translationCtx = {
  en: require.context('../assets/data/translations/en', false, /\.json$/),
  id: require.context('../assets/data/translations/id', false, /\.json$/),
  ur: require.context('../assets/data/translations/ur', false, /\.json$/),
};

const audioCtx: Record<string, RequireContext> = {
  'abdul-basit-mujawwad': require.context('../assets/data/audio/abdul-basit-mujawwad', false, /\.json$/),
  'abdul-basit-murattal': require.context('../assets/data/audio/abdul-basit-murattal', false, /\.json$/),
  'husary-mujawwad': require.context('../assets/data/audio/husary-mujawwad', false, /\.json$/),
  'husary-murattal': require.context('../assets/data/audio/husary-murattal', false, /\.json$/),
};

const tafsirCtx: Record<string, RequireContext> = {
  'en/abridged': require.context('../assets/data/tafsirs/en/abridged', false, /\.json$/),
  'id/mokhtasar': require.context('../assets/data/tafsirs/id/mokhtasar', false, /\.json$/),
  'ur/as-saadi': require.context('../assets/data/tafsirs/ur/as-saadi', false, /\.json$/),
};

// === Lazy-loaded linguistic data ===

let rootsData: Root[] | null = null;
let lemmasData: Lemma[] | null = null;
let rootMap: Map<number, Root> | null = null;
let lemmaMap: Map<number, Lemma> | null = null;

function ensureLinguisticData() {
  if (!rootsData) {
    rootsData = require('@/assets/data/roots.json');
    rootMap = new Map(rootsData!.map((r) => [r.id, r]));
  }
  if (!lemmasData) {
    lemmasData = require('@/assets/data/lemmas.json');
    lemmaMap = new Map(lemmasData!.map((l) => [l.id, l]));
  }
}

// === Public API — Startup data (synchronous, always in memory) ===

export const getChapters = (): Chapter[] => chapters;
export const getChapter = (id: number) => chapterMap.get(id);
export const getJuzList = (): Juz[] => juzList;
export const getHizbList = (): Hizb[] => hizbList;
export const getRubList = (): Rub[] => rubList;
export const getReciters = (): Reciter[] => reciters;
export const getTafsirIndex = (): TafsirIndex => tafsirIndex;

// === Public API — On-demand data (synchronous, parsed on first access) ===

export const getPage = (num: number): PageData =>
  pagesCtx(`./${num}.json`);

export const getTranslation = (lang: Language, surah: number): AyahTranslation[] => {
  const raw: AyahTranslation[] = translationCtx[lang](`./${surah}.json`);
  return raw.map((t) => ({ ...t, text: t.text.replace(/\\"/g, '"') }));
};

export function getAudio(reciterSlug: string, surah: number): AudioAyah[] {
  const ctx = audioCtx[reciterSlug];
  if (!ctx) throw new Error(`Unknown reciter: ${reciterSlug}`);
  return ctx(`./${surah}.json`);
}

export function getTafsir(lang: Language, slug: string, surah: number): TafsirSurah {
  const ctx = tafsirCtx[`${lang}/${slug}`];
  if (!ctx) throw new Error(`Unknown tafsir: ${lang}/${slug}`);
  return ctx(`./${surah}.json`);
}

/** Resolve tafsir HTML for an ayah — follows int references for grouped tafsirs */
export function getTafsirText(
  lang: Language,
  slug: string,
  surah: number,
  ayah: number,
): string | null {
  const data = getTafsir(lang, slug, surah);
  const entry = data[String(ayah)];
  if (entry == null) return null;
  if (typeof entry === 'string') return entry;
  // Int reference → look up the parent ayah's text
  const parent = data[String(entry)];
  return typeof parent === 'string' ? parent : null;
}

// === Public API — Lazy linguistic data (loaded on first Word Detail open) ===

export function getRootById(id: number): Root | undefined {
  ensureLinguisticData();
  return rootMap!.get(id);
}

export function getLemmaById(id: number): Lemma | undefined {
  ensureLinguisticData();
  return lemmaMap!.get(id);
}

/** Check if a word is a verse-end marker (not a real Arabic word) */
export const isVerseMarker = (word: Word): boolean =>
  word.ri == null && word.li == null && word.t === '';

// === Public API — Pre-computed usages data (lazy loaded) ===

let rootFormsData: Record<string, DerivedForm[]> | null = null;
let lemmaFormsData: Record<string, DerivedForm[]> | null = null;
let exactCountsData: Record<string, number> | null = null;

export function getRootForms(rootId: number): DerivedForm[] {
  if (!rootFormsData) rootFormsData = require('@/assets/data/root-forms.json');
  return rootFormsData![String(rootId)] ?? [];
}

export function getLemmaForms(lemmaId: number): DerivedForm[] {
  if (!lemmaFormsData) lemmaFormsData = require('@/assets/data/lemma-forms.json');
  return lemmaFormsData![String(lemmaId)] ?? [];
}

export function getExactCount(arabicText: string): number {
  if (!exactCountsData) exactCountsData = require('@/assets/data/exact-counts.json');
  return exactCountsData![arabicText] ?? 0;
}
