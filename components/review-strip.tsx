import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDueCount } from '@/hooks/use-review';
import { useStorage } from '@/hooks/use-storage';
import { getTodayStats, getStreak } from '@/lib/review-store';
import { useTheme } from '@/lib/theme';
import type { FlashcardMode } from '@/types/quran';

export default function ReviewStrip() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mode] = useStorage<FlashcardMode>('flashcard-mode', 'exact');
  const [showStrip] = useStorage<boolean>('show-review-strip', true);
  const dueCount = useDueCount(mode);
  const today = getTodayStats();
  const streak = getStreak();
  const practicedCount = today.reviewed + today.promoted + today.mastered;

  // Hidden via Settings toggle, or nothing to show at all
  if (!showStrip) return null;
  if (dueCount === 0 && practicedCount === 0 && streak === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/review')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 4,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderCurve: 'continuous',
        backgroundColor: pressed ? colors.pressed : colors.bgSecondary,
      })}
    >
      <Ionicons name="albums-outline" size={16} color={colors.accent} style={{ marginRight: 10 }} />

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {dueCount}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>due</Text>

        <Text style={{ fontSize: 13, color: colors.borderInactive, marginHorizontal: 4 }}>·</Text>

        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {practicedCount}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>practiced</Text>

        {streak > 0 && (
          <>
            <Text style={{ fontSize: 13, color: colors.borderInactive, marginHorizontal: 4 }}>·</Text>
            <Ionicons name="flame" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
              {streak}
            </Text>
          </>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}
