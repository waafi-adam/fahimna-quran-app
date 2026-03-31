import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          {chapter?.nameSimple} · Ayah {ayahNum}
        </Text>

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
