import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDueCount } from '@/hooks/use-review';
import { getTodayStats, getStreak } from '@/lib/review-store';
import { useStorage } from '@/hooks/use-storage';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import { getOverallProgress } from '@/lib/progress';
import { useTheme, type Colors } from '@/lib/theme';
import type { FlashcardMode } from '@/types/quran';

function showFlashcardInfo() {
  Alert.alert(
    'How flashcards work',
    'Only words you mark as "Learning" enter the flashcard deck. Mark words while reading (tap a word → Learning).\n\n' +
    'When a card is due, you rate how well you remembered it. The better you know it, the longer until you see it again.\n\n' +
    'Once your memory of a card is strong enough (interval ≥ 60 days), it graduates to "Known" and leaves the deck — you\'ve mastered it.\n\n' +
    'In Lemma mode, graduating one card marks every related form (same lemma) as Known at once.',
  );
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

function ModeToggle({ mode, setMode, colors }: {
  mode: FlashcardMode;
  setMode: (m: FlashcardMode) => void;
  colors: Colors;
}) {
  const options: { key: FlashcardMode; label: string; caption: string }[] = [
    { key: 'exact', label: 'Exact', caption: 'One card per exact word form' },
    { key: 'lemma', label: 'Lemma', caption: 'Group related forms — graduating marks all same-lemma words known' },
  ];
  const activeCaption = options.find((o) => o.key === mode)?.caption ?? '';

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: 10,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
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
      <Text style={{
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 8,
      }}>
        {activeCaption}
      </Text>
    </View>
  );
}

function coercePrimitive(v: unknown, label: string): string | number {
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[Chip] non-primitive ${label} coerced to 0:`, v);
  }
  return 0;
}

function Chip({ label, value, icon, colors }: {
  label: string;
  value: unknown;
  icon: keyof typeof Ionicons.glyphMap;
  colors: Colors;
}) {
  const safeValue = coercePrimitive(value, `value (${label})`);
  const safeLabel = typeof label === 'string' ? label : String(label ?? '');

  return (
    <View style={{
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 10,
      borderCurve: 'continuous',
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      gap: 4,
    }}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
        {safeValue}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center' }} numberOfLines={1}>
        {safeLabel}
      </Text>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: Colors }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '700',
      color: colors.textFaint,
      letterSpacing: 0.6,
      marginTop: 20,
      marginBottom: 10,
    }}>
      {label}
    </Text>
  );
}

export default function ReviewDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mode, setMode] = useStorage<FlashcardMode>('flashcard-mode', 'exact');
  const dueCount = useDueCount(mode);
  const todayStats = getTodayStats();
  const streak = getStreak();

  const statusVersion = useWordStatusVersion();
  const overall = useMemo(() => getOverallProgress(), [statusVersion]);

  const dueLabel = mode === 'lemma'
    ? (dueCount === 1 ? 'lemma due for review' : 'lemmas due for review')
    : (dueCount === 1 ? 'word due for review' : 'words due for review');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Due count hero */}
      <View style={{
        alignItems: 'center',
        padding: 32,
        borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
        marginBottom: 16,
      }}>
        <Pressable
          onPress={showFlashcardInfo}
          hitSlop={8}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 14,
            right: 14,
            padding: 6,
            borderRadius: 999,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
        </Pressable>

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
            backgroundColor: dueCount > 0 ? colors.accent : colors.bgTertiary,
            opacity: pressed ? 0.85 : 1,
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

      {/* Today breakdown */}
      <SectionLabel label="TODAY" colors={colors} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip
          label="Reviewed"
          value={todayStats.reviewed}
          icon="checkmark-circle-outline"
          colors={colors}
        />
        <Chip
          label="To Learn"
          value={todayStats.promoted}
          icon="trending-up-outline"
          colors={colors}
        />
        <Chip
          label="To Known"
          value={todayStats.mastered}
          icon="school-outline"
          colors={colors}
        />
        <Chip
          label="Day streak"
          value={streak}
          icon="flame-outline"
          colors={colors}
        />
      </View>

      {/* Overall summary — links to full comprehension dashboard */}
      <SectionLabel label="OVERALL" colors={colors} />
      <Pressable
        onPress={() => router.push('/dashboard')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: pressed ? colors.pressed : colors.bgSecondary,
        })}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Text style={{ fontSize: 13, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>{formatNum(overall.known)}</Text>
              <Text style={{ color: colors.textMuted }}> known</Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.borderInactive }}>·</Text>
            <Text style={{ fontSize: 13, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>{formatNum(overall.learning)}</Text>
              <Text style={{ color: colors.textMuted }}> learning</Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.borderInactive }}>·</Text>
            <Text style={{ fontSize: 13, color: colors.text }}>
              <Text style={{ fontWeight: '700' }}>{formatNum(overall.new)}</Text>
              <Text style={{ color: colors.textMuted }}> new</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
            See full progress
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      {/* Empty state help text */}
      {dueCount === 0 && todayStats.reviewed === 0 && (
        <View style={{ alignItems: 'center', marginTop: 32, paddingHorizontal: 20 }}>
          <Ionicons name="school-outline" size={36} color={colors.borderInactive} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Mark words as &quot;Learning&quot; while reading to add them to your flashcard deck.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
