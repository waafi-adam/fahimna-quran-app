import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function AyahScreen() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: colors.text }}>
        Ayah {surah}:{ayah}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted }}>
        Single Ayah View — WBW + Translation + Tafsir
      </Text>
    </View>
  );
}
