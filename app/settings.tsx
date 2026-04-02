import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useStorage } from '@/hooks/use-storage';
import { useTheme, type Colors } from '@/lib/theme';
import { resetAllProgress } from '@/lib/word-status';
import type { ReaderLayout, ReaderMode, Language, PropagationMode, ThemeMode, SwipeAction } from '@/types/quran';

// --- Option data ---

const LAYOUTS: { key: ReaderLayout; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'wbw', icon: 'grid-outline', title: 'Word by Word', subtitle: 'Arabic with meanings for each word' },
  { key: 'sentence', icon: 'document-text-outline', title: 'Sentence', subtitle: 'Full ayah text with translation' },
  { key: 'mushaf', icon: 'book-outline', title: 'Mushaf', subtitle: 'Traditional Quran page layout' },
];

const LANGUAGES: { key: Language; title: string; subtitle: string }[] = [
  { key: 'en', title: 'English', subtitle: 'Sahih International translation' },
  { key: 'id', title: 'Indonesian', subtitle: 'King Fahad Indonesian translation' },
  { key: 'ur', title: 'Urdu', subtitle: 'Tafsir-e-Usmani translation' },
];

const PROPAGATIONS: { key: PropagationMode; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'lemma', icon: 'layers-outline', title: 'Lemma', subtitle: 'Words with the same base form share status' },
  { key: 'root', icon: 'git-branch-outline', title: 'Root', subtitle: 'Words from the same root share status' },
  { key: 'exact', icon: 'locate-outline', title: 'Exact', subtitle: 'Only the exact word is affected' },
];

const THEMES: { key: ThemeMode; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'system', icon: 'phone-portrait-outline', title: 'System', subtitle: 'Follow your device setting' },
  { key: 'light', icon: 'sunny-outline', title: 'Light', subtitle: 'Always use light theme' },
  { key: 'dark', icon: 'moon-outline', title: 'Dark', subtitle: 'Always use dark theme' },
];

const SWIPE_ACTIONS: { key: SwipeAction; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { key: 'none', icon: 'hand-right-outline', title: 'Do Nothing', subtitle: 'Swiping only turns the page' },
  { key: 'known', icon: 'checkmark-done-outline', title: 'Mark as Known', subtitle: 'New words on the page become Known' },
  { key: 'learning', icon: 'school-outline', title: 'Mark as Learning', subtitle: 'New words on the page become Learning' },
];

const MODE_LABELS = ['Reading', 'Learning'];

// --- Components ---

function SectionHeader({ label, colors }: { label: string; colors: Colors }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textFaint, letterSpacing: 0.5, marginBottom: 12, marginTop: 28, paddingHorizontal: 20 }}>
      {label}
    </Text>
  );
}

function RadioCard({
  selected,
  onPress,
  icon,
  title,
  subtitle,
  colors,
}: {
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: selected ? colors.bgSecondary : colors.bg,
      }}
    >
      {icon && (
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? colors.text : colors.borderInactive,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text }} />}
      </View>
    </Pressable>
  );
}

// --- Main screen ---

export default function SettingsScreen() {
  const [layout, setLayout] = useStorage<ReaderLayout>('readerLayout', 'wbw');
  const [mode, setMode] = useStorage<ReaderMode>('readerMode', 'reading');
  const [language, setLanguage] = useStorage<Language>('language', 'en');
  const [propagation, setPropagation] = useStorage<PropagationMode>('propagation', 'lemma');
  const [swipeAction, setSwipeAction] = useStorage<SwipeAction>('swipeAction', 'none');
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();

  const confirmReset = () => {
    Alert.alert(
      'Reset Progress',
      'This will mark all words as "New" and erase your learning progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetAllProgress(),
        },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Appearance */}
      <SectionHeader label="APPEARANCE" colors={colors} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {THEMES.map((item) => (
          <RadioCard
            key={item.key}
            selected={themeMode === item.key}
            onPress={() => setThemeMode(item.key)}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            colors={colors}
          />
        ))}
      </View>

      {/* Reading Preferences */}
      <SectionHeader label="DEFAULT LAYOUT" colors={colors} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {LAYOUTS.map((item) => (
          <RadioCard
            key={item.key}
            selected={layout === item.key}
            onPress={() => setLayout(item.key)}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            colors={colors}
          />
        ))}
      </View>

      <SectionHeader label="DEFAULT MODE" colors={colors} />
      <View style={{ paddingHorizontal: 20 }}>
        <SegmentedControl
          values={MODE_LABELS}
          selectedIndex={mode === 'reading' ? 0 : 1}
          onChange={({ nativeEvent }) => {
            setMode(nativeEvent.selectedSegmentIndex === 0 ? 'reading' : 'learning');
          }}
          style={{ height: 36 }}
        />
      </View>

      <SectionHeader label="TRANSLATION LANGUAGE" colors={colors} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {LANGUAGES.map((item) => (
          <RadioCard
            key={item.key}
            selected={language === item.key}
            onPress={() => setLanguage(item.key)}
            title={item.title}
            subtitle={item.subtitle}
            colors={colors}
          />
        ))}
      </View>

      {/* Learning */}
      <SectionHeader label="WORD PROPAGATION" colors={colors} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {PROPAGATIONS.map((item) => (
          <RadioCard
            key={item.key}
            selected={propagation === item.key}
            onPress={() => setPropagation(item.key)}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            colors={colors}
          />
        ))}
      </View>

      {/* Swipe Action */}
      <SectionHeader label="ON PAGE SWIPE" colors={colors} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {SWIPE_ACTIONS.map((item) => (
          <RadioCard
            key={item.key}
            selected={swipeAction === item.key}
            onPress={() => setSwipeAction(item.key)}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            colors={colors}
          />
        ))}
      </View>

      {/* Data */}
      <SectionHeader label="DATA" colors={colors} />
      <View style={{ paddingHorizontal: 20 }}>
        <Pressable
          onPress={confirmReset}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            borderRadius: 12,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.destructiveBorder,
            backgroundColor: pressed ? colors.destructiveBg : colors.bg,
          })}
        >
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.destructiveBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.destructive }}>Reset Progress</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Mark all words as New</Text>
          </View>
        </Pressable>
      </View>

      {/* About */}
      <SectionHeader label="ABOUT" colors={colors} />
      <View style={{ paddingHorizontal: 20, alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Fahimna</Text>
        <Text style={{ fontSize: 12, color: colors.textFaint }}>Version 1.0.0</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
          Learn to understand the Quran, word by word.
        </Text>
      </View>
    </ScrollView>
  );
}
