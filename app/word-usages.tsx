import { View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useStorage } from '@/hooks/use-storage';
import { useTheme } from '@/lib/theme';
import UsageTabs, { type UsageTab } from '@/components/usage-tabs';
import { getFlashCard } from '@/lib/flashcard-data';
import type { Language } from '@/types/quran';

export default function WordUsagesScreen() {
  const { arabic, rootId, lemmaId, tab } = useLocalSearchParams<{
    arabic: string;
    rootId: string;
    lemmaId: string;
    surah: string;
    ayah: string;
    tab: string;
  }>();

  const { colors } = useTheme();
  const [language] = useStorage<Language>('language', 'en');

  const lemmaIdNum = lemmaId ? Number(lemmaId) : undefined;
  const rootIdNum = rootId ? Number(rootId) : undefined;
  const initialTab = (tab as UsageTab | undefined) && ['exact', 'lemma', 'root'].includes(tab!)
    ? (tab as UsageTab)
    : undefined;

  const exactMeaning = getFlashCard(arabic)?.meanings.join(' / ') ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: arabic,
          headerTitleStyle: { fontFamily: 'UthmanicHafs', fontSize: 22 },
        }}
      />

      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <UsageTabs
          arabic={arabic}
          exactMeaning={exactMeaning}
          lemmaId={lemmaIdNum}
          rootId={rootIdNum}
          initialTab={initialTab}
          focusArabic={arabic}
          language={language}
          colors={colors}
        />
      </View>
    </>
  );
}
