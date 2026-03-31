import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { getPage, getRootById, getLemmaById, isVerseMarker } from '@/lib/quran-data';
import { getWordMeaning } from '@/lib/page-helpers';
import type { Language, Word, AyahLine } from '@/types/quran';

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
  const { page, surah, verse, word: wordPos } = useLocalSearchParams<{
    page: string;
    surah: string;
    verse: string;
    word: string;
  }>();

  const [language] = useStorage<Language>('language', 'en');

  const w = findWord(Number(page), Number(surah), Number(verse), Number(wordPos));
  if (!w || isVerseMarker(w)) return null;

  const meaning = getWordMeaning(w, language);
  const root = w.ri != null ? getRootById(w.ri) : undefined;
  const lemma = w.li != null ? getLemmaById(w.li) : undefined;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      {/* Arabic word */}
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 40,
          color: '#111827',
          textAlign: 'center',
        }}
      >
        {w.a}
      </Text>

      {/* Transliteration */}
      {w.t.length > 0 && (
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
          {w.t}
        </Text>
      )}

      {/* Meaning */}
      <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Meaning</Text>
        <Text style={{ fontSize: 18, color: '#111827' }}>{meaning}</Text>
      </View>

      {/* Root */}
      {root && (
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Root</Text>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: '#111827' }}>
            {root.arabic}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Used {root.count} times in the Quran
          </Text>
        </View>
      )}

      {/* Lemma */}
      {lemma && (
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Lemma</Text>
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 24, color: '#111827' }}>
            {lemma.arabic}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Used {lemma.count} times in the Quran
          </Text>
        </View>
      )}

      {/* Location */}
      <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
        Surah {w.s} · Ayah {w.v} · Word {w.w}
      </Text>
    </ScrollView>
  );
}
