import { View } from 'react-native';
import type { ProgressCounts } from '@/lib/progress';

// Match the highlight colors used in the reader
const COLORS = {
  new: '#93C5FD',      // blue (same family as #DBEAFE highlight)
  learning: '#FCD34D', // yellow (same family as #FEF3C7 highlight)
  known: '#6EE7B7',    // green (same family as #D1FAE5 highlight)
};

export { COLORS as PROGRESS_COLORS };

type Props = {
  counts: ProgressCounts;
  height?: number;
};

export default function ProgressBar({ counts, height = 3 }: Props) {
  if (counts.total === 0) return null;

  const knownPct = (counts.known / counts.total) * 100;
  const learningPct = (counts.learning / counts.total) * 100;
  const newPct = (counts.new / counts.total) * 100;

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: '#E5E7EB',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {knownPct > 0 && (
        <View style={{ width: `${knownPct}%`, backgroundColor: COLORS.known }} />
      )}
      {learningPct > 0 && (
        <View style={{ width: `${learningPct}%`, backgroundColor: COLORS.learning }} />
      )}
      {newPct > 0 && (
        <View style={{ width: `${newPct}%`, backgroundColor: COLORS.new }} />
      )}
    </View>
  );
}
