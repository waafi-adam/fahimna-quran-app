import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { getRootById, getLemmaById, getRootForms, getLemmaForms } from '@/lib/quran-data';
import { useTheme, type Colors } from '@/lib/theme';
import TabPager from '@/components/tab-pager';
import { resolveOccurrences, highlightInText, type Occurrence } from '@/lib/occurrences';
import type { Language } from '@/types/quran';

type Tab = 'exact' | 'lemma' | 'root';

/** Tab content — a FlatList of occurrences for a specific tab */
function TabContent({
  wordLocations,
  arabicFilter,
  matchSet,
  language,
  colors,
  onRowPress,
  originAyahKey,
}: {
  wordLocations: string[];
  arabicFilter: string | null;
  matchSet: Set<string>;
  language: Language;
  colors: Colors;
  onRowPress: (pageNum: number) => void;
  originAyahKey?: string;
}) {
  const listRef = useRef<FlatList>(null);

  const occurrences = useMemo(
    () => resolveOccurrences(wordLocations, arabicFilter, matchSet, language),
    [wordLocations, arabicFilter, matchSet, language],
  );

  useEffect(() => {
    if (occurrences.length === 0) return;
    let targetIndex = -1;
    if (originAyahKey) {
      targetIndex = occurrences.findIndex((o) => o.key === originAyahKey);
    }
    if (targetIndex < 0) {
      // Fallback: first occurrence where the exact arabic form appears
      targetIndex = occurrences.findIndex((o) => o.words.some((w) => w.isMatch));
    }
    if (targetIndex > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: targetIndex, animated: false, viewPosition: 0.3 });
      });
    }
  }, [occurrences, originAyahKey]);

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
                style={w.isMatch ? { color: colors.audioWordText } : undefined}
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
          {matchSet.size === 1
            ? <><Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18 }}>{[...matchSet][0]}</Text>{'  '}appears in </>
            : <><Text style={{ fontWeight: '600' }}>{matchSet.size} forms</Text>{' appear in '}</>
          }
          <Text style={{ fontWeight: '600' }}>{occurrences.length} ayahs</Text>
        </Text>
      </View>
      <FlatList
        ref={listRef}
        nestedScrollEnabled
        style={{ flex: 1 }}
        data={occurrences}
        renderItem={renderOccurrence}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 40 }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.3 });
          }, 100);
        }}
      />
    </View>
  );
}

export default function WordUsagesScreen() {
  const { arabic, rootId, lemmaId, surah, ayah, tab } = useLocalSearchParams<{
    arabic: string;
    rootId: string;
    lemmaId: string;
    surah: string;
    ayah: string;
    tab: string;
  }>();

  const originAyahKey = surah && ayah ? `${surah}:${ayah}` : undefined;

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

  const [tabIndex, setTabIndex] = useState(() => {
    if (tab) {
      const idx = availableTabs.indexOf(tab as Tab);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const tabLabels: Record<Tab, string> = {
    exact: 'Exact',
    lemma: 'Lemma',
    root: 'Root',
  };

  // Pre-compute word locations + filter + match sets per tab
  const tabConfigs = useMemo(() => {
    const broadest = root?.words ?? lemma?.words ?? [];
    const exactSet = new Set([arabic]);
    const lemmaSet = lemma ? new Set(getLemmaForms(lemma.id).map((f) => f[0])) : exactSet;
    const rootSet = root ? new Set(getRootForms(root.id).map((f) => f[0])) : lemmaSet;

    return availableTabs.map((tab) => {
      switch (tab) {
        case 'exact':
          return { wordLocations: broadest, arabicFilter: arabic, matchSet: exactSet };
        case 'lemma':
          return { wordLocations: lemma?.words ?? [], arabicFilter: null, matchSet: lemmaSet };
        case 'root':
          return { wordLocations: root?.words ?? [], arabicFilter: null, matchSet: rootSet };
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
              matchSet={config.matchSet}
              language={language}
              colors={colors}
              originAyahKey={originAyahKey}
              onRowPress={handleRowPress}
            />
          ))}
        </TabPager>
      </View>
    </>
  );
}
