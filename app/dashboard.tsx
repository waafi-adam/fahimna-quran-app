'use no memo';
import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getChapters } from '@/lib/quran-data';
import {
  getOverallProgress,
  getSurahProgress,
  comprehensionPercent,
  type ProgressCounts,
} from '@/lib/progress';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import ProgressBar from '@/components/progress-bar';
import { useTheme } from '@/lib/theme';

function formatNum(n: number): string {
  return n.toLocaleString();
}

type SurahProgressRow = {
  id: number;
  name: string;
  nameArabic: string;
  startPage: number;
  counts: ProgressCounts;
  pct: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const statusVersion = useWordStatusVersion();

  const overall = useMemo(() => getOverallProgress(), [statusVersion]);
  const overallPct = comprehensionPercent(overall);

  const surahRows = useMemo(() => {
    const chapters = getChapters();
    const rows: SurahProgressRow[] = chapters.map((ch) => {
      const counts = getSurahProgress(ch.id);
      return {
        id: ch.id,
        name: ch.nameSimple,
        nameArabic: ch.nameArabic,
        startPage: ch.startPage,
        counts,
        pct: comprehensionPercent(counts),
      };
    });
    // Sort by % descending, then by surah id
    rows.sort((a, b) => b.pct - a.pct || a.id - b.id);
    return rows;
  }, [statusVersion]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Hero — overall comprehension */}
      <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 8 }}>
          You understand
        </Text>
        <Text style={{ fontSize: 56, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {overallPct}%
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
          of the Quran
        </Text>
      </View>

      {/* Word stats bar */}
      <View style={{ paddingHorizontal: 24, gap: 8 }}>
        <ProgressBar counts={overall} height={12} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.progressKnown }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Known {formatNum(overall.known)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.progressLearning }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Learning {formatNum(overall.learning)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.progressNew }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              New {formatNum(overall.new)}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 4 }}>
          {formatNum(overall.total)} total words
        </Text>
      </View>

      {/* Surah progress list */}
      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, paddingHorizontal: 24, marginBottom: 12 }}>
          Surahs by Progress
        </Text>

        {surahRows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push(`/page/${row.startPage}`)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              paddingHorizontal: 24,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <Text
              style={{
                width: 28,
                fontSize: 12,
                color: colors.textFaint,
                fontVariant: ['tabular-nums'],
              }}
            >
              {row.id}
            </Text>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                  {row.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                  {row.pct}%
                </Text>
              </View>
              <ProgressBar counts={row.counts} height={3} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
