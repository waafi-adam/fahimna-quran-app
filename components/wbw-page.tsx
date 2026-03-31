'use no memo';
import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { PageData, ReaderMode, Language } from '@/types/quran';
import { getTranslation, isVerseMarker } from '@/lib/quran-data';
import { getPageSections } from '@/lib/page-helpers';
import { getWordStatus } from '@/lib/word-status';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import WordCard from '@/components/word-card';
import SurahBanner from '@/components/surah-banner';
import BismillahBanner from '@/components/bismillah-banner';

/** Translation row – always visible in reading mode, tap-to-reveal in learning mode */
function AyahTranslation({ text, mode }: { text: string; mode: ReaderMode }) {
  const [revealed, setRevealed] = useState(mode === 'reading');

  if (mode === 'reading') {
    return (
      <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20, marginTop: 6, paddingHorizontal: 4 }}>
        {text}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => setRevealed((r) => !r)} style={{ marginTop: 6, paddingHorizontal: 4 }}>
      {revealed ? (
        <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20 }}>{text}</Text>
      ) : (
        <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Tap to reveal translation</Text>
      )}
    </Pressable>
  );
}

type Props = {
  page: PageData;
  mode: ReaderMode;
  language: Language;
  bottomPadding: number;
  pageNumber: number;
};

export default function WbwPage({ page, mode, language, bottomPadding, pageNumber }: Props) {
  useWordStatusVersion();
  const router = useRouter();
  const sections = getPageSections(page);

  // Pre-load translations for surahs on this page
  const translationCache = new Map<number, Map<number, string>>();
  for (const section of sections) {
    if (section.type === 'ayah' && !translationCache.has(section.surah)) {
      const trans = getTranslation(language, section.surah);
      const map = new Map<number, string>();
      for (const t of trans) map.set(t.ayah, t.text);
      translationCache.set(section.surah, map);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPadding + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section, i) => {
        if (section.type === 'surah_name') {
          return <SurahBanner key={`s-${section.surah}`} surah={section.surah} />;
        }
        if (section.type === 'bismillah') {
          return <BismillahBanner key={`b-${i}`} />;
        }

        const transText = translationCache.get(section.surah)?.get(section.verse) ?? '';

        return (
          <View key={`${section.surah}:${section.verse}`}>
            {/* Word cards – RTL flow */}
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' }}>
              {section.words.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  status={getWordStatus(word)}
                  mode={mode}
                  language={language}
                  onPress={
                    isVerseMarker(word)
                      ? () => router.push(`/ayah-sheet?surah=${word.s}&ayah=${word.v}`)
                      : () => router.push(`/word-sheet?page=${pageNumber}&surah=${word.s}&verse=${word.v}&word=${word.w}&mode=${mode}`)
                  }
                />
              ))}
            </View>

            {/* Ayah translation */}
            {transText.length > 0 && (
              <AyahTranslation text={transText} mode={mode} />
            )}

            {/* Subtle divider between ayahs */}
            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginTop: 8 }} />
          </View>
        );
      })}
    </ScrollView>
  );
}
