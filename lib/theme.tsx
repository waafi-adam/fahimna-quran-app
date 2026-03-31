import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useStorage } from '@/hooks/use-storage';
import type { ThemeMode } from '@/types/quran';

// --- Color tokens ---

export type Colors = typeof light;

const light = {
  // Backgrounds
  bg: '#fff',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F3F4F6',
  bgExpanded: '#FAFAFA',

  // Text
  text: '#111827',
  textSecondary: '#374151',
  textTertiary: '#4B5563',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderInactive: '#D1D5DB',
  separator: '#D1D5DB',

  // Accent — indigo (surah numbers, dashboard)
  accent: '#4338CA',
  accentBg: '#E0E7FF',

  // Bookmark — amber
  bookmark: '#D97706',
  bookmarkBg: '#FEF3C7',

  // Juz — amber
  juzBadge: '#92400E',
  juzBadgeBg: '#FEF3C7',

  // Status highlights
  statusNewBg: '#DBEAFE',
  statusNewBorder: '#93C5FD',
  statusLearningBg: '#FEF3C7',
  statusLearningBorder: '#FCD34D',
  statusKnownBg: '#D1FAE5',
  statusKnownBorder: '#6EE7B7',

  // Progress bar colors (same in both themes)
  progressNew: '#93C5FD',
  progressLearning: '#FCD34D',
  progressKnown: '#6EE7B7',
  progressBg: '#E5E7EB',

  // Destructive
  destructive: '#DC2626',
  destructiveBg: '#FEF2F2',
  destructiveBorder: '#FECACA',

  // Link
  link: '#2563EB',

  // Button
  buttonBg: '#111827',
  buttonText: '#fff',

  // Pressed state
  pressed: '#F3F4F6',

  // Navigation bar
  headerBg: '#fff',
  headerText: '#111827',
};

const dark: Colors = {
  // Backgrounds
  bg: '#0F0F0F',
  bgSecondary: '#1A1A1A',
  bgTertiary: '#262626',
  bgExpanded: '#1A1A1A',

  // Text
  text: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textTertiary: '#B0B7C3',
  textMuted: '#9CA3AF',
  textFaint: '#6B7280',

  // Borders
  border: '#333333',
  borderLight: '#262626',
  borderInactive: '#4B5563',
  separator: '#4B5563',

  // Accent — indigo
  accent: '#818CF8',
  accentBg: '#1E1B4B',

  // Bookmark — amber
  bookmark: '#FBBF24',
  bookmarkBg: '#422006',

  // Juz — amber
  juzBadge: '#FBBF24',
  juzBadgeBg: '#422006',

  // Status highlights
  statusNewBg: '#1E3A5F',
  statusNewBorder: '#3B82F6',
  statusLearningBg: '#422006',
  statusLearningBorder: '#D97706',
  statusKnownBg: '#064E3B',
  statusKnownBorder: '#10B981',

  // Progress bar colors
  progressNew: '#3B82F6',
  progressLearning: '#D97706',
  progressKnown: '#10B981',
  progressBg: '#333333',

  // Destructive
  destructive: '#EF4444',
  destructiveBg: '#2D1111',
  destructiveBorder: '#7F1D1D',

  // Link
  link: '#60A5FA',

  // Button
  buttonBg: '#F3F4F6',
  buttonText: '#111827',

  // Pressed state
  pressed: '#262626',

  // Navigation bar
  headerBg: '#0F0F0F',
  headerText: '#F3F4F6',
};

// --- Context ---

type ThemeContextValue = {
  colors: Colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  isDark: false,
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useStorage<ThemeMode>('themeMode', 'system');

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
