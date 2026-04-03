import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { getPage, getMorphology, getAyahMorphology, getRootById, isVerseMarker } from '@/lib/quran-data';
import { getWordMeaning, getAyahPage } from '@/lib/page-helpers';
import { useTheme } from '@/lib/theme';
import TabPager from '@/components/tab-pager';
import WordSegments from '@/components/word-segments';
import MorphologyTable from '@/components/morphology-table';
import IrabView from '@/components/irab-view';
import type { Language, Word, AyahLine } from '@/types/quran';

/** Find all real words in an ayah by scanning the page */
function getAyahWords(surah: number, ayah: number): Word[] {
  const pageNum = getAyahPage(surah, ayah);
  const page = getPage(pageNum);
  const words: Word[] = [];
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const w of (line as AyahLine).words) {
      if (w.s === surah && w.v === ayah && !isVerseMarker(w)) {
        words.push(w);
      }
    }
  }
  return words;
}

export default function GrammarScreen() {
  const { surah, ayah, word } = useLocalSearchParams<{
    surah: string;
    ayah: string;
    word: string;
  }>();
  const router = useRouter();
  const [language] = useStorage<Language>('language', 'en');
  const { colors } = useTheme();

  const surahNum = Number(surah);
  const ayahNum = Number(ayah);
  const wordNum = Number(word);

  const morphology = getMorphology(surahNum, ayahNum, wordNum);
  const ayahWords = getAyahWords(surahNum, ayahNum);
  const currentWord = ayahWords.find((w) => w.w === wordNum);
  const ayahMorphology = getAyahMorphology(surahNum, ayahNum);
  const root = currentWord?.ri != null ? getRootById(currentWord.ri) : undefined;
  const meaning = currentWord ? getWordMeaning(currentWord, language) : '';

  const [tabIndex, setTabIndex] = useState(0);
  const tabLabels = ['صرف · Morphology', 'إعراب · Grammar'];

  if (!morphology || !currentWord) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Stack.Screen options={{ title: 'Grammar' }} />
        <Text style={{ color: colors.textMuted }}>No grammar data available</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: `${currentWord.a} · Grammar` }} />

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        {/* Word header */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 36, color: colors.text }}>
            {currentWord.a}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted }}>{meaning}</Text>
          {root && (
            <Text style={{ fontSize: 12, color: colors.textFaint }}>
              Root: {root.arabic}
            </Text>
          )}
        </View>

        {/* Tab bar */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {tabLabels.map((label, i) => {
            const isActive = i === tabIndex;
            return (
              <Pressable
                key={i}
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
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        {tabIndex === 0 ? (
          /* صرف (Morphology) Tab */
          <View style={{ gap: 20 }}>
            {/* Segments */}
            <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textFaint }}>تحليل الكلمة · Segmentation</Text>
              <WordSegments segments={morphology.seg} colors={colors} />
            </View>

            {/* Morphology table */}
            <MorphologyTable morphology={morphology} colors={colors} />
          </View>
        ) : (
          /* إعراب (Grammar) Tab */
          <View style={{ gap: 20 }}>
            {/* Word إعراب */}
            {morphology.irab && (
              <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textFaint }}>إعراب الكلمة</Text>
                <Text style={{ fontSize: 16, color: colors.text, textAlign: 'right', lineHeight: 26 }}>
                  {morphology.irab}
                </Text>
              </View>
            )}

            {/* Full ayah إعراب */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, color: colors.textFaint }}>
                إعراب الآية · Surah {surahNum}, Ayah {ayahNum}
              </Text>
              <IrabView
                words={ayahWords}
                morphologyMap={ayahMorphology}
                initialWordPos={wordNum}
                colors={colors}
                onWordPress={(w) => {
                  router.setParams({ word: String(w.w) });
                }}
              />
            </View>

            {/* Link to full ayah detail */}
            <Pressable
              onPress={() => router.push(`/ayah/${surahNum}/${ayahNum}?tab=irab&word=${wordNum}`)}
              style={{
                backgroundColor: colors.bgTertiary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '500' }}>
                إعراب وتفسير الآية كاملة
              </Text>
              <Text style={{ fontSize: 13, color: colors.accent }}>→</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
