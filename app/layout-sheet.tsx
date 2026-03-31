import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import type { ReaderLayout } from '@/types/quran';

const LAYOUTS: { key: ReaderLayout; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'wbw', icon: 'grid-outline', title: 'Word by Word', subtitle: 'Arabic with meanings for each word' },
  { key: 'sentence', icon: 'document-text-outline', title: 'Sentence', subtitle: 'Full ayah text with translation' },
  { key: 'mushaf', icon: 'book-outline', title: 'Mushaf', subtitle: 'Traditional Quran page layout' },
];

export default function LayoutSheet() {
  const router = useRouter();
  const [layout, setLayout] = useStorage<ReaderLayout>('readerLayout', 'wbw');
  const { colors } = useTheme();

  const select = (key: ReaderLayout) => {
    setLayout(key);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Reading Layout</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textFaint, letterSpacing: 0.5, marginBottom: 12 }}>
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
                borderColor: selected ? colors.text : colors.border,
                backgroundColor: selected ? colors.bgSecondary : colors.bg,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{item.subtitle}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selected ? colors.text : colors.borderInactive,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text }} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
