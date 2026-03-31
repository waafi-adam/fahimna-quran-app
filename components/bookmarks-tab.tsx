import { View, Text, ScrollView } from 'react-native';

export default function BookmarksTab() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
    >
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🔖</Text>
      <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
        Bookmarks
      </Text>
      <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
        Coming soon — bookmark ayahs and pages for quick access.
      </Text>
    </ScrollView>
  );
}
