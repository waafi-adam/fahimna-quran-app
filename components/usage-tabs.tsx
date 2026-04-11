import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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

  const [activeTab, setActiveTab] = useState<UsageTab>(() => {
    if (initialTab && availableTabs.includes(initialTab)) return initialTab;
    return availableTabs[0] ?? 'exact';
  });

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

  const activeRows = rowsForTab(activeTab);
  const header = headerForTab(activeTab);
  // Auto-expand the single row on the Exact tab so the ayahs show immediately
  const defaultExpanded = activeTab === 'exact' ? arabic : undefined;

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
          {availableTabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
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

      <FormsTable
        key={activeTab}
        rows={activeRows}
        headerArabic={header.arabic}
        headerTotal={header.total}
        colors={colors}
        language={language}
        expandableRows
        defaultExpandedArabic={defaultExpanded}
      />
    </View>
  );
}
