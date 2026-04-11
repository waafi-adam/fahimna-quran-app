import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDueCount } from '@/hooks/use-review';
import { getTodayStats, getStreak } from '@/lib/review-store';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import type { FlashcardMode } from '@/types/quran';

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

function ModeToggle({ mode, setMode, colors }: {
  mode: FlashcardMode;
  setMode: (m: FlashcardMode) => void;
  colors: any;
}) {
  const options: { key: FlashcardMode; label: string }[] = [
    { key: 'exact', label: 'Exact' },
    { key: 'lemma', label: 'Lemma' },
  ];
  return (
    <View style={{
      flexDirection: 'row',
      padding: 4,
      borderRadius: 10,
      borderCurve: 'continuous',
      backgroundColor: colors.bgSecondary,
      marginBottom: 16,
    }}>
      {options.map((opt) => {
        const isActive = mode === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setMode(opt.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: isActive ? colors.bg : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? colors.text : colors.textMuted,
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ReviewTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mode, setMode] = useStorage<FlashcardMode>('flashcard-mode', 'exact');
  const dueCount = useDueCount(mode);
  const todayStats = getTodayStats();
  const streak = getStreak();

  const dueLabel = mode === 'lemma'
    ? (dueCount === 1 ? 'lemma due for review' : 'lemmas due for review')
    : (dueCount === 1 ? 'word due for review' : 'words due for review');

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Due count hero */}
      <View style={{
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
        marginBottom: 16,
      }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: colors.text }}>
          {dueCount}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4 }}>
          {dueLabel}
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

      {/* Mode toggle */}
      <ModeToggle mode={mode} setMode={setMode} colors={colors} />

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
            Mark words as &quot;Learning&quot; while reading to add them to your flashcard deck.
          </Text>
        </View>
      )}
    </View>
  );
}
