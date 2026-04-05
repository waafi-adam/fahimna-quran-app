'use no memo';
import { View, Text, SectionList, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBookmarks, removeBookmark, type Bookmark } from '@/lib/bookmarks';
import { useBookmarkVersion } from '@/hooks/use-bookmarks';
import { getReadingHistory, type ReadingHistoryEntry } from '@/lib/reading-history';
import { useReadingHistoryVersion } from '@/hooks/use-reading-history';
import { getChapter } from '@/lib/quran-data';
import { useTheme } from '@/lib/theme';

type BookmarkSection = {
  title: string;
  data: Bookmark[];
};

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function RecentlyReadCard({ entry }: { entry: ReadingHistoryEntry }) {
  const router = useRouter();
  const { colors } = useTheme();
  const surahNames = getSurahNamesForPage(entry.page);

  return (
    <Pressable
      onPress={() => router.push(`/page/${entry.page}`)}
      style={({ pressed }) => ({
        width: 110,
        padding: 10,
        marginRight: 10,
        borderRadius: 12,
        backgroundColor: pressed ? colors.pressed : colors.bgSecondary,
        borderWidth: 0.5,
        borderColor: colors.borderLight,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.accentBg,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name="time-outline" size={14} color={colors.accent} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
        Page {entry.page}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
        {surahNames}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 4 }}>
        {formatRelativeTime(entry.timestamp)}
      </Text>
    </Pressable>
  );
}

function RecentlyReadStrip({ history }: { history: ReadingHistoryEntry[] }) {
  const { colors } = useTheme();

  if (history.length === 0) return null;

  return (
    <View style={{ paddingTop: 12, paddingBottom: 8 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
        Recently Read
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {history.map((entry) => (
          <RecentlyReadCard key={`r:${entry.page}`} entry={entry} />
        ))}
      </ScrollView>
    </View>
  );
}

function BookmarkRow({ bookmark }: { bookmark: Bookmark }) {
  const router = useRouter();
  const { colors } = useTheme();
  const isAyah = bookmark.sura != null;
  const chapter = isAyah ? getChapter(bookmark.sura!) : null;

  return (
    <Pressable
      onPress={() => {
        const params = bookmark.sura != null && bookmark.ayah != null
          ? `?surah=${bookmark.sura}&ayah=${bookmark.ayah}`
          : '';
        router.push(`/page/${bookmark.page}${params}`);
      }}
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
          backgroundColor: isAyah ? colors.bookmarkBg : colors.accentBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={isAyah ? 'book-outline' : 'document-outline'}
          size={16}
          color={isAyah ? colors.bookmark : colors.accent}
        />
      </View>

      <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
        {isAyah ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              {chapter?.nameSimple} · Ayah {bookmark.ayah}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              p. {bookmark.page}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
              Page {bookmark.page}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {getSurahNamesForPage(bookmark.page)}
            </Text>
          </>
        )}
      </View>

      <Pressable
        onPress={() => removeBookmark(bookmark)}
        hitSlop={8}
        style={{ padding: 4 }}
      >
        <Ionicons name="close-circle-outline" size={20} color={colors.textFaint} />
      </Pressable>
    </Pressable>
  );
}

function getSurahNamesForPage(page: number): string {
  const names: string[] = [];
  for (let id = 1; id <= 114; id++) {
    const ch = getChapter(id);
    if (!ch) continue;
    const nextCh = getChapter(id + 1);
    const endPage = nextCh ? nextCh.startPage - 1 : 604;
    if (ch.startPage <= page && page <= endPage) {
      names.push(ch.nameSimple);
    }
  }
  return names.join(', ');
}

function EmptyState() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Ionicons name="bookmark-outline" size={40} color={colors.borderInactive} style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
        No Bookmarks
      </Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
        Bookmark pages from the reader or ayahs from the ayah preview.
      </Text>
    </View>
  );
}

export default function BookmarksTab() {
  const { colors } = useTheme();
  useBookmarkVersion(); // re-render on bookmark changes
  useReadingHistoryVersion(); // re-render on reading history changes

  const bookmarks = getBookmarks();
  const readingHistory = getReadingHistory()
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);

  const pageBookmarks = bookmarks
    .filter((b) => b.sura == null)
    .sort((a, b) => b.timestamp - a.timestamp);
  const ayahBookmarks = bookmarks
    .filter((b) => b.sura != null)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (bookmarks.length === 0 && readingHistory.length === 0) {
    return <EmptyState />;
  }

  const sections: BookmarkSection[] = [];
  if (pageBookmarks.length > 0) {
    sections.push({ title: 'Page Bookmarks', data: pageBookmarks });
  }
  if (ayahBookmarks.length > 0) {
    sections.push({ title: 'Ayah Bookmarks', data: ayahBookmarks });
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) =>
        item.sura != null ? `a:${item.sura}:${item.ayah}` : `p:${item.page}`
      }
      contentInsetAdjustmentBehavior="automatic"
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={<RecentlyReadStrip history={readingHistory} />}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: colors.bgSecondary, paddingVertical: 6, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <BookmarkRow bookmark={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 64 }} />
      )}
    />
  );
}
