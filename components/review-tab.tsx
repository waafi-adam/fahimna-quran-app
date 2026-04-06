import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDueCount } from '@/hooks/use-review';
import { getTodayStats, getStreak } from '@/lib/review-store';
import { useTheme } from '@/lib/theme';

function StatBox({ label, value, icon, colors }: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
}) {
  return (
    <View style={{
      flex: 1,
      padding: 14,
      borderRadius: 12,
      borderCurve: 'continuous',
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      gap: 6,
    }}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

export default function ReviewTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const dueCount = useDueCount();
  const todayStats = getTodayStats();
  const streak = getStreak();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Due count hero */}
      <View style={{
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: colors.text }}>
          {dueCount}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4 }}>
          {dueCount === 1 ? 'word due for review' : 'words due for review'}
        </Text>

        <Pressable
          onPress={() => {
            if (dueCount > 0) router.push('/review-session');
          }}
          disabled={dueCount === 0}
          style={({ pressed }) => ({
            marginTop: 20,
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: dueCount > 0
              ? pressed ? colors.accent : colors.accent
              : colors.bgTertiary,
          })}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: dueCount > 0 ? '#fff' : colors.textFaint,
          }}>
            {dueCount > 0 ? 'Start Review' : 'All caught up!'}
          </Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatBox
          label="Reviewed today"
          value={todayStats.reviewed}
          icon="checkmark-circle-outline"
          colors={colors}
        />
        <StatBox
          label="Graduated"
          value={todayStats.graduated}
          icon="school-outline"
          colors={colors}
        />
        <StatBox
          label={streak === 1 ? 'Day streak' : 'Day streak'}
          value={streak}
          icon="flame-outline"
          colors={colors}
        />
      </View>

      {/* Empty state help text */}
      {dueCount === 0 && todayStats.reviewed === 0 && (
        <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
          <Ionicons name="school-outline" size={36} color={colors.borderInactive} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Mark words as "Learning" while reading to add them to your flashcard deck.
          </Text>
        </View>
      )}
    </View>
  );
}
