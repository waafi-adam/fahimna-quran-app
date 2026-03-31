import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme';
import type { ReaderLayout, ReaderMode } from '@/types/quran';

const LAYOUT_ICON: Record<ReaderLayout, keyof typeof Ionicons.glyphMap> = {
  wbw: 'grid-outline',
  sentence: 'document-text-outline',
  mushaf: 'book-outline',
};

const MODE_LABELS = ['Reading', 'Learning'];

type Props = {
  layout: ReaderLayout;
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  onHeight?: (h: number) => void;
};

export default function ReaderFooter({ layout, mode, onModeChange, onHeight }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const haptic = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  return (
    <View
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: colors.bg,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
      }}
    >
      {/* Mode toggle */}
      <View style={{ flex: 1 }}>
        <SegmentedControl
          values={MODE_LABELS}
          selectedIndex={mode === 'reading' ? 0 : 1}
          onChange={({ nativeEvent }) => {
            haptic();
            onModeChange(nativeEvent.selectedSegmentIndex === 0 ? 'reading' : 'learning');
          }}
          style={{ height: 32 }}
        />
      </View>

      {/* Layout icon — opens layout sheet */}
      <Pressable
        onPress={() => router.push('/layout-sheet')}
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          borderCurve: 'continuous',
          backgroundColor: colors.bgTertiary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={LAYOUT_ICON[layout]} size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
