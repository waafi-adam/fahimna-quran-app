'use no memo';
import { View, Text, SectionList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBookmarks, removeBookmark, type Bookmark } from '@/lib/bookmarks';
import { useBookmarkVersion } from '@/hooks/use-bookmarks';
import { getChapter } from '@/lib/quran-data';

type BookmarkSection = {
  title: string;
  data: Bookmark[];
};

function BookmarkRow({ bookmark }: { bookmark: Bookmark }) {
  const router = useRouter();
  const isAyah = bookmark.sura != null;
  const chapter = isAyah ? getChapter(bookmark.sura!) : null;

  return (
    <Pressable
      onPress={() => router.push(`/page/${bookmark.page}`)}
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
          backgroundColor: isAyah ? '#FEF3C7' : '#E0E7FF',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={isAyah ? 'book-outline' : 'document-outline'}
          size={16}
          color={isAyah ? '#D97706' : '#4338CA'}
        />
      </View>

      <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
        {isAyah ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
              {chapter?.nameSimple} · Ayah {bookmark.ayah}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              p. {bookmark.page}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
              Page {bookmark.page}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
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
        <Ionicons name="close-circle-outline" size={20} color="#9CA3AF" />
      </Pressable>
    </Pressable>
  );
}

function getSurahNamesForPage(page: number): string {
  // Find surahs that start on or before this page
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
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Ionicons name="bookmark-outline" size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
        No Bookmarks
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
        Bookmark pages from the reader or ayahs from the ayah preview.
      </Text>
    </View>
  );
}

export default function BookmarksTab() {
  useBookmarkVersion(); // re-render on bookmark changes

  const bookmarks = getBookmarks();
  const pageBookmarks = bookmarks
    .filter((b) => b.sura == null)
    .sort((a, b) => b.timestamp - a.timestamp);
  const ayahBookmarks = bookmarks
    .filter((b) => b.sura != null)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (bookmarks.length === 0) {
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
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: '#f9fafb', paddingVertical: 6, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280' }}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <BookmarkRow bookmark={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ height: 0.5, backgroundColor: '#f3f4f6', marginLeft: 64 }} />
      )}
    />
  );
}
