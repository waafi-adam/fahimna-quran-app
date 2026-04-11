import { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Colors } from '@/lib/theme';
import FormsTable, { type FormRow, getFormMeaning } from '@/components/forms-table';
import { getLemmaById, getRootById, getLemmaForms, getRootForms, getExactCount } from '@/lib/quran-data';
import { getFlashCard } from '@/lib/flashcard-data';
import type { Language } from '@/types/quran';

export type UsageTab = 'exact' | 'lemma' | 'root';

type UsageTabsProps = {
  /** Exact arabic form to feature on the Exact tab */
  arabic: string;
  /** WBW meaning to display on the Exact tab row */
  exactMeaning: string;
  lemmaId?: number;
  rootId?: number;
  initialTab?: UsageTab;
  /** Lemma-mode flashcard hides this tab — no meaningful single exact form */
  hideExactTab?: boolean;
  language: Language;
  colors: Colors;
  /** Accent-stripe highlight set for rows whose arabic is in here (learning forms) */
  learningForms?: Set<string>;
  /**
   * When the user arrived by tapping a specific form (e.g., from WordSheet),
   * auto-expand that row and apply a temporary highlight on whichever tab contains it.
   */
  focusArabic?: string;
};

export default function UsageTabs({
  arabic,
  exactMeaning,
  lemmaId,
  rootId,
  initialTab,
  hideExactTab = false,
  language,
  colors,
  learningForms,
  focusArabic,
}: UsageTabsProps) {
  // Build rows for each tab. Locations are sampled from the exact card index.
  const exactRows: FormRow[] = useMemo(() => {
    if (hideExactTab) return [];
    const exactCard = getFlashCard(arabic);
    return [
      {
        arabic,
        meaning: exactMeaning,
        count: getExactCount(arabic),
        locations: exactCard?.locations ?? [],
      },
    ];
  }, [arabic, exactMeaning, hideExactTab]);

  const lemmaRows: FormRow[] = useMemo(() => {
    if (lemmaId == null) return [];
    const forms = getLemmaForms(lemmaId);
    return forms.map((f) => {
      const formArabic = f[0];
      const card = getFlashCard(formArabic);
      return {
        arabic: formArabic,
        meaning: getFormMeaning(f, language),
        count: f[4],
        isLearning: learningForms?.has(formArabic),
        locations: card?.locations ?? [],
      };
    });
  }, [lemmaId, language, learningForms]);

  const rootRows: FormRow[] = useMemo(() => {
    if (rootId == null) return [];
    const forms = getRootForms(rootId);
    return forms.map((f) => {
      const formArabic = f[0];
      const card = getFlashCard(formArabic);
      return {
        arabic: formArabic,
        meaning: getFormMeaning(f, language),
        count: f[4],
        isLearning: learningForms?.has(formArabic),
        locations: card?.locations ?? [],
      };
    });
  }, [rootId, language, learningForms]);

  const availableTabs = useMemo(() => {
    const tabs: UsageTab[] = [];
    if (!hideExactTab && exactRows.length > 0) tabs.push('exact');
    if (lemmaRows.length > 0) tabs.push('lemma');
    if (rootRows.length > 0) tabs.push('root');
    return tabs;
  }, [hideExactTab, exactRows.length, lemmaRows.length, rootRows.length]);

  const [tabIndex, setTabIndex] = useState(() => {
    if (initialTab) {
      const idx = availableTabs.indexOf(initialTab);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  // Swipe animation: slide the tab content horizontally on change
  const tabAnim = useRef(new Animated.Value(0)).current;
  const prevTabIndex = useRef(tabIndex);

  const animateToTab = useCallback((newIndex: number) => {
    if (newIndex === prevTabIndex.current) return;
    const direction = newIndex > prevTabIndex.current ? 1 : -1;
    prevTabIndex.current = newIndex;
    tabAnim.setValue(direction * 40);
    setTabIndex(newIndex);
    Animated.timing(tabAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tabAnim]);

  if (availableTabs.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          No usages available.
        </Text>
      </View>
    );
  }

  const tabLabels: Record<UsageTab, string> = {
    exact: 'Exact',
    lemma: 'Lemma',
    root: 'Root',
  };

  const lemma = lemmaId != null ? getLemmaById(lemmaId) : undefined;
  const root = rootId != null ? getRootById(rootId) : undefined;

  const headerForTab = (tab: UsageTab): { arabic?: string; total?: number } => {
    switch (tab) {
      case 'exact':
        return { arabic, total: getExactCount(arabic) };
      case 'lemma':
        return { arabic: lemma?.arabic, total: lemma?.count };
      case 'root':
        return { arabic: root?.arabic, total: root?.count };
    }
  };

  const rowsForTab = (tab: UsageTab): FormRow[] => {
    switch (tab) {
      case 'exact':
        return exactRows;
      case 'lemma':
        return lemmaRows;
      case 'root':
        return rootRows;
    }
  };

  const activeTab = availableTabs[tabIndex];
  const activeRows = rowsForTab(activeTab);
  const header = headerForTab(activeTab);

  // Default expanded + highlight target per tab:
  // - Exact tab: auto-expand the single row (its arabic)
  // - Lemma/Root tabs: if a focusArabic was provided and it matches a row here,
  //   auto-expand + briefly highlight it
  const activeFocus = activeTab !== 'exact' && focusArabic && activeRows.some((r) => r.arabic === focusArabic)
    ? focusArabic
    : undefined;
  const defaultExpanded = activeTab === 'exact' ? arabic : activeFocus;

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      if (e.velocityX < -300 && tabIndex < availableTabs.length - 1) {
        animateToTab(tabIndex + 1);
      } else if (e.velocityX > 300 && tabIndex > 0) {
        animateToTab(tabIndex - 1);
      }
    })
    .runOnJS(true);

  return (
    <View style={{ flex: 1 }}>
      {availableTabs.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {availableTabs.map((tab, i) => {
            const isActive = i === tabIndex;
            return (
              <Pressable
                key={tab}
                onPress={() => animateToTab(i)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? colors.text : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? colors.text : colors.textMuted,
                  }}
                >
                  {tabLabels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: tabAnim }] }}>
          <FormsTable
            key={activeTab}
            rows={activeRows}
            headerArabic={header.arabic}
            headerTotal={header.total}
            colors={colors}
            language={language}
            expandableRows
            defaultExpandedArabic={defaultExpanded}
            highlightArabic={activeFocus}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
