import { View, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Profile</Text>
      <Text style={{ fontSize: 14, color: '#666' }}>
        Dashboard + Settings tabs will go here
      </Text>
    </View>
  );
}
