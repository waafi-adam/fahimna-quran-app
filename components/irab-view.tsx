import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { Word, WordMorphology } from '@/types/quran';
import { isVerseMarker } from '@/lib/quran-data';
import type { Colors } from '@/lib/theme';

type Props = {
  words: Word[];
  morphologyMap: Record<number, WordMorphology>;
  initialWordPos?: number;
  colors: Colors;
  onWordPress?: (word: Word) => void;
};

export default function IrabView({ words, morphologyMap, initialWordPos, colors, onWordPress }: Props) {
  const realWords = words.filter((w) => !isVerseMarker(w));
  const [activePos, setActivePos] = useState(initialWordPos ?? realWords[0]?.w ?? 1);
  const activeMorph = morphologyMap[activePos];

  return (
    <View style={{ gap: 16 }}>
      {/* Ayah text with tappable words */}
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {realWords.map((w) => {
          const isActive = w.w === activePos;
          return (
            <Pressable
              key={w.w}
              onPress={() => {
                setActivePos(w.w);
                onWordPress?.(w);
              }}
              style={{
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: isActive ? colors.accentBg : undefined,
                borderWidth: isActive ? 1 : 0,
                borderColor: colors.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: 'UthmanicHafs',
                  fontSize: 20,
                  color: isActive ? colors.accent : colors.text,
                  textAlign: 'center',
                }}
              >
                {w.a}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active word إعراب detail */}
      {activeMorph && (
        <View style={{ backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16, gap: 8 }}>
          {/* Syntactic role badge */}
          {(activeMorph.syntacticRole || activeMorph.caseAr) && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ backgroundColor: colors.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                  {activeMorph.syntacticRole || activeMorph.caseAr}
                </Text>
              </View>
              {(activeMorph.syntacticRoleEn || activeMorph.pos) && (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {activeMorph.syntacticRoleEn || activeMorph.pos}
                </Text>
              )}
            </View>
          )}

          {/* Full إعراب sentence */}
          {activeMorph.irab && (
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24, textAlign: 'right' }}>
              {activeMorph.irab}
            </Text>
          )}

          {/* POS summary */}
          <Text style={{ fontSize: 12, color: colors.textMuted }}>
            {activeMorph.posAr} · {activeMorph.pos}
          </Text>
        </View>
      )}

      {/* All words إعراب list */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {realWords.map((w) => {
          const m = morphologyMap[w.w];
          if (!m) return null;
          const isActive = w.w === activePos;
          return (
            <Pressable
              key={w.w}
              onPress={() => setActivePos(w.w)}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'flex-start',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isActive ? colors.accentBg : undefined,
                gap: 12,
              }}
            >
              <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18, color: colors.text, minWidth: 60, textAlign: 'right' }}>
                {w.a}
              </Text>
              <View style={{ flex: 1 }}>
                {m.irab && (
                  <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                    {m.irab}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'right' }}>
                  {m.posAr}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
