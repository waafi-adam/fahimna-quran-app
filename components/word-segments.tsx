import { View, Text } from 'react-native';
import type { WordSegment } from '@/types/quran';
import type { Colors } from '@/lib/theme';

type Props = {
  segments: WordSegment[];
  colors: Colors;
};

const SEG_BG: Record<WordSegment['type'], (c: Colors) => string | undefined> = {
  prefix: (c) => c.statusNewBg,
  stem: () => undefined,
  suffix: (c) => c.statusLearningBg,
};

export default function WordSegments({ segments, colors }: Props) {
  if (segments.length === 0) return null;

  // Single segment — no tree, just label
  if (segments.length === 1) {
    const s = segments[0];
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 22, color: colors.text }}>
          {s.ar}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{s.posAr}</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{s.posEn}</Text>
      </View>
    );
  }

  // Multiple segments — display in RTL row
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={{
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: SEG_BG[s.type]?.(colors),
            minWidth: 48,
          }}
        >
          <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 20, color: colors.text }}>
            {s.ar}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>
            {s.posAr}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>
            {s.posEn}
          </Text>
        </View>
      ))}
    </View>
  );
}
