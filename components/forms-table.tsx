import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { Colors } from '@/lib/theme';
import { resolveOccurrences, highlightInText } from '@/lib/occurrences';
import type { Language, DerivedForm } from '@/types/quran';

export const FORM_ROW_HEIGHT = 44;
export const HEADER_HEIGHT = 48;
export const COLLAPSED_ROWS = 3;
export const EXPANDED_ROWS = 8;

const LANG_INDEX: Record<string, number> = { en: 1, id: 2, ur: 3 };

/** Get meaning from a DerivedForm tuple based on language */
export function getFormMeaning(form: DerivedForm, lang: Language): string {
  const idx = LANG_INDEX[lang] as 1 | 2 | 3;
  return form[idx] || form[1];
}

export type FormRow = {
  arabic: string;
  meaning: string;
  count: number;
  isLearning?: boolean;
  /** Required when expandableRows is true */
  locations?: string[];
};

/** Adapt a `DerivedForm` tuple to a FormRow in the current language */
export function derivedFormToRow(form: DerivedForm, language: Language): FormRow {
  return {
    arabic: form[0],
    meaning: getFormMeaning(form, language),
    count: form[4],
  };
}

type FormsTableProps = {
  rows: FormRow[];
  /** Header arabic text (lemma or root), optional */
  headerArabic?: string;
  headerTotal?: number;
  /** Highlight a specific row (word-sheet use case) */
  currentArabic?: string;
  colors: Colors;
  language: Language;
  /** When true, tapping a row expands inline usages instead of calling onFormPress */
  expandableRows?: boolean;
  /** Max height of the inline-expanded usage list (scrollable) */
  maxExpandedRowHeight?: number;
  /** When expandableRows is false, called on row tap */
  onFormPress?: (row: FormRow) => void;
};

function OccurrenceList({
  locations,
  arabic,
  language,
  colors,
  maxHeight,
}: {
  locations: string[];
  arabic: string;
  language: Language;
  colors: Colors;
  maxHeight: number;
}) {
  const occurrences = useMemo(
    () => resolveOccurrences(locations, null, new Set([arabic]), language),
    [locations, arabic, language],
  );

  if (occurrences.length === 0) {
    return (
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          No examples available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      nestedScrollEnabled
      style={{ maxHeight }}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {occurrences.map((item) => {
        const translationSegments = highlightInText(item.translation, item.wbwMeaning);
        return (
          <View
            key={item.key}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>
              {item.surah}:{item.ayah}
            </Text>
            <Text
              style={{
                fontFamily: 'UthmanicHafs',
                fontSize: 18,
                color: colors.text,
                lineHeight: 32,
                textAlign: 'right',
              }}
            >
              {item.words.map((w, i) => (
                <Text
                  key={i}
                  style={w.isMatch ? { color: colors.audioWordText } : undefined}
                >
                  {i > 0 ? ' ' : ''}{w.text}
                </Text>
              ))}
            </Text>
            {item.translation.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                {translationSegments.map((seg, i) => (
                  <Text
                    key={i}
                    style={seg.bold ? { fontWeight: '700', color: colors.text } : undefined}
                  >
                    {seg.text}
                  </Text>
                ))}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function FormsTable({
  rows,
  headerArabic,
  headerTotal,
  currentArabic,
  colors,
  language,
  expandableRows = false,
  maxExpandedRowHeight = 220,
  onFormPress,
}: FormsTableProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [expandedArabic, setExpandedArabic] = useState<string | null>(null);

  // Scroll to current row (word-sheet use case)
  useEffect(() => {
    if (!currentArabic) return;
    const idx = rows.findIndex((r) => r.arabic === currentArabic);
    if (idx > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: idx * FORM_ROW_HEIGHT, animated: false });
      });
    }
  }, [rows, currentArabic]);

  const handleRowPress = useCallback(
    (row: FormRow) => {
      if (expandableRows) {
        setExpandedArabic((prev) => (prev === row.arabic ? null : row.arabic));
      } else {
        onFormPress?.(row);
      }
    },
    [expandableRows, onFormPress],
  );

  return (
    <View style={{ flex: 1 }}>
      {headerArabic != null && (
        <View style={{ height: HEADER_HEIGHT, justifyContent: 'center', paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18, color: colors.text }}>
              {headerArabic}
            </Text>
            {headerTotal != null && (
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {headerTotal} times, {rows.length} {rows.length === 1 ? 'form' : 'forms'}
              </Text>
            )}
          </View>
        </View>
      )}

      <ScrollView ref={scrollRef} nestedScrollEnabled style={{ flex: 1 }}>
        {rows.map((row) => {
          const isCurrent = row.arabic === currentArabic;
          const isExpanded = expandableRows && expandedArabic === row.arabic;

          return (
            <View key={row.arabic}>
              <Pressable
                onPress={() => handleRowPress(row)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: FORM_ROW_HEIGHT,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: isCurrent ? colors.accentBg : 'transparent',
                  borderLeftWidth: row.isLearning ? 4 : 0,
                  borderLeftColor: row.isLearning ? colors.accent : 'transparent',
                }}
              >
                <Text
                  style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}
                  numberOfLines={1}
                >
                  {row.meaning}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    marginHorizontal: 12,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {row.count}×
                </Text>
                <Text style={{ fontFamily: 'UthmanicHafs', fontSize: 18, color: colors.text }}>
                  {row.arabic}
                </Text>
                {expandableRows && (
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 6 }}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                )}
              </Pressable>

              {isExpanded && (
                <OccurrenceList
                  locations={row.locations ?? []}
                  arabic={row.arabic}
                  language={language}
                  colors={colors}
                  maxHeight={maxExpandedRowHeight}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
