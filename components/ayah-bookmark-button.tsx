import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isAyahBookmarked, toggleAyahBookmark } from '@/lib/bookmarks';
import { useBookmarkVersion } from '@/hooks/use-bookmarks';
import { useTheme } from '@/lib/theme';

type Props = {
  surah: number;
  ayah: number;
  page: number;
};

export default function AyahBookmarkButton({ surah, ayah, page }: Props) {
  useBookmarkVersion();
  const { colors } = useTheme();
  const bookmarked = isAyahBookmarked(surah, ayah);

  return (
    <Pressable onPress={() => toggleAyahBookmark(surah, ayah, page)} hitSlop={8}>
      <Ionicons
        name={bookmarked ? 'bookmark' : 'bookmark-outline'}
        size={18}
        color={bookmarked ? colors.bookmark : colors.textMuted}
      />
    </Pressable>
  );
}
