import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { getRootById, getLemmaById, getPage, getTranslation, isVerseMarker } from '@/lib/quran-data';
import { getAyahPage, getWordMeaning } from '@/lib/page-helpers';
import { useTheme, type Colors } from '@/lib/theme';
import TabPager from '@/components/tab-pager';
import type { Language, Word, AyahLine } from '@/types/quran';

type Tab = 'exact' | 'lemma' | 'root';

type AyahWord = { text: string; isMatch: boolean };

type Occurrence = {
  key: string;
  surah: number;
  ayah: number;
  pageNum: number;
  words: AyahWord[];
  translation: string;
  wbwMeaning: string; // word-by-word meaning of the matching word
};

/**
 * Build ayah words with match flags for highlighting.
 * Also returns the WBW meaning of the first matching word.
 */
function getAyahWordsWithHighlight(
  pageNum: number,
  surah: number,
  ayah: number,
  matchArabic: string,
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
      const isMatch = w.a === matchArabic;
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
function highlightInText(text: string, search: string): { text: string; bold: boolean }[] {
  if (!search || !text) return [{ text, bold: false }];

  // Case-insensitive search
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
 * matchArabic is the Arabic form we're highlighting in all tabs.
 */
function resolveOccurrences(
  wordLocations: string[],
  arabicFilter: string | null,
  matchArabic: string,
  language: Language,
): Occurrence[] {
  const seen = new Set<string>();
  const results: Occurrence[] = [];

  for (const loc of wordLocations) {
    const [s, v, w] = loc.split(':').map(Number);
    const ayahKey = `${s}:${v}`;
    if (seen.has(ayahKey)) continue;

    const pageNum = getAyahPage(s, v);

    // If filtering by exact form, check if this word matches
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

    const { words, wbwMeaning } = getAyahWordsWithHighlight(pageNum, s, v, matchArabic, language);

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

/** Tab content — a FlatList of occurrences for a specific tab */
function TabContent({
  wordLocations,
  arabicFilter,
  arabic,
  language,
  colors,
  onRowPress,
}: {
  wordLocations: string[];
  arabicFilter: string | null;
  arabic: string;
  language: Language;
  colors: Colors;
  onRowPress: (pageNum: number) => void;
}) {
  const occurrences = useMemo(
    () => resolveOccurrences(wordLocations, arabicFilter, arabic, language),
    [wordLocations, arabicFilter, arabic, language],
  );

  const renderOccurrence = useCallback(
    ({ item }: { item: Occurrence }) => {
      const translationSegments = highlightInText(item.translation, item.wbwMeaning);

      return (
        <Pressable
          onPress={() => onRowPress(item.pageNum)}
          style={({ pressed }) => ({
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: pressed ? colors.bgSecondary : 'transparent',
          })}
        >
          <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 8 }}>
            ({item.surah}:{item.ayah})
          </Text>

          {/* Arabic ayah with highlighted word */}
          <Text
            style={{
              fontFamily: 'UthmanicHafs',
              fontSize: 22,
              color: colors.text,
              lineHeight: 40,
              textAlign: 'right',
            }}
          >
            {item.words.map((w, i) => (
              <Text
                key={i}
                style={w.isMatch ? { color: colors.accent } : undefined}
              >
                {i > 0 ? ' ' : ''}{w.text}
              </Text>
            ))}
          </Text>

          {/* Translation with highlighted meaning */}
          {item.translation.length > 0 && (
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {translationSegments.map((seg, i) => (
                <Text
                  key={i}
                  style={seg.bold ? { fontWeight: '700', color: colors.text } : undefined}
                >
                  {seg.text}
                </Text>
              ))}
            </Text>
          )}
        </Pressable>
      );
    },
    [colors, onRowPress],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.bgSecondary }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18 }}>{arabic}</Text>
          {'  '}appears in <Text style={{ fontWeight: '600' }}>{occurrences.length} ayahs</Text>
        </Text>
      </View>
      <FlatList
        data={occurrences}
        renderItem={renderOccurrence}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

export default function WordUsagesScreen() {
  const { arabic, rootId, lemmaId } = useLocalSearchParams<{
    arabic: string;
    rootId: string;
    lemmaId: string;
  }>();

  const router = useRouter();
  const { colors } = useTheme();
  const [language] = useStorage<Language>('language', 'en');

  const root = rootId ? getRootById(Number(rootId)) : undefined;
  const lemma = lemmaId ? getLemmaById(Number(lemmaId)) : undefined;

  // Build available tabs — most specific first (Exact → Lemma → Root)
  const availableTabs = useMemo(() => {
    const tabs: Tab[] = ['exact'];
    if (lemma) tabs.push('lemma');
    if (root) tabs.push('root');
    return tabs;
  }, [root, lemma]);

  const [tabIndex, setTabIndex] = useState(0);

  const tabLabels: Record<Tab, string> = {
    exact: 'Exact',
    lemma: 'Lemma',
    root: 'Root',
  };

  // Pre-compute word locations + filter per tab
  const tabConfigs = useMemo(() => {
    const broadest = root?.words ?? lemma?.words ?? [];
    return availableTabs.map((tab) => {
      switch (tab) {
        case 'exact':
          return { wordLocations: broadest, arabicFilter: arabic };
        case 'lemma':
          return { wordLocations: lemma?.words ?? [], arabicFilter: null };
        case 'root':
          return { wordLocations: root?.words ?? [], arabicFilter: null };
      }
    });
  }, [availableTabs, root, lemma, arabic]);

  const handleRowPress = useCallback(
    (pageNum: number) => {
      router.push(`/page/${pageNum}`);
    },
    [router],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: arabic,
          headerTitleStyle: { fontFamily: 'UthmanicHafs', fontSize: 22 },
        }}
      />

      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Tab bar */}
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {availableTabs.map((tab, i) => {
            const isActive = i === tabIndex;
            return (
              <Pressable
                key={tab}
                onPress={() => setTabIndex(i)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? colors.text : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? colors.text : colors.textMuted,
                  }}
                >
                  {tabLabels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Swipeable tab content */}
        <TabPager selectedIndex={tabIndex} onIndexChange={setTabIndex}>
          {tabConfigs.map((config, i) => (
            <TabContent
              key={availableTabs[i]}
              wordLocations={config.wordLocations}
              arabicFilter={config.arabicFilter}
              arabic={arabic}
              language={language}
              colors={colors}
              onRowPress={handleRowPress}
            />
          ))}
        </TabPager>
      </View>
    </>
  );
}
