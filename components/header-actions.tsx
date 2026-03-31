import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

export default function HeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {/* Dashboard */}
      <Pressable
        onPress={() => router.push('/dashboard')}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: colors.accentBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="stats-chart-outline" size={16} color={colors.accent} />
      </Pressable>

      {/* Settings */}
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: colors.bgTertiary,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
