import { View, Text } from 'react-native';

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

export default function BismillahBanner() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: 'UthmanicHafs',
          fontSize: 24,
          color: '#374151',
          textAlign: 'center',
        }}
      >
        {BISMILLAH}
      </Text>
    </View>
  );
}
