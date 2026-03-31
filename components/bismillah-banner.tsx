import { View, Text } from 'react-native';
import { useTheme } from '@/lib/theme';

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

export default function BismillahBanner() {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 24,
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {BISMILLAH}
      </Text>
    </View>
  );
}
