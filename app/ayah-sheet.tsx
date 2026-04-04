import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStorage } from '@/hooks/use-storage';
import { useBookmarkVersion } from '@/hooks/use-bookmarks';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { isAyahBookmarked, toggleAyahBookmark } from '@/lib/bookmarks';
import { playAyah, playFrom, stop } from '@/lib/audio-player';
import { getChapter, getTranslation } from '@/lib/quran-data';
import { useTheme } from '@/lib/theme';
import type { Language } from '@/types/quran';

export default function AyahSheet() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const router = useRouter();
  const [language] = useStorage<Language>('language', 'en');
  const { colors } = useTheme();

  const surahNum = Number(surah);
  const ayahNum = Number(ayah);
  const chapter = getChapter(surahNum);
  const translations = getTranslation(language, surahNum);
  const transText = translations.find((t) => t.ayah === ayahNum)?.text ?? '';

  useBookmarkVersion();
  const bookmarked = isAyahBookmarked(surahNum, ayahNum);
  const page = chapter?.startPage ?? 1;
  const audio = useAudioPlayer();
  const [reciter] = useStorage('reciter', 'husary-murattal');
  const isThisPlaying = audio.surah === surahNum && audio.ayah === ayahNum && audio.status !== 'idle';

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>
          {chapter?.nameSimple} · Ayah {ayahNum}
        </Text>
        <Pressable
          onPress={() => toggleAyahBookmark(surahNum, ayahNum, page)}
          hitSlop={8}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: bookmarked ? colors.bookmarkBg : colors.bgTertiary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={14}
            color={bookmarked ? colors.bookmark : colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Translation */}
      <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 12, color: colors.textFaint, marginBottom: 4 }}>Translation</Text>
        <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24 }}>{transText}</Text>
      </View>

      {/* Audio */}
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 12, color: colors.textFaint }}>Audio</Text>
        {isThisPlaying ? (
          <Pressable
            onPress={stop}
            style={{
              backgroundColor: colors.destructiveBg,
              borderRadius: 12,
              borderCurve: 'continuous',
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="stop-circle" size={20} color={colors.destructive} />
            <Text style={{ fontSize: 15, color: colors.destructive, fontWeight: '500' }}>Stop</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => playAyah(reciter, surahNum, ayahNum)}
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                borderCurve: 'continuous',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="play-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>Play this ayah</Text>
            </Pressable>
            <Pressable
              onPress={() => playFrom(reciter, surahNum, ayahNum)}
              style={{
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                borderCurve: 'continuous',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="play-forward-outline" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>Play from here</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Grammar */}
      <Pressable
        onPress={() => {
          router.dismiss();
          router.push(`/ayah/${surahNum}/${ayahNum}?tab=irab`);
        }}
        style={{
          backgroundColor: colors.bgSecondary,
          borderRadius: 12,
          borderCurve: 'continuous',
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
        <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>
          إعراب الآية · Sentence Grammar
        </Text>
      </Pressable>

      {/* Go to Ayah Detail */}
      <Pressable
        onPress={() => {
          router.dismiss();
          router.push(`/ayah/${surahNum}/${ayahNum}`);
        }}
        style={{
          backgroundColor: colors.buttonBg,
          borderRadius: 12,
          borderCurve: 'continuous',
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: '600' }}>
          Go to Ayah Detail
        </Text>
      </Pressable>
    </ScrollView>
  );
}
