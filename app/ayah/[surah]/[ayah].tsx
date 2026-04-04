import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { useStorage } from '@/hooks/use-storage';
import {
  getChapter, getPage, getTranslation, getTafsirText,
  getTafsirIndex, getAyahMorphology, isVerseMarker,
} from '@/lib/quran-data';
import { getAyahPage } from '@/lib/page-helpers';
import { useTheme } from '@/lib/theme';
import IrabView from '@/components/irab-view';
import type { Language, Word, AyahLine } from '@/types/quran';

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

const TAFSIR_SLUGS: Record<string, string> = { en: 'abridged', id: 'mokhtasar', ur: 'as-saadi' };

export default function AyahScreen() {
  const { surah, ayah, tab: initialTab, word: initialWord } = useLocalSearchParams<{
    surah: string;
    ayah: string;
    tab?: string;
    word?: string;
  }>();
  const [language] = useStorage<Language>('language', 'en');
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const surahNum = Number(surah);
  const ayahNum = Number(ayah);
  const chapter = getChapter(surahNum);

  const [tabIndex, setTabIndex] = useState(initialTab === 'irab' ? 1 : 0);

  // Translation
  const translations = getTranslation(language, surahNum);
  const transText = translations.find((t) => t.ayah === ayahNum)?.text ?? '';

  // Tafsir
  const slug = TAFSIR_SLUGS[language];
  const tafsirHtml = slug ? getTafsirText(language, slug, surahNum, ayahNum) : null;

  // Grammar
  const ayahWords = getAyahWords(surahNum, ayahNum);
  const ayahMorphology = getAyahMorphology(surahNum, ayahNum);

  // Full ayah text
  const ayahText = ayahWords.map((w) => w.a).join(' ');

  const tabLabels = ['تفسير · Tafsir', 'إعراب · Grammar'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{ title: `${chapter?.nameSimple ?? 'Surah'} ${surahNum}:${ayahNum}` }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
        {/* Ayah Arabic text */}
        <Text
          style={{
            fontFamily: 'UthmanicHafs',
            fontSize: 24,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 44,
          }}
        >
          {ayahText}
        </Text>

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
          /* تفسير (Tafsir) Tab */
          <View style={{ gap: 20 }}>
            {/* Translation */}
            <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 6 }}>Translation</Text>
              <Text style={{ fontSize: 16, color: colors.text, lineHeight: 26 }}>{transText}</Text>
            </View>

            {/* Tafsir */}
            {tafsirHtml && (
              <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
                <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 6 }}>Tafsir</Text>
                <RenderHtml
                  contentWidth={width - 72}
                  source={{ html: tafsirHtml }}
                  baseStyle={{ color: colors.text, fontSize: 15, lineHeight: 24 }}
                  tagsStyles={{
                    p: { marginTop: 0, marginBottom: 8 },
                    h2: { fontSize: 16, fontWeight: '600', color: colors.text },
                  }}
                />
              </View>
            )}
          </View>
        ) : (
          /* إعراب (Grammar) Tab */
          <View style={{ gap: 16 }}>
            <IrabView
              words={ayahWords}
              morphologyMap={ayahMorphology}
              initialWordPos={initialWord ? Number(initialWord) : undefined}
              colors={colors}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
