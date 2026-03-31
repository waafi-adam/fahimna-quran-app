import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { PageData, ReaderMode, Language, Word } from '@/types/quran';
import { getTranslation, isVerseMarker } from '@/lib/quran-data';
import { getPageSections } from '@/lib/page-helpers';
import { getWordStatus } from '@/lib/word-status';
import SurahBanner from '@/components/surah-banner';
import BismillahBanner from '@/components/bismillah-banner';

/** Translation row – always visible in reading mode, tap-to-reveal in learning mode */
function SentenceTranslation({ text, mode }: { text: string; mode: ReaderMode }) {
  const [revealed, setRevealed] = useState(mode === 'reading');

  if (mode === 'reading') {
    return (
      <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginTop: 4 }}>
        {text}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => setRevealed((r) => !r)} style={{ marginTop: 4 }}>
      {revealed ? (
        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>{text}</Text>
      ) : (
        <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Tap to reveal translation</Text>
      )}
    </Pressable>
  );
}

const STATUS_COLOR: Record<string, string | undefined> = {
  new: '#DBEAFE',
  learning: '#FEF3C7',
  known: undefined,
};

type Props = {
  page: PageData;
  mode: ReaderMode;
  language: Language;
  bottomPadding: number;
  pageNumber: number;
};

/** Render inline Arabic words with per-word tap handling */
function AyahText({ words, mode, pageNumber, router }: { words: Word[]; mode: ReaderMode; pageNumber: number; router: ReturnType<typeof useRouter> }) {
  return (
    <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, lineHeight: 48, textAlign: 'right', writingDirection: 'rtl' }}>
      {words.map((word) => {
        const bg = mode === 'learning' ? STATUS_COLOR[getWordStatus(word)] : undefined;
        return (
          <Text
            key={word.id}
            onPress={() => {
              if (isVerseMarker(word)) {
                router.push(`/ayah-sheet?surah=${word.s}&ayah=${word.v}`);
              } else {
                router.push(`/word-sheet?page=${pageNumber}&surah=${word.s}&verse=${word.v}&word=${word.w}`);
              }
            }}
            style={bg ? { backgroundColor: bg, borderRadius: 4 } : undefined}
          >
            {word.a}{' '}
          </Text>
        );
      })}
    </Text>
  );
}

export default function SentencePage({ page, mode, language, bottomPadding, pageNumber }: Props) {
  const router = useRouter();
  const sections = getPageSections(page);

  // Pre-load translations
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
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomPadding + 16 }}
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
            <AyahText words={section.words} mode={mode} pageNumber={pageNumber} router={router} />

            {transText.length > 0 && (
              <SentenceTranslation text={transText} mode={mode} />
            )}

            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginTop: 12 }} />
          </View>
        );
      })}
    </ScrollView>
  );
}
