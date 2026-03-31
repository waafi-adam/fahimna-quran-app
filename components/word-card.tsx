import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Word, WordStatus, ReaderMode, Language } from '@/types/quran';
import { isVerseMarker } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';
import { useTheme } from '@/lib/theme';

type Props = {
  word: Word;
  status: WordStatus;
  mode: ReaderMode;
  language: Language;
  onPress?: () => void;
  isActiveWord?: boolean;
};

function WordCard({ word, status, mode, language, onPress, isActiveWord }: Props) {
  const { colors } = useTheme();

  const STATUS_BG: Record<WordStatus, string | undefined> = {
    new: colors.statusNewBg,
    learning: colors.statusLearningBg,
    known: undefined,
  };

  if (isVerseMarker(word)) {
    return (
      <Pressable onPress={onPress} hitSlop={4} style={{ paddingHorizontal: 2, paddingVertical: 4, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: colors.textMuted }}>
          {word.a}
        </Text>
      </Pressable>
    );
  }

  const meaning = getWordMeaning(word, language);
  const showBg = mode === 'learning' && status !== 'known';
  const showMeaning = mode === 'reading' || (mode === 'learning' && status !== 'known');
  const meaningOpacity = mode === 'learning' && status === 'learning' ? 0.4 : 1;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 6,
        paddingVertical: 4,
        alignItems: 'center',
        backgroundColor: showBg ? STATUS_BG[status] : undefined,
        borderRadius: 8,
        borderCurve: 'continuous',
        minWidth: 44,
      }}
    >
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 22,
          color: isActiveWord ? colors.audioWordText : colors.text,
          textAlign: 'center',
        }}
      >
        {word.a}
      </Text>
      {showMeaning && (
        <Text
          numberOfLines={2}
          style={{
            fontSize: 10,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 1,
            opacity: meaningOpacity,
            maxWidth: 80,
          }}
        >
          {meaning}
        </Text>
      )}
    </Pressable>
  );
}

export default memo(WordCard);
