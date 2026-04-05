'use no memo';
import { View, Text, Pressable, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { getChapters, getJuzList } from '@/lib/quran-data';
import { getSurahProgress } from '@/lib/progress';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import ProgressBar, { getProgressColors } from '@/components/progress-bar';
import { useTheme } from '@/lib/theme';
import type { Chapter } from '@/types/quran';

type SurahSection = {
  juz: number;
  data: Chapter[];
};

function buildSections(): SurahSection[] {
  const chapters = getChapters();
  const juzList = getJuzList();
  const sections: SurahSection[] = juzList.map((j) => ({ juz: j.id, data: [] }));
  const juzMap = new Map(sections.map((s) => [s.juz, s]));

  for (const ch of chapters) {
    juzMap.get(ch.juz)?.data.push(ch);
  }

  return sections.filter((s) => s.data.length > 0);
}

const sections = buildSections();

function SurahRow({ chapter }: { chapter: Chapter }) {
  const router = useRouter();
  const { colors } = useTheme();
  const pc = getProgressColors(colors);
  const progress = getSurahProgress(chapter.id);
  const hasProgress = progress.known > 0 || progress.learning > 0;

  return (
    <Pressable
      onPress={() => router.push(`/page/${chapter.startPage}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? colors.pressed : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.accentBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent, fontVariant: ['tabular-nums'] }}>
          {chapter.id}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {chapter.nameSimple}
          </Text>
          <Text
            style={{ fontSize: 18, fontFamily: 'UthmanicHafs', color: colors.text }}
          >
            {chapter.nameArabic}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' }}>
            {chapter.revelationPlace}
          </Text>
          <Text style={{ fontSize: 12, color: colors.borderInactive }}>·</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
            {chapter.versesCount} ayahs
          </Text>
          <Text style={{ fontSize: 12, color: colors.borderInactive }}>·</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
            p. {chapter.startPage}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar counts={progress} height={4} />
          </View>
          {hasProgress && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {progress.known > 0 && (
                <Text style={{ fontSize: 10, color: pc.known, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {progress.known} known
                </Text>
              )}
              {progress.learning > 0 && (
                <Text style={{ fontSize: 10, color: pc.learning, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {progress.learning} learning
                </Text>
              )}
              <Text style={{ fontSize: 10, color: pc.new, fontVariant: ['tabular-nums'] }}>
                {progress.new} new
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function SurahList() {
  const { colors } = useTheme();
  useWordStatusVersion(); // re-render all rows when any word status changes
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: colors.bgSecondary, paddingVertical: 6, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
            Juz {section.juz}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <SurahRow chapter={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 64 }} />
      )}
    />
  );
}
