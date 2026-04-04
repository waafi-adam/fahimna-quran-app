'use no memo';
import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { PageData, ReaderMode, Language, Word } from '@/types/quran';
import { getTranslation, isVerseMarker } from '@/lib/quran-data';
import { getPageSections } from '@/lib/page-helpers';
import { getWordStatus } from '@/lib/word-status';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import type { AudioState } from '@/lib/audio-player';
import AyahPlayButtons from '@/components/ayah-play-buttons';
import AyahBookmarkButton from '@/components/ayah-bookmark-button';
import SurahBanner from '@/components/surah-banner';
import BismillahBanner from '@/components/bismillah-banner';

/** Translation row – always visible in reading mode, tap-to-reveal in learning mode */
function SentenceTranslation({ text, mode }: { text: string; mode: ReaderMode }) {
  const [revealed, setRevealed] = useState(mode === 'reading');
  const { colors } = useTheme();

  if (mode === 'reading') {
    return (
      <Text style={{ fontSize: 14, color: colors.textTertiary, lineHeight: 22, marginTop: 4 }}>
        {text}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => setRevealed((r) => !r)} style={{ marginTop: 4 }}>
      {revealed ? (
        <Text style={{ fontSize: 14, color: colors.textTertiary, lineHeight: 22 }}>{text}</Text>
      ) : (
        <Text style={{ fontSize: 12, color: colors.textFaint, fontStyle: 'italic' }}>Tap to reveal translation</Text>
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

/** Render inline Arabic words with per-word tap handling */
function AyahText({ words, mode, pageNumber, router, isPlayingAyah, audio }: { words: Word[]; mode: ReaderMode; pageNumber: number; router: ReturnType<typeof useRouter>; isPlayingAyah: boolean; audio: AudioState; }) {
  const { colors } = useTheme();

  const STATUS_COLOR: Record<string, string | undefined> = {
    new: colors.statusNewBg,
    learning: colors.statusLearningBg,
    known: undefined,
  };

  return (
    <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, lineHeight: 48, textAlign: 'right', writingDirection: 'rtl' }}>
      {words.map((word) => {
        const isActiveWord = isPlayingAyah && audio.activeWordPos === word.w;
        const bg = mode === 'learning' ? STATUS_COLOR[getWordStatus(word)] : undefined;
        const textColor = isActiveWord ? colors.audioWordText : undefined;
        return (
          <Text
            key={word.id}
            onPress={() => {
              if (isVerseMarker(word)) {
                router.push(`/ayah-sheet?surah=${word.s}&ayah=${word.v}`);
              } else {
                router.push(`/word-sheet?page=${pageNumber}&surah=${word.s}&verse=${word.v}&word=${word.w}&mode=${mode}`);
              }
            }}
            style={bg || textColor ? { backgroundColor: bg, borderRadius: 4, color: textColor } : undefined}
          >
            {word.a}{' '}
          </Text>
        );
      })}
    </Text>
  );
}

export default function SentencePage({ page, mode, language, bottomPadding, pageNumber }: Props) {
  useWordStatusVersion();
  const router = useRouter();
  const { colors } = useTheme();
  const audio = useAudioPlayer();
  const [reciter] = useStorage('reciter', 'husary-murattal');
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
        const isPlayingAyah = audio.status === 'playing' && audio.surah === section.surah && audio.ayah === section.verse;

        return (
          <View
            key={`${section.surah}:${section.verse}`}
            style={isPlayingAyah ? { backgroundColor: colors.audioAyahBg, borderRadius: 8, padding: 4, margin: -4 } : undefined}
          >
            {/* Bookmark top-left, ayah menu top-right */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AyahBookmarkButton surah={section.surah} ayah={section.verse} page={pageNumber} />
              <Pressable
                onPress={() => router.push(`/ayah-sheet?surah=${section.surah}&ayah=${section.verse}`)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '700' }}>···</Text>
              </Pressable>
            </View>

            <AyahText words={section.words} mode={mode} pageNumber={pageNumber} router={router} isPlayingAyah={isPlayingAyah} audio={audio} />

            {/* Play controls – right aligned */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
              <AyahPlayButtons surah={section.surah} ayah={section.verse} reciter={reciter} />
            </View>

            {transText.length > 0 && (
              <SentenceTranslation text={transText} mode={mode} />
            )}

            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 12 }} />
          </View>
        );
      })}
    </ScrollView>
  );
}
