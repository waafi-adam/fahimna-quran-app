import { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { getJuzList, getRubList, getChapter } from '@/lib/quran-data';
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
        backgroundColor: pressed ? '#f3f4f6' : 'transparent',
        gap: 12,
        alignItems: 'center',
      })}
    >
      <View style={{ width: 28, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', fontVariant: ['tabular-nums'] }}>
          {rub.id}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
          {quarterLabel(rubIndex)}
        </Text>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>
          {verseRef(rub.firstVerse)} — {rub.versesCount} ayahs
        </Text>
      </View>

      <Text
        style={{ fontSize: 15, fontFamily: 'UthmanicHafs', color: '#374151', maxWidth: 160 }}
        numberOfLines={1}
      >
        {rub.snippet}
      </Text>
    </Pressable>
  );
}

function JuzCard({ juzId }: { juzId: number }) {
  const [expanded, setExpanded] = useState(false);
  const juz = juzList[juzId - 1];
  const rubs = rubsByJuz[juzId - 1];

  return (
    <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' }}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: pressed ? '#f3f4f6' : 'transparent',
          gap: 12,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#fef3c7',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e', fontVariant: ['tabular-nums'] }}>
            {juzId}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
            Juz {juzId}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {verseRef(juz.firstVerse)} — {juz.versesCount} ayahs
          </Text>
        </View>

        <Text style={{ fontSize: 16, color: '#9ca3af' }}>
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={{ backgroundColor: '#fafafa' }}>
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
