import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    UthmanicHafs: require('@/assets/fonts/UthmanicHafs_V22.ttf'),
    SurahName: require('@/assets/fonts/surah-name-v2.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Fahimna' }} />
        <Stack.Screen
          name="page/[number]"
          options={{
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="ayah/[surah]/[ayah]"
          options={{ title: 'Ayah', presentation: 'modal' }}
        />
        <Stack.Screen
          name="word-sheet"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.45, 0.75],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ayah-sheet"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.35, 0.65],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="layout-sheet"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.45],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
