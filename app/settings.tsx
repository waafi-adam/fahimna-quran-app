import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#111827' }}>Settings</Text>
      <Text style={{ fontSize: 14, color: '#6B7280' }}>Coming soon</Text>
    </View>
  );
}
