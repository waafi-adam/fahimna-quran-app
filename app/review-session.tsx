import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { getDueArabicForms, getReviewRecord, setReviewRecord, removeReviewRecord, recordReview } from '@/lib/review-store';
import { getFlashCards } from '@/lib/flashcard-data';
import { calculateNextReview, previewIntervals, shouldGraduate } from '@/lib/srs';
import { setWordStatus } from '@/lib/word-status';
import type { FlashCard, ReviewGrade } from '@/types/quran';

// Shuffle array in place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type SessionState = 'front' | 'back';
type CardMode = 'ar-to-en' | 'en-to-ar';

export default function ReviewSessionScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Build the session deck once
  const deck = useMemo(() => {
    const dueForms = getDueArabicForms();
    const cards = getFlashCards(dueForms);
    // Alternate card modes: most are ar-to-en, ~30% en-to-ar
    return shuffle(cards).map((card) => ({
      card,
      mode: (Math.random() < 0.3 ? 'en-to-ar' : 'ar-to-en') as CardMode,
    }));
  }, []);

  const [index, setIndex] = useState(0);
  const [state, setState] = useState<SessionState>('front');
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, graduated: 0 });

  const current = deck[index];
  const isFinished = index >= deck.length;

  const record = useMemo(() => {
    if (isFinished) return null;
    return getReviewRecord(current.card.arabic);
  }, [index, isFinished]);

  const intervals = useMemo(() => {
    if (!record) return null;
    return previewIntervals(record);
  }, [record]);

  const handleRate = useCallback((grade: ReviewGrade) => {
    if (!record || !current) return;

    const newRecord = calculateNextReview(record, grade);
    const graduated = shouldGraduate(newRecord);

    if (graduated) {
      // Graduate: set word to "known" and remove review record
      removeReviewRecord(current.card.arabic);
      // Find a Word object to call setWordStatus
      graduateWord(current.card);
    } else {
      setReviewRecord(current.card.arabic, newRecord);
    }

    recordReview(graduated);
    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      graduated: prev.graduated + (graduated ? 1 : 0),
    }));

    // Move to next card
    setState('front');
    setIndex((i) => i + 1);
  }, [record, current]);

  if (deck.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg }}>
        <Ionicons name="checkmark-circle-outline" size={48} color={colors.progressKnown} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 }}>
          No cards due
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isFinished) {
    return <SessionSummary stats={sessionStats} total={deck.length} colors={colors} onDone={() => router.back()} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: colors.bgTertiary }}>
        <View style={{ height: 3, backgroundColor: colors.accent, width: `${(index / deck.length) * 100}%` }} />
      </View>

      {/* Card count */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{index + 1} / {deck.length}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
        {state === 'front' ? (
          <CardFront card={current.card} mode={current.mode} colors={colors} />
        ) : (
          <CardBack card={current.card} mode={current.mode} colors={colors} />
        )}
      </View>

      {/* Bottom buttons */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {state === 'front' ? (
          <Pressable
            onPress={() => setState('back')}
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: pressed ? colors.accent : colors.accent,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Show Answer</Text>
          </Pressable>
        ) : intervals ? (
          <RatingButtons intervals={intervals} onRate={handleRate} colors={colors} />
        ) : null}
      </View>
    </View>
  );
}

// === Card components ===

function CardFront({ card, mode, colors }: { card: FlashCard; mode: CardMode; colors: any }) {
  if (mode === 'ar-to-en') {
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontFamily: 'UthmanicHafs', color: colors.text, textAlign: 'center' }}>
          {card.arabic}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textFaint, marginTop: 12 }}>
          What does this word mean?
        </Text>
      </View>
    );
  }

  // en-to-ar — no transliteration here, it would reveal the answer
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
        {card.meanings.join(' / ')}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textFaint, marginTop: 12 }}>
        What is the Arabic word?
      </Text>
    </View>
  );
}

function CardBack({ card, mode, colors }: { card: FlashCard; mode: CardMode; colors: any }) {
  const meaningsInline = card.meanings.join(' / ');

  if (mode === 'ar-to-en') {
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontFamily: 'UthmanicHafs', color: colors.text, textAlign: 'center' }}>
          {card.arabic}
        </Text>
        <View style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: colors.bgSecondary,
          width: '100%',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
            {meaningsInline}
          </Text>
          {card.transliteration ? (
            <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
              {card.transliteration}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // en-to-ar — reveal Arabic
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 40, fontFamily: 'UthmanicHafs', color: colors.text, textAlign: 'center' }}>
        {card.arabic}
      </Text>
      <View style={{
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
        width: '100%',
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
          {meaningsInline}
        </Text>
        {card.transliteration ? (
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            {card.transliteration}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// === Rating buttons ===

const GRADE_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: '#FEE2E2', text: '#DC2626' },
  1: { bg: '#FEF3C7', text: '#D97706' },
  2: { bg: '#DBEAFE', text: '#2563EB' },
  3: { bg: '#D1FAE5', text: '#059669' },
};

const GRADE_LABELS = ['Forgot', 'Hard', 'Good', 'Easy'] as const;

function RatingButtons({ intervals, onRate, colors }: {
  intervals: { forgot: string; hard: string; good: string; easy: string };
  onRate: (grade: ReviewGrade) => void;
  colors: any;
}) {
  const intervalValues = [intervals.forgot, intervals.hard, intervals.good, intervals.easy];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {([0, 1, 2, 3] as const).map((grade) => (
        <Pressable
          key={grade}
          onPress={() => onRate(grade)}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: GRADE_COLORS[grade].bg,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: GRADE_COLORS[grade].text }}>
            {GRADE_LABELS[grade]}
          </Text>
          <Text style={{ fontSize: 11, color: GRADE_COLORS[grade].text, marginTop: 2, opacity: 0.7 }}>
            {intervalValues[grade]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// === Session summary ===

function SessionSummary({ stats, total, colors, onDone }: {
  stats: { reviewed: number; graduated: number };
  total: number;
  colors: any;
  onDone: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg }}>
      <Ionicons name="checkmark-circle" size={56} color={colors.progressKnown} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 16 }}>
        Session Complete
      </Text>

      <View style={{ marginTop: 24, gap: 8, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>
          {stats.reviewed} {stats.reviewed === 1 ? 'card' : 'cards'} reviewed
        </Text>
        {stats.graduated > 0 && (
          <Text style={{ fontSize: 16, color: colors.progressKnown }}>
            {stats.graduated} {stats.graduated === 1 ? 'word' : 'words'} graduated to Known!
          </Text>
        )}
      </View>

      <Pressable
        onPress={onDone}
        style={({ pressed }) => ({
          marginTop: 32,
          paddingVertical: 14,
          paddingHorizontal: 40,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: colors.accent,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Done</Text>
      </Pressable>
    </View>
  );
}

// === Helper: graduate a word to "known" ===

function graduateWord(card: FlashCard): void {
  if (card.locations.length === 0) return;
  const [s, v, w] = card.locations[0].split(':').map(Number);
  // Construct a minimal Word object — setWordStatus with 'exact' only needs s, v, w
  const word = { s, v, w, a: card.arabic, m: '', mi: '', mu: '', t: '', id: 0 } as any;
  setWordStatus(word, 'known', 'exact');
}
