'use no memo';
import { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { getJuzList, getRubList, getChapter } from '@/lib/quran-data';
import { getJuzProgress } from '@/lib/progress';
import ProgressBar, { getProgressColors } from '@/components/progress-bar';
import { useTheme } from '@/lib/theme';
import type { Rub } from '@/types/quran';

const juzList = getJuzList();
const rubList = getRubList();

// Pre-group rubs by juz (8 per juz)
const rubsByJuz: Rub[][] = juzList.map((j) => {
  const start = (j.id - 1) * 8;
  return rubList.slice(start, start + 8);
});

function quarterLabel(rubIndex: number): string {
  // Within a juz: 0-3 = hizb 1, 4-7 = hizb 2
  const hizbIndex = rubIndex < 4 ? 0 : 1;
  const qInHizb = rubIndex % 4;
  const labels = ['Start', '¼', '½', '¾'];
  return `Hizb ${hizbIndex + 1} — ${labels[qInHizb]}`;
}

function verseRef(verse: string): string {
  const [s, v] = verse.split(':');
  const ch = getChapter(Number(s));
  return ch ? `${ch.nameSimple} ${v}` : verse;
}

function RubRow({ rub, rubIndex }: { rub: Rub; rubIndex: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  // Figure out start page from first verse
  const [surahNum] = rub.firstVerse.split(':').map(Number);
  const ch = getChapter(surahNum);
  const page = ch?.startPage ?? 1;

  return (
    <Pressable
      onPress={() => router.push(`/page/${page}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: pressed ? colors.pressed : 'transparent',
        gap: 12,
        alignItems: 'center',
      })}
    >
      <View style={{ width: 28, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textFaint, fontVariant: ['tabular-nums'] }}>
          {rub.id}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>
          {quarterLabel(rubIndex)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>
          {verseRef(rub.firstVerse)} — {rub.versesCount} ayahs
        </Text>
      </View>

      <Text
        style={{ fontSize: 15, fontFamily: 'UthmanicHafs', color: colors.textSecondary, maxWidth: 160 }}
        numberOfLines={1}
      >
        {rub.snippet}
      </Text>
    </Pressable>
  );
}

function JuzCard({ juzId }: { juzId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  const pc = getProgressColors(colors);
  const juz = juzList[juzId - 1];
  const rubs = rubsByJuz[juzId - 1];
  const progress = getJuzProgress(juz);
  const hasProgress = progress.known > 0 || progress.learning > 0;

  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: pressed ? colors.pressed : 'transparent',
          gap: 12,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.juzBadgeBg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.juzBadge, fontVariant: ['tabular-nums'] }}>
            {juzId}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              Juz {juzId}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textFaint }}>
              {expanded ? '▾' : '▸'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {verseRef(juz.firstVerse)} — {juz.versesCount} ayahs
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar counts={progress} height={4} />
            </View>
            {hasProgress && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {progress.known > 0 && (
                  <Text style={{ fontSize: 10, color: pc.known, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                    {progress.known}
                  </Text>
                )}
                {progress.learning > 0 && (
                  <Text style={{ fontSize: 10, color: pc.learning, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                    {progress.learning}
                  </Text>
                )}
                <Text style={{ fontSize: 10, color: pc.new, fontVariant: ['tabular-nums'] }}>
                  {progress.new}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={{ backgroundColor: colors.bgExpanded }}>
          {rubs.map((rub, i) => (
            <RubRow key={rub.id} rub={rub} rubIndex={i} />
          ))}
        </View>
      )}
    </View>
  );
}

const juzIds = juzList.map((j) => j.id);

export default function JuzListTab() {
  const renderItem = useCallback(
    ({ item }: { item: number }) => <JuzCard juzId={item} />,
    [],
  );

  return (
    <FlatList
      data={juzIds}
      keyExtractor={(id) => String(id)}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}
