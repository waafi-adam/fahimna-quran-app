import { useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { SymbolView } from 'expo-symbols';
import TabPager from '@/components/tab-pager';
import SurahList from '@/components/surah-list';
import JuzListTab from '@/components/juz-list';
import BookmarksTab from '@/components/bookmarks-tab';

const TABS = ['Surahs', 'Juz', 'Bookmarks'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [tabIndex, setTabIndex] = useState(0);

  const onSegmentChange = useCallback(
    ({ nativeEvent }: { nativeEvent: { selectedSegmentIndex: number } }) => {
      setTabIndex(nativeEvent.selectedSegmentIndex);
    },
    [],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fahimna',
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
              <SymbolView
                name="person.circle"
                size={26}
                tintColor="#007AFF"
                resizeMode="scaleAspectFit"
              />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' }}>
          <SegmentedControl
            values={[...TABS]}
            selectedIndex={tabIndex}
            onChange={onSegmentChange}
          />
        </View>
        <TabPager selectedIndex={tabIndex} onIndexChange={setTabIndex}>
          {[
            <SurahList key="surahs" />,
            <JuzListTab key="juz" />,
            <BookmarksTab key="bookmarks" />,
          ]}
        </TabPager>
      </View>
    </>
  );
}
