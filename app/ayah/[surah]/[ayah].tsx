import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AyahScreen() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
        Ayah {surah}:{ayah}
      </Text>
      <Text style={{ fontSize: 14, color: '#666' }}>
        Single Ayah View — WBW + Translation + Tafsir
      </Text>
    </View>
  );
}
