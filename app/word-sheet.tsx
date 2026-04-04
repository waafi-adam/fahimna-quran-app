import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { useWordStatus } from '@/hooks/use-word-status';
import { getPage, getRootById, getLemmaById, isVerseMarker, getRootForms, getLemmaForms, getExactCount, getMorphology } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';
import { setWordStatus } from '@/lib/word-status';
import { useTheme, type Colors } from '@/lib/theme';
import TabPager from '@/components/tab-pager';
import WordSegments from '@/components/word-segments';
import MorphologyTable from '@/components/morphology-table';
import type { Language, Word, AyahLine, WordStatus, PropagationMode, DerivedForm } from '@/types/quran';

const LANG_INDEX: Record<string, number> = { en: 1, id: 2, ur: 3 };
const FORM_ROW_HEIGHT = 44;
const HEADER_HEIGHT = 48;
const COLLAPSED_ROWS = 3;
const EXPANDED_ROWS = 8;

type FormsTab = 'exact' | 'lemma' | 'root';

/** Find a word by surah:verse:position on a given page */
function findWord(pageNum: number, surah: number, verse: number, wordPos: number): Word | null {
  const page = getPage(pageNum);
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const w of (line as AyahLine).words) {
      if (w.s === surah && w.v === verse && w.w === wordPos) return w;
    }
  }
  return null;
}

/** Get meaning from a DerivedForm tuple based on language */
function getFormMeaning(form: DerivedForm, lang: Language): string {
  return form[LANG_INDEX[lang]] || form[1];
}

/** A single tab's content: header info + scrollable forms list */
function FormsTabContent({
  forms,
  arabic,
  total,
  currentArabic,
  language,
  colors,
  onFormPress,
}: {
  forms: DerivedForm[];
  arabic: string;
  total: number;
  currentArabic: string;
  language: Language;
  colors: Colors;
  onFormPress: (form: DerivedForm) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* Header info */}
      <View style={{ height: HEADER_HEIGHT, justifyContent: 'center', paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18, color: colors.text }}>
            {arabic}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {total} times, {forms.length} {forms.length === 1 ? 'form' : 'forms'}
          </Text>
        </View>
      </View>

      {/* Forms list (no inner ScrollView — outer ScrollView handles scrolling) */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {forms.map((form) => {
          const isCurrentForm = form[0] === currentArabic;
          return (
            <Pressable
              key={form[0]}
              onPress={() => onFormPress(form)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: FORM_ROW_HEIGHT,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isCurrentForm ? colors.accentBg : 'transparent',
              }}
            >
              <Text
                style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}
                numberOfLines={1}
              >
                {getFormMeaning(form, language)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginHorizontal: 12, fontVariant: ['tabular-nums'] }}>
                {form[4]}×
              </Text>
              <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18, color: colors.text }}>
                {form[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function WordSheet() {
  const { page, surah, verse, word: wordPos, mode } = useLocalSearchParams<{
    page: string;
    surah: string;
    verse: string;
    word: string;
    mode: string;
  }>();

  const router = useRouter();
  const [language] = useStorage<Language>('language', 'en');
  const [propagation] = useStorage<PropagationMode>('propagation', 'lemma');
  const { colors } = useTheme();

  const w = findWord(Number(page), Number(surah), Number(verse), Number(wordPos));
  if (!w || isVerseMarker(w)) return null;

  const currentStatus = useWordStatus(w);
  const meaning = getWordMeaning(w, language);
  const root = w.ri != null ? getRootById(w.ri) : undefined;
  const lemma = w.li != null ? getLemmaById(w.li) : undefined;
  const isLearning = mode === 'learning';
  const morphology = getMorphology(w.s, w.v, w.w);

  // Pre-compute forms for each tab
  const rootForms = root ? getRootForms(root.id) : [];
  const lemmaForms = lemma ? getLemmaForms(lemma.id) : [];
  const exactCount = getExactCount(w.a);
  const exactForms: DerivedForm[] = exactCount > 0
    ? [[w.a, w.m, w.mi, w.mu, exactCount]]
    : [];

  // Build available tabs (most specific first)
  const availableTabs: FormsTab[] = [];
  if (exactForms.length > 0) availableTabs.push('exact');
  if (lemmaForms.length > 0) availableTabs.push('lemma');
  if (rootForms.length > 0) availableTabs.push('root');

  const [tabIndex, setTabIndex] = useState(0);
  const [formsExpanded, setFormsExpanded] = useState(false);

  const tabData: Record<FormsTab, { forms: DerivedForm[]; arabic: string; total: number }> = {
    exact: { forms: exactForms, arabic: w.a, total: exactCount },
    lemma: { forms: lemmaForms, arabic: lemma?.arabic ?? '', total: lemma?.count ?? 0 },
    root: { forms: rootForms, arabic: root?.arabic ?? '', total: root?.count ?? 0 },
  };

  const tabLabels: Record<FormsTab, string> = { exact: 'Exact', lemma: 'Lemma', root: 'Root' };

  // Determine if expand toggle is needed (any tab has more forms than collapsed rows)
  const maxForms = Math.max(
    exactForms.length,
    lemmaForms.length,
    rootForms.length,
  );
  const showExpandToggle = maxForms > COLLAPSED_ROWS;
  const visibleRows = formsExpanded ? EXPANDED_ROWS : COLLAPSED_ROWS;
  const pagerHeight = HEADER_HEIGHT + FORM_ROW_HEIGHT * visibleRows;

  const STATUS_OPTIONS: { key: WordStatus; label: string; bg: string; border: string }[] = [
    { key: 'new', label: 'New', bg: colors.statusNewBg, border: colors.statusNewBorder },
    { key: 'learning', label: 'Learning', bg: colors.statusLearningBg, border: colors.statusLearningBorder },
    { key: 'known', label: 'Known', bg: colors.statusKnownBg, border: colors.statusKnownBorder },
  ];

  const handleStatusPress = (status: WordStatus) => {
    setWordStatus(w, status, propagation);
    router.back();
  };

  const handleFormPress = useCallback(
    (form: DerivedForm) => {
      router.push(
        `/word-usages?arabic=${encodeURIComponent(form[0])}&rootId=${root?.id ?? ''}&lemmaId=${lemma?.id ?? ''}`,
      );
    },
    [router, root, lemma],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Arabic word */}
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 40,
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {w.a}
      </Text>

      {/* Status selector — learning mode only */}
      {isLearning && (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = currentStatus === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => handleStatusPress(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  backgroundColor: isActive ? opt.bg : 'transparent',
                  borderWidth: 1.5,
                  borderColor: isActive ? opt.border : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? colors.text : colors.textMuted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Transliteration */}
      {w.t.length > 0 && (
        <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' }}>
          {w.t}
        </Text>
      )}

      {/* Meaning */}
      <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 4 }}>Meaning</Text>
        <Text style={{ fontSize: 18, color: colors.text }}>{meaning}</Text>
      </View>

      {/* Word Analysis (تحليل الكلمة) */}
      {morphology && morphology.seg.length > 0 && (
        <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 12, color: colors.textFaint }}>تحليل الكلمة · Word Analysis</Text>

          {/* Syntactic role badge + إعراب */}
          {(morphology.syntacticRole || morphology.caseAr) && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ backgroundColor: colors.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                    {morphology.syntacticRole || morphology.caseAr}
                  </Text>
                </View>
                {(morphology.syntacticRoleEn || morphology.pos) && (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {morphology.syntacticRoleEn || morphology.pos}
                  </Text>
                )}
              </View>
              {morphology.irab && (
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
                  {morphology.irab}
                </Text>
              )}
            </View>
          )}

          <WordSegments segments={morphology.seg} colors={colors} />
          <MorphologyTable morphology={morphology} colors={colors} />
        </View>
      )}

      {/* Derived forms with swipeable tabs */}
      {availableTabs.length > 0 && (
        <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, overflow: 'hidden' }}>
          {/* Tab bar with expand toggle */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {availableTabs.map((tab, i) => {
              const isActive = i === tabIndex;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setTabIndex(i)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? colors.text : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? colors.text : colors.textMuted,
                    }}
                  >
                    {tabLabels[tab]} ({tabData[tab].total})
                  </Text>
                </Pressable>
              );
            })}
            {showExpandToggle && (
              <Pressable
                onPress={() => setFormsExpanded(!formsExpanded)}
                style={{ paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 12, color: colors.accent }}>
                  {formsExpanded ? '▲' : '▼'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Swipeable pager with dynamic height */}
          <View style={{ height: pagerHeight }}>
            <TabPager selectedIndex={tabIndex} onIndexChange={setTabIndex}>
              {availableTabs.map((tab) => (
                <FormsTabContent
                  key={tab}
                  forms={tabData[tab].forms}
                  arabic={tabData[tab].arabic}
                  total={tabData[tab].total}
                  currentArabic={w.a}
                  language={language}
                  colors={colors}
                  onFormPress={handleFormPress}
                />
              ))}
            </TabPager>
          </View>
        </View>
      )}

      {/* Location */}
      <Text style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center' }}>
        Surah {w.s} · Ayah {w.v} · Word {w.w}
      </Text>
    </ScrollView>
  );
}
