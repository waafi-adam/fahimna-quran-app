import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Word, WordStatus, ReaderMode, Language } from '@/types/quran';
import { isVerseMarker } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';

const STATUS_BG: Record<WordStatus, string | undefined> = {
  new: '#DBEAFE',
  learning: '#FEF3C7',
  known: undefined,
};

type Props = {
  word: Word;
  status: WordStatus;
  mode: ReaderMode;
  language: Language;
  onPress?: () => void;
};

function WordCard({ word, status, mode, language, onPress }: Props) {
  if (isVerseMarker(word)) {
    return (
      <Pressable onPress={onPress} hitSlop={4} style={{ paddingHorizontal: 2, paddingVertical: 4, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: '#6B7280' }}>
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
          color: '#111827',
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
            color: '#6B7280',
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
