import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStorage } from '@/hooks/use-storage';
import { useBookmarkVersion } from '@/hooks/use-bookmarks';
import { isAyahBookmarked, toggleAyahBookmark } from '@/lib/bookmarks';
import { getChapter, getTranslation } from '@/lib/quran-data';
import type { Language } from '@/types/quran';

export default function AyahSheet() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const router = useRouter();
  const [language] = useStorage<Language>('language', 'en');

  const surahNum = Number(surah);
  const ayahNum = Number(ayah);
  const chapter = getChapter(surahNum);
  const translations = getTranslation(language, surahNum);
  const transText = translations.find((t) => t.ayah === ayahNum)?.text ?? '';

  useBookmarkVersion();
  const bookmarked = isAyahBookmarked(surahNum, ayahNum);
  const page = chapter?.startPage ?? 1;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {chapter?.nameSimple} · Ayah {ayahNum}
          </Text>
          <Pressable
            onPress={() => toggleAyahBookmark(surahNum, ayahNum, page)}
            hitSlop={8}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: bookmarked ? '#FEF3C7' : '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={bookmarked ? '#D97706' : '#6B7280'}
            />
          </Pressable>
        </View>

        {/* Translation */}
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Translation</Text>
          <Text style={{ fontSize: 16, color: '#111827', lineHeight: 24 }}>{transText}</Text>
        </View>
      </ScrollView>

      {/* Footer button */}
      <View style={{ padding: 16, paddingBottom: 24 }}>
        <Pressable
          onPress={() => {
            router.dismiss();
            router.push(`/ayah/${surahNum}/${ayahNum}`);
          }}
          style={{
            backgroundColor: '#111827',
            borderRadius: 12,
            borderCurve: 'continuous',
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            Go to Ayah Detail
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
