import { View, Text } from 'react-native';

type Props = { surah: number };

export default function SurahBanner({ surah }: Props) {
  const fontKey = `surah${String(surah).padStart(3, '0')}`;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text
        style={{
          fontFamily: 'SurahName',
          fontSize: 40,
          color: '#374151',
          textAlign: 'center',
        }}
      >
        {fontKey}
      </Text>
    </View>
  );
}
