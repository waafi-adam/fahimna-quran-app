import { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { useWordStatus } from '@/hooks/use-word-status';
import { getPage, getRootById, getLemmaById, isVerseMarker, getRootForms, getLemmaForms, getExactCount, getMorphology } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';
import { setWordStatus } from '@/lib/word-status';
import { playWord } from '@/lib/audio-player';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import WordSegments from '@/components/word-segments';
import MorphologyTable from '@/components/morphology-table';
import FormsTable, {
  FORM_ROW_HEIGHT,
  HEADER_HEIGHT,
  COLLAPSED_ROWS,
  EXPANDED_ROWS,
  derivedFormToRow,
  type FormRow,
} from '@/components/forms-table';
import type { Language, Word, AyahLine, WordStatus, PropagationMode, DerivedForm } from '@/types/quran';

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

  // Default to lemma, then root, then exact
  const defaultTab: FormsTab = lemmaForms.length > 0 ? 'lemma' : rootForms.length > 0 ? 'root' : 'exact';
  const [tabIndex, setTabIndex] = useState(() => Math.max(0, availableTabs.indexOf(defaultTab)));
  const [formsExpanded, setFormsExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const swiping = useRef(false);
  const tabAnim = useRef(new Animated.Value(0)).current;
  const prevTabIndex = useRef(tabIndex);

  const animateTab = useCallback((newIndex: number) => {
    const direction = newIndex > prevTabIndex.current ? 1 : -1;
    prevTabIndex.current = newIndex;
    tabAnim.setValue(direction * 40);
    setTabIndex(newIndex);
    Animated.timing(tabAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tabAnim]);

  const toRows = (forms: DerivedForm[]): FormRow[] =>
    forms.map((f) => derivedFormToRow(f, language));

  const tabData: Record<FormsTab, { rows: FormRow[]; arabic: string; total: number }> = {
    exact: { rows: toRows(exactForms), arabic: w.a, total: exactCount },
    lemma: { rows: toRows(lemmaForms), arabic: lemma?.arabic ?? '', total: lemma?.count ?? 0 },
    root: { rows: toRows(rootForms), arabic: root?.arabic ?? '', total: root?.count ?? 0 },
  };

  const tabLabels: Record<FormsTab, string> = { exact: 'Exact', lemma: 'Lemma', root: 'Root' };

  // Determine if expand toggle is needed (any tab has more forms than collapsed rows)
  const maxForms = Math.max(
    tabData.exact.rows.length,
    tabData.lemma.rows.length,
    tabData.root.rows.length,
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
    (row: FormRow) => {
      if (swiping.current) return;
      const activeTab = availableTabs[tabIndex];
      router.push(
        `/word-usages?arabic=${encodeURIComponent(row.arabic)}&rootId=${root?.id ?? ''}&lemmaId=${lemma?.id ?? ''}&surah=${w.s}&ayah=${w.v}&tab=${activeTab}`,
      );
    },
    [router, root, lemma, availableTabs, tabIndex],
  );

  return (
    <ScrollView
      ref={scrollRef}
      nestedScrollEnabled
      onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
      scrollEventThrottle={16}
      contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
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

      {/* Transliteration + play button */}
      {w.t.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, color: colors.textMuted, fontStyle: 'italic' }}>
            {w.t}
          </Text>
          <Pressable
            onPress={() => playWord(Number(surah), Number(verse), Number(wordPos))}
            hitSlop={8}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.bgSecondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="volume-medium" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
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
                  onPress={() => animateTab(i)}
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
                onPress={() => {
                  const expanding = !formsExpanded;
                  setFormsExpanded(expanding);
                  if (expanding) {
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    });
                  }
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 12, color: colors.accent }}>
                  {formsExpanded ? '▲' : '▼'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Forms content — swipe left/right to change tabs */}
          <GestureDetector gesture={Gesture.Pan()
            .activeOffsetX([-20, 20])
            .failOffsetY([-10, 10])
            .onStart(() => { swiping.current = true; })
            .onEnd((e) => {
              if (e.velocityX < -300 && tabIndex < availableTabs.length - 1) {
                animateTab(tabIndex + 1);
              } else if (e.velocityX > 300 && tabIndex > 0) {
                animateTab(tabIndex - 1);
              }
              setTimeout(() => { swiping.current = false; }, 50);
            })
            .onFinalize(() => {
              setTimeout(() => { swiping.current = false; }, 50);
            })
            .runOnJS(true)
          }>
            <Animated.View style={{ height: pagerHeight, transform: [{ translateX: tabAnim }] }}>
              <FormsTable
                rows={tabData[availableTabs[tabIndex]].rows}
                headerArabic={tabData[availableTabs[tabIndex]].arabic}
                headerTotal={tabData[availableTabs[tabIndex]].total}
                currentArabic={w.a}
                language={language}
                colors={colors}
                onFormPress={handleFormPress}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {/* Location */}
      <Text style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center' }}>
        Surah {w.s} · Ayah {w.v} · Word {w.w}
      </Text>
    </ScrollView>
  );
}
