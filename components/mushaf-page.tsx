'use no memo';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { PageData, AyahLine, ReaderMode, Word } from '@/types/quran';
import { getChapter } from '@/lib/quran-data';
import { getWordStatus } from '@/lib/word-status';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useTheme } from '@/lib/theme';

const BISMILLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

type Props = {
  page: PageData;
  mode: ReaderMode;
  contentHeight: number;
  onWordPress?: (word: Word) => void;
  highlightAyah?: { surah: number; ayah: number } | null;
};

export default function MushafPage({ page, mode, contentHeight, onWordPress, highlightAyah }: Props) {
  useWordStatusVersion();
  const { colors } = useTheme();
  const audio = useAudioPlayer();
  const [showHighlight, setShowHighlight] = useState(!!highlightAyah);

  useEffect(() => {
    if (!highlightAyah) return;
    setShowHighlight(true);
    const timer = setTimeout(() => setShowHighlight(false), 2400);
    return () => clearTimeout(timer);
  }, [highlightAyah]);

  const STATUS_COLOR: Record<string, string | undefined> = {
    new: colors.statusNewBg,
    learning: colors.statusLearningBg,
    known: undefined,
  };

  // Build inline children: surah banners break the flow, everything else is continuous text
  const blocks: React.ReactNode[] = [];
  let currentWords: Word[] = [];

  const flushWords = () => {
    if (currentWords.length === 0) return;
    const words = currentWords;
    currentWords = [];
    blocks.push(
      <Text
        key={`t-${words[0].id}`}
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 24,
          color: colors.text,
          textAlign: 'center',
          writingDirection: 'rtl',
          lineHeight: 48,
        }}
      >
        {words.map((word, idx) => {
          const isActiveWord = audio.status === 'playing' && audio.surah === word.s && audio.ayah === word.v && audio.activeWordPos === word.w;
          const isHighlightWord = showHighlight && highlightAyah && word.s === highlightAyah.surah && word.v === highlightAyah.ayah;
          const bg = isHighlightWord ? colors.accentBg : (mode === 'learning' ? STATUS_COLOR[getWordStatus(word)] : undefined);
          const textColor = isActiveWord ? colors.audioWordText : colors.text;
          return (
            <Text
              key={word.id}
              onPress={() => onWordPress?.(word)}
              style={{
                backgroundColor: bg,
                borderRadius: bg ? 4 : undefined,
                color: textColor,
              }}
            >
              {idx > 0 ? ' ' : ''}{word.a}
            </Text>
          );
        })}
      </Text>,
    );
  };

  for (const line of page.lines) {
    if (line.type === 'surah_name') {
      flushWords();
      const fontKey = `surah${String(line.surah).padStart(3, '0')}`;
      const ch = getChapter(line.surah);
      blocks.push(
        <View key={`s-${line.line}`} style={{ alignItems: 'center', marginVertical: 8 }}>
          <Text style={{ fontFamily: 'SurahName', fontSize: 24, color: colors.textSecondary, textAlign: 'center' }}>
            {fontKey}
          </Text>
          {ch?.bismillahPre && (
            <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 22, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              {BISMILLAH_TEXT}
            </Text>
          )}
        </View>,
      );
      continue;
    }
    if (line.type === 'bismillah') continue;
    if (line.type === 'ayah') {
      for (const word of (line as AyahLine).words) {
        currentWords.push(word);
      }
    }
  }
  flushWords();

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {blocks}
    </ScrollView>
  );
}
