'use no memo';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import type { PageData, ReaderMode, Language } from '@/types/quran';
import { getTranslation, isVerseMarker, getMorphology } from '@/lib/quran-data';
import { getPageSections } from '@/lib/page-helpers';
import { getWordStatus } from '@/lib/word-status';
import { useWordStatusVersion } from '@/hooks/use-word-status';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import WordCard from '@/components/word-card';
import AyahPlayButtons from '@/components/ayah-play-buttons';
import AyahBookmarkButton from '@/components/ayah-bookmark-button';
import SurahBanner from '@/components/surah-banner';
import BismillahBanner from '@/components/bismillah-banner';

/** Translation row – always visible in reading mode, tap-to-reveal in learning mode */
function AyahTranslation({ text, mode }: { text: string; mode: ReaderMode }) {
  const [revealed, setRevealed] = useState(mode === 'reading');
  const { colors } = useTheme();

  if (mode === 'reading') {
    return (
      <Text style={{ fontSize: 13, color: colors.textTertiary, lineHeight: 20, marginTop: 6, paddingHorizontal: 4 }}>
        {text}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => setRevealed((r) => !r)} style={{ marginTop: 6, paddingHorizontal: 4 }}>
      {revealed ? (
        <Text style={{ fontSize: 13, color: colors.textTertiary, lineHeight: 20 }}>{text}</Text>
      ) : (
        <Text style={{ fontSize: 12, color: colors.textFaint, fontStyle: 'italic' }}>Tap to reveal translation</Text>
      )}
    </Pressable>
  );
}

type Props = {
  page: PageData;
  mode: ReaderMode;
  language: Language;
  bottomPadding: number;
  pageNumber: number;
  highlightAyah?: { surah: number; ayah: number } | null;
};

export default function WbwPage({ page, mode, language, bottomPadding, pageNumber, highlightAyah }: Props) {
  useWordStatusVersion();
  const router = useRouter();
  const { colors } = useTheme();
  const audio = useAudioPlayer();
  const [reciter] = useStorage('reciter', 'husary-murattal');
  const [showGrammarLabels] = useStorage<boolean>('showGrammarLabels', false);
  const sections = getPageSections(page);
  const scrollRef = useRef<ScrollView>(null);
  const ayahLayouts = useRef<Record<string, number>>({});
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const highlightDone = useRef(false);

  const onAyahLayout = useCallback((key: string, y: number) => {
    ayahLayouts.current[key] = y;
  }, []);

  useEffect(() => {
    if (!highlightAyah || highlightDone.current) return;
    const key = `${highlightAyah.surah}:${highlightAyah.ayah}`;
    const tryScroll = () => {
      const y = ayahLayouts.current[key];
      if (y != null) {
        scrollRef.current?.scrollTo({ y, animated: true });
        Animated.sequence([
          Animated.timing(highlightOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(highlightOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(() => { highlightDone.current = true; });
      } else {
        setTimeout(tryScroll, 100);
      }
    };
    requestAnimationFrame(tryScroll);
  }, [highlightAyah]);

  // Pre-compute POS labels when grammar labels setting is on
  const posLabels = useMemo(() => {
    if (!showGrammarLabels) return null;
    const labels = new Map<number, string>();
    for (const section of sections) {
      if (section.type !== 'ayah') continue;
      for (const word of section.words) {
        if (isVerseMarker(word)) continue;
        const m = getMorphology(word.s, word.v, word.w);
        if (m) labels.set(word.id, m.posAr);
      }
    }
    return labels;
  }, [showGrammarLabels, sections]);

  // Pre-load translations for surahs on this page
  const translationCache = new Map<number, Map<number, string>>();
  for (const section of sections) {
    if (section.type === 'ayah' && !translationCache.has(section.surah)) {
      const trans = getTranslation(language, section.surah);
      const map = new Map<number, string>();
      for (const t of trans) map.set(t.ayah, t.text);
      translationCache.set(section.surah, map);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPadding + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section, i) => {
        if (section.type === 'surah_name') {
          return <SurahBanner key={`s-${section.surah}`} surah={section.surah} />;
        }
        if (section.type === 'bismillah') {
          return <BismillahBanner key={`b-${i}`} />;
        }

        const transText = translationCache.get(section.surah)?.get(section.verse) ?? '';
        const isPlayingAyah = audio.status === 'playing' && audio.surah === section.surah && audio.ayah === section.verse;

        const ayahKey = `${section.surah}:${section.verse}`;
        const isHighlightTarget = !highlightDone.current && highlightAyah && highlightAyah.surah === section.surah && highlightAyah.ayah === section.verse;

        return (
          <View
            key={ayahKey}
            onLayout={(e) => onAyahLayout(ayahKey, e.nativeEvent.layout.y)}
            style={isPlayingAyah ? { backgroundColor: colors.audioAyahBg, borderRadius: 8, padding: 4, margin: -4 } : undefined}
          >
            {isHighlightTarget && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
                  backgroundColor: colors.accentBg,
                  opacity: highlightOpacity,
                  borderRadius: 8,
                }}
              />
            )}
            {/* Bookmark top-left, ayah menu top-right */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AyahBookmarkButton surah={section.surah} ayah={section.verse} page={pageNumber} />
              <Pressable
                onPress={() => router.push(`/ayah-sheet?surah=${section.surah}&ayah=${section.verse}`)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '700' }}>···</Text>
              </Pressable>
            </View>

            {/* Word cards – RTL flow */}
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' }}>
              {section.words.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  status={getWordStatus(word)}
                  mode={mode}
                  language={language}
                  isActiveWord={isPlayingAyah && audio.activeWordPos === word.w}
                  posLabel={posLabels?.get(word.id)}
                  onPress={
                    isVerseMarker(word)
                      ? () => router.push(`/ayah-sheet?surah=${word.s}&ayah=${word.v}`)
                      : () => router.push(`/word-sheet?page=${pageNumber}&surah=${word.s}&verse=${word.v}&word=${word.w}&mode=${mode}`)
                  }
                />
              ))}
            </View>

            {/* Play controls – right aligned */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, paddingHorizontal: 4 }}>
              <AyahPlayButtons surah={section.surah} ayah={section.verse} reciter={reciter} />
            </View>

            {/* Ayah translation */}
            {transText.length > 0 && (
              <AyahTranslation text={transText} mode={mode} />
            )}

            {/* Subtle divider between ayahs */}
            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 8 }} />
          </View>
        );
      })}
    </ScrollView>
  );
}
