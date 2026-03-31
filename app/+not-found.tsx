import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: colors.text }}>Page Not Found</Text>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={{ color: colors.link, fontSize: 16 }}>Go Home</Text>
      </Pressable>
    </View>
  );
}
