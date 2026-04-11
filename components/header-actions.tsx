import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDueCount } from '@/hooks/use-review';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import type { FlashcardMode } from '@/types/quran';

export default function HeaderActions() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mode] = useStorage<FlashcardMode>('flashcard-mode', 'exact');
  const dueCount = useDueCount(mode);

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {/* Review */}
      <Pressable
        onPress={() => router.push('/review')}
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
        <Ionicons name="albums-outline" size={16} color={colors.textMuted} />
        {dueCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.accent,
              borderWidth: 1.5,
              borderColor: colors.bg,
            }}
          />
        )}
      </Pressable>

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
