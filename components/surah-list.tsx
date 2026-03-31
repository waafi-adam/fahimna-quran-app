import { View, Text, Pressable, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { getChapters, getJuzList } from '@/lib/quran-data';
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

  return (
    <Pressable
      onPress={() => router.push(`/page/${chapter.startPage}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? '#f3f4f6' : 'transparent',
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#e0e7ff',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#4338ca', fontVariant: ['tabular-nums'] }}>
          {chapter.id}
        </Text>
      </View>

      <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
            {chapter.nameSimple}
          </Text>
          <Text
            style={{ fontSize: 18, fontFamily: 'UthmanicHafs', color: '#111827' }}
          >
            {chapter.nameArabic}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
            {chapter.revelationPlace}
          </Text>
          <Text style={{ fontSize: 12, color: '#d1d5db' }}>·</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', fontVariant: ['tabular-nums'] }}>
            {chapter.versesCount} ayahs
          </Text>
          <Text style={{ fontSize: 12, color: '#d1d5db' }}>·</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', fontVariant: ['tabular-nums'] }}>
            p. {chapter.startPage}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function SurahList() {
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: '#f9fafb', paddingVertical: 6, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>
            Juz {section.juz}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <SurahRow chapter={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ height: 0.5, backgroundColor: '#f3f4f6', marginLeft: 64 }} />
      )}
    />
  );
}
