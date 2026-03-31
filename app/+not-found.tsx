import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Page Not Found</Text>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={{ color: '#2563eb', fontSize: 16 }}>Go Home</Text>
      </Pressable>
    </View>
  );
}
