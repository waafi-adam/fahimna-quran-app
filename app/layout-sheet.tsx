import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStorage } from '@/hooks/use-storage';
import type { ReaderLayout } from '@/types/quran';

const LAYOUTS: { key: ReaderLayout; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'wbw', icon: 'grid-outline', title: 'Word by Word', subtitle: 'Arabic with meanings for each word' },
  { key: 'sentence', icon: 'document-text-outline', title: 'Sentence', subtitle: 'Full ayah text with translation' },
  { key: 'mushaf', icon: 'book-outline', title: 'Mushaf', subtitle: 'Traditional Quran page layout' },
];

export default function LayoutSheet() {
  const router = useRouter();
  const [layout, setLayout] = useStorage<ReaderLayout>('readerLayout', 'wbw');

  const select = (key: ReaderLayout) => {
    setLayout(key);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Reading Layout</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 12 }}>
        SELECT LAYOUT
      </Text>

      <View style={{ gap: 8 }}>
        {LAYOUTS.map((item) => {
          const selected = layout === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => select(item.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 12,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: selected ? '#111827' : '#E5E7EB',
                backgroundColor: selected ? '#F9FAFB' : '#fff',
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name={item.icon} size={20} color="#374151" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.subtitle}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selected ? '#111827' : '#D1D5DB',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#111827' }} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
