import { View, Text } from 'react-native';
import { useTheme } from '@/lib/theme';

type Props = { surah: number };

export default function SurahBanner({ surah }: Props) {
  const fontKey = `surah${String(surah).padStart(3, '0')}`;
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text
        style={{
          fontFamily: 'SurahName',
          fontSize: 40,
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {fontKey}
      </Text>
    </View>
  );
}
