import { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import { useStorage } from '@/hooks/use-storage';
import {
  getDueAndNewKeys,
  getReviewRecord,
  setReviewRecord,
  removeReviewRecord,
  recordReview,
  lemmaReviewKey,
} from '@/lib/review-store';
import {
  getLearningArabicForms,
  getFlashCards,
  getFlashCard,
  getLearningLemmaIds,
  getLemmaFlashCards,
  getOrphanLearningForms,
} from '@/lib/flashcard-data';
import { calculateNextReview, previewIntervals, shouldGraduate, defaultReviewRecord } from '@/lib/srs';
import { setWordStatus } from '@/lib/word-status';
import UsageTabs from '@/components/usage-tabs';
import type {
  FlashCard,
  ExactFlashCard,
  LemmaFlashCard,
  FlashcardMode,
  Language,
  ReviewGrade,
} from '@/types/quran';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type SessionState = 'front' | 'back';
type CardDirection = 'ar-to-en' | 'en-to-ar';

type DeckEntry = { card: FlashCard; direction: CardDirection };

function pickDirection(): CardDirection {
  return Math.random() < 0.3 ? 'en-to-ar' : 'ar-to-en';
}

function cardKey(card: FlashCard): string {
  return card.kind === 'exact' ? card.arabic : lemmaReviewKey(card.lemmaId);
}

export default function ReviewSessionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode] = useStorage<FlashcardMode>('flashcard-mode', 'exact');
  const [language] = useStorage<Language>('language', 'en');

  const deck = useMemo<DeckEntry[]>(() => {
    if (mode === 'exact') {
      const learningForms = getLearningArabicForms();
      const dueForms = getDueAndNewKeys(learningForms);
      const cards = getFlashCards(dueForms);
      return shuffle(cards).map((card) => ({ card, direction: pickDirection() }));
    }

    // Lemma mode: lemma cards + orphan exact cards mixed in
    const lemmaIds = getLearningLemmaIds();
    const dueLemmaKeys = getDueAndNewKeys(lemmaIds.map(lemmaReviewKey));
    const dueLemmaIds = dueLemmaKeys.map((k) => Number(k.slice('lemma:'.length)));
    const lemmaCards = getLemmaFlashCards(dueLemmaIds, language);

    const orphans = getOrphanLearningForms();
    const dueOrphans = getDueAndNewKeys(orphans);
    const orphanCards = getFlashCards(dueOrphans);

    const mixed: FlashCard[] = [...lemmaCards, ...orphanCards];
    return shuffle(mixed).map((card) => ({
      card,
      // Lemma cards are ar-to-en only; orphan exact cards keep the normal mix
      direction: card.kind === 'lemma' ? 'ar-to-en' : pickDirection(),
    }));
  }, [mode, language]);

  const [index, setIndex] = useState(0);
  const [state, setState] = useState<SessionState>('front');
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, graduated: 0 });

  const current = deck[index];
  const isFinished = index >= deck.length;

  const record = useMemo(() => {
    if (isFinished || !current) return null;
    return getReviewRecord(cardKey(current.card)) ?? defaultReviewRecord();
  }, [index, isFinished, current]);

  const intervals = useMemo(() => {
    if (!record) return null;
    return previewIntervals(record);
  }, [record]);

  const handleRate = useCallback((grade: ReviewGrade) => {
    if (!record || !current) return;

    const key = cardKey(current.card);
    const newRecord = calculateNextReview(record, grade);
    const graduated = shouldGraduate(newRecord);

    if (graduated) {
      removeReviewRecord(key);
      if (current.card.kind === 'exact') {
        graduateExactCard(current.card);
      } else {
        graduateLemmaCard(current.card);
        // Clean up any stale per-form records from prior exact-mode reviews
        for (const f of current.card.learningForms) removeReviewRecord(f);
      }
    } else {
      setReviewRecord(key, newRecord);
    }

    recordReview(graduated);
    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      graduated: prev.graduated + (graduated ? 1 : 0),
    }));

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
    return <SessionSummary stats={sessionStats} colors={colors} onDone={() => router.back()} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
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

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        {state === 'front' ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <CardFront card={current.card} direction={current.direction} colors={colors} />
          </View>
        ) : (
          <CardBack
            card={current.card}
            language={language}
            colors={colors}
          />
        )}
      </View>

      {/* Bottom buttons */}
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
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

// === Card front ===

function CardFront({ card, direction, colors }: {
  card: FlashCard;
  direction: CardDirection;
  colors: any;
}) {
  if (card.kind === 'lemma') {
    return <LemmaFront card={card} colors={colors} />;
  }
  return <ExactFront card={card} direction={direction} colors={colors} />;
}

function ExactFront({ card, direction, colors }: {
  card: ExactFlashCard;
  direction: CardDirection;
  colors: any;
}) {
  if (direction === 'ar-to-en') {
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

function LemmaFront({ card, colors }: { card: LemmaFlashCard; colors: any }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 40, fontFamily: 'UthmanicHafs', color: colors.text, textAlign: 'center' }}>
        {card.lemmaArabic}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 10 }}>
        from this lemma:
      </Text>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        gap: 18,
        paddingHorizontal: 12,
      }}>
        {card.learningForms.map((form) => (
          <Text
            key={form}
            style={{ fontSize: 28, fontFamily: 'UthmanicHafs', color: colors.text }}
          >
            {form}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: 14, color: colors.textFaint, marginTop: 20 }}>
        What does this word family mean?
      </Text>
    </View>
  );
}

// === Card back ===

function CardBack({ card, language, colors }: {
  card: FlashCard;
  language: Language;
  colors: any;
}) {
  if (card.kind === 'lemma') {
    return <LemmaBack card={card} language={language} colors={colors} />;
  }
  return <ExactBack card={card} language={language} colors={colors} />;
}

function ExactBack({ card, language, colors }: {
  card: ExactFlashCard;
  language: Language;
  colors: any;
}) {
  const meaningsInline = card.meanings.join(' / ');

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 36, fontFamily: 'UthmanicHafs', color: colors.text, textAlign: 'center' }}>
        {card.arabic}
      </Text>
      <View style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
        width: '100%',
      }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
          {meaningsInline}
        </Text>
        {card.transliteration ? (
          <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            {card.transliteration}
          </Text>
        ) : null}
      </View>

      <View style={{
        width: '100%',
        marginTop: 14,
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}>
        <UsageTabs
          arabic={card.arabic}
          exactMeaning={meaningsInline}
          lemmaId={card.lemmaId}
          rootId={card.rootId}
          initialTab="exact"
          language={language}
          colors={colors}
        />
      </View>
    </View>
  );
}

function LemmaBack({ card, language, colors }: {
  card: LemmaFlashCard;
  language: Language;
  colors: any;
}) {
  const learningSet = useMemo(() => new Set(card.learningForms), [card.learningForms]);
  // Pick a rootId from any learning form's exact card (all share same lemma, often same root)
  const rootId = useMemo(() => {
    for (const arabic of card.learningForms) {
      const exact = getFlashCard(arabic);
      if (exact?.rootId != null) return exact.rootId;
    }
    return undefined;
  }, [card.learningForms]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 32, fontFamily: 'UthmanicHafs', color: colors.text }}>
          {card.lemmaArabic}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
          {card.learningForms.length} of {card.forms.length}{' '}
          {card.forms.length === 1 ? 'form' : 'forms'} learning
        </Text>
      </View>

      <View style={{
        flex: 1,
        backgroundColor: colors.bgSecondary,
        borderRadius: 12,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}>
        <UsageTabs
          arabic={card.lemmaArabic}
          exactMeaning=""
          lemmaId={card.lemmaId}
          rootId={rootId}
          initialTab="lemma"
          hideExactTab
          learningForms={learningSet}
          language={language}
          colors={colors}
        />
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

function SessionSummary({ stats, colors, onDone }: {
  stats: { reviewed: number; graduated: number };
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
            {stats.graduated} {stats.graduated === 1 ? 'card' : 'cards'} graduated to Known!
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

// === Graduation helpers ===

function graduateExactCard(card: ExactFlashCard): void {
  if (card.locations.length === 0) return;
  const [s, v, w] = card.locations[0].split(':').map(Number);
  const word = { s, v, w, a: card.arabic, m: '', mi: '', mu: '', t: '', id: 0 } as any;
  setWordStatus(word, 'known', 'exact');
}

function graduateLemmaCard(card: LemmaFlashCard): void {
  if (card.learningForms.length === 0) return;
  const rep = card.learningForms[0];
  const exact = getFlashCard(rep);
  if (!exact || exact.locations.length === 0) return;
  const [s, v, w] = exact.locations[0].split(':').map(Number);
  // Setting `li` is the key — triggers the lemma branch in setWordStatus
  // which iterates lemma.words and marks every exact form as known.
  const word = { s, v, w, a: rep, m: '', mi: '', mu: '', t: '', id: 0, li: card.lemmaId } as any;
  setWordStatus(word, 'known', 'lemma');
}
