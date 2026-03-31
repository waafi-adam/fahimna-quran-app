import { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, useWindowDimensions, type ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import type { ReaderLayout, ReaderMode, Language } from '@/types/quran';
import { getPage, getChapter, isVerseMarker } from '@/lib/quran-data';
import { getSurahsOnPage } from '@/lib/page-helpers';
import { useStorage } from '@/hooks/use-storage';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import { storage } from '@/lib/storage';
import WbwPage from '@/components/wbw-page';
import SentencePage from '@/components/sentence-page';
import MushafPage from '@/components/mushaf-page';
import ReaderFooter from '@/components/reader-footer';
import HeaderActions from '@/components/header-actions';
import type { Word } from '@/types/quran';

const PAGE_IDS = Array.from({ length: 604 }, (_, i) => i + 1);

export default function ReaderScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const initialPage = Number(number) || 1;

  const { width } = useWindowDimensions();

  const [layout, setLayout] = useStorage<ReaderLayout>('readerLayout', 'wbw');
  const [mode, setMode] = useStorage<ReaderMode>('readerMode', 'reading');
  const [language] = useStorage<Language>('language', 'en');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [mushafContentHeight, setMushafContentHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(56);

  const router = useRouter();
  const flatListRef = useRef<FlatList<number>>(null);
  const statusVersion = useWordStatusVersion();

  const handleWordPress = useCallback((word: Word, pageNum: number) => {
    if (isVerseMarker(word)) {
      router.push(`/ayah-sheet?surah=${word.s}&ayah=${word.v}`);
    } else {
      router.push(`/word-sheet?page=${pageNum}&surah=${word.s}&verse=${word.v}&word=${word.w}&mode=${mode}`);
    }
  }, [router, mode]);

  // Header title — show surah name(s) on current page
  const headerTitle = useMemo(() => {
    const page = getPage(currentPage);
    const surahs = getSurahsOnPage(page);
    const names = surahs.map((s) => getChapter(s)?.nameSimple ?? '').filter(Boolean);
    return names.join(' / ');
  }, [currentPage]);

  // Detect page change from scroll
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item != null) {
        const page = viewableItems[0].item;
        setCurrentPage(page);
        storage.set('lastReadPage', page);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderPage = useCallback(
    ({ item: pageNum }: { item: number }) => (
      <View style={{ width, flex: 1 }}>
        <PageContent
          pageNum={pageNum}
          layout={layout}
          mode={mode}
          language={language}
          mushafContentHeight={mushafContentHeight}
          onWordPress={handleWordPress}
        />
      </View>
    ),
    [width, layout, mode, language, mushafContentHeight, statusVersion],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontVariant: ['tabular-nums'] }}>
                pg {currentPage}
              </Text>
              <HeaderActions />
            </View>
          ),
        }}
      />

      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height - footerHeight;
          if (h > 0) setMushafContentHeight(h);
        }}
      >
        <FlatList
          ref={flatListRef}
          data={PAGE_IDS}
          horizontal
          pagingEnabled
          inverted
          renderItem={renderPage}
          keyExtractor={String}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialPage - 1}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          maxToRenderPerBatch={1}
          removeClippedSubviews
          extraData={`${layout}:${mode}:${language}:${statusVersion}`}
          style={{ flex: 1 }}
        />

        <ReaderFooter
          layout={layout}
          mode={mode}
          onModeChange={setMode}
          onHeight={setFooterHeight}
        />
      </View>
    </>
  );
}

/** Dispatch to the correct layout component */
function PageContent({
  pageNum,
  layout,
  mode,
  language,
  mushafContentHeight,
  onWordPress,
}: {
  pageNum: number;
  layout: ReaderLayout;
  mode: ReaderMode;
  language: Language;
  mushafContentHeight: number;
  onWordPress: (word: Word, pageNum: number) => void;
}) {
  const page = getPage(pageNum);

  switch (layout) {
    case 'wbw':
      return <WbwPage page={page} mode={mode} language={language} bottomPadding={0} pageNumber={pageNum} />;
    case 'sentence':
      return <SentencePage page={page} mode={mode} language={language} bottomPadding={0} pageNumber={pageNum} />;
    case 'mushaf':
      return (
        <MushafPage
          page={page}
          mode={mode}
          contentHeight={mushafContentHeight > 0 ? mushafContentHeight : 600}
          onWordPress={(word) => onWordPress(word, pageNum)}
        />
      );
  }
}
