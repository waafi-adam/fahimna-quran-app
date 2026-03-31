import { View } from 'react-native';
import type { ProgressCounts } from '@/lib/progress';
import { useTheme, type Colors } from '@/lib/theme';

export function getProgressColors(colors: Colors) {
  return {
    new: colors.progressNew,
    learning: colors.progressLearning,
    known: colors.progressKnown,
  };
}

// Re-export for backward compat — consumers that just need static access
// can use getProgressColors(colors) instead
export { getProgressColors as PROGRESS_COLORS_FN };

type Props = {
  counts: ProgressCounts;
  height?: number;
};

export default function ProgressBar({ counts, height = 3 }: Props) {
  const { colors } = useTheme();

  if (counts.total === 0) return null;

  const knownPct = (counts.known / counts.total) * 100;
  const learningPct = (counts.learning / counts.total) * 100;
  const newPct = (counts.new / counts.total) * 100;

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.progressBg,
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {knownPct > 0 && (
        <View style={{ width: `${knownPct}%`, backgroundColor: colors.progressKnown }} />
      )}
      {learningPct > 0 && (
        <View style={{ width: `${learningPct}%`, backgroundColor: colors.progressLearning }} />
      )}
      {newPct > 0 && (
        <View style={{ width: `${newPct}%`, backgroundColor: colors.progressNew }} />
      )}
    </View>
  );
}
