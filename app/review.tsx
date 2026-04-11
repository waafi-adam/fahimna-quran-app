import { View } from 'react-native';
import { Stack } from 'expo-router';
import ReviewDashboard from '@/components/review-dashboard';
import { useTheme } from '@/lib/theme';

export default function ReviewScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Review' }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ReviewDashboard />
      </View>
    </>
  );
}
