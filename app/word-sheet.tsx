import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { useWordStatus } from '@/hooks/use-word-status';
import { getPage, getRootById, getLemmaById, isVerseMarker } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';
import { setWordStatus } from '@/lib/word-status';
import { useTheme } from '@/lib/theme';
import type { Language, Word, AyahLine, WordStatus, PropagationMode, ReaderMode } from '@/types/quran';

/** Find a word by surah:verse:position on a given page */
function findWord(pageNum: number, surah: number, verse: number, wordPos: number): Word | null {
  const page = getPage(pageNum);
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const w of (line as AyahLine).words) {
      if (w.s === surah && w.v === verse && w.w === wordPos) return w;
    }
  }
  return null;
}

export default function WordSheet() {
  const { page, surah, verse, word: wordPos, mode } = useLocalSearchParams<{
    page: string;
    surah: string;
    verse: string;
    word: string;
    mode: string;
  }>();

  const router = useRouter();
  const [language] = useStorage<Language>('language', 'en');
  const [propagation] = useStorage<PropagationMode>('propagation', 'lemma');
  const { colors } = useTheme();

  const w = findWord(Number(page), Number(surah), Number(verse), Number(wordPos));
  if (!w || isVerseMarker(w)) return null;

  const currentStatus = useWordStatus(w);
  const meaning = getWordMeaning(w, language);
  const root = w.ri != null ? getRootById(w.ri) : undefined;
  const lemma = w.li != null ? getLemmaById(w.li) : undefined;
  const isLearning = mode === 'learning';

  const STATUS_OPTIONS: { key: WordStatus; label: string; bg: string; border: string }[] = [
    { key: 'new', label: 'New', bg: colors.statusNewBg, border: colors.statusNewBorder },
    { key: 'learning', label: 'Learning', bg: colors.statusLearningBg, border: colors.statusLearningBorder },
    { key: 'known', label: 'Known', bg: colors.statusKnownBg, border: colors.statusKnownBorder },
  ];

  const handleStatusPress = (status: WordStatus) => {
    setWordStatus(w, status, propagation);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} style={{ backgroundColor: colors.bg }}>
      {/* Arabic word */}
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 40,
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {w.a}
      </Text>

      {/* Status selector — learning mode only */}
      {isLearning && (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = currentStatus === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => handleStatusPress(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  backgroundColor: isActive ? opt.bg : 'transparent',
                  borderWidth: 1.5,
                  borderColor: isActive ? opt.border : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? colors.text : colors.textMuted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Transliteration */}
      {w.t.length > 0 && (
        <Text style={{ fontSize: 16, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' }}>
          {w.t}
        </Text>
      )}

      {/* Meaning */}
      <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 4 }}>Meaning</Text>
        <Text style={{ fontSize: 18, color: colors.text }}>{meaning}</Text>
      </View>

      {/* Root */}
      {root && (
        <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 4 }}>Root</Text>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: colors.text }}>
            {root.arabic}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            Used {root.count} times in the Quran
          </Text>
        </View>
      )}

      {/* Lemma */}
      {lemma && (
        <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 4 }}>Lemma</Text>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: colors.text }}>
            {lemma.arabic}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            Used {lemma.count} times in the Quran
          </Text>
        </View>
      )}

      {/* Location */}
      <Text style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center' }}>
        Surah {w.s} · Ayah {w.v} · Word {w.w}
      </Text>
    </ScrollView>
  );
}
