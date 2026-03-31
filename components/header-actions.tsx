import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderActions() {
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      {/* Dashboard */}
      <Pressable
        onPress={() => router.push('/dashboard')}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: '#E0E7FF',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="stats-chart-outline" size={16} color="#4338CA" />
      </Pressable>

      {/* Settings */}
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: '#F3F4F6',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="settings-outline" size={16} color="#6B7280" />
      </Pressable>
    </View>
  );
}
