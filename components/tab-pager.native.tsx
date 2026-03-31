import { useRef, useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';

type Props = {
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
};

export default function TabPager({ selectedIndex, onIndexChange, children }: Props) {
  const pagerRef = useRef<PagerView>(null);
  const lastIndex = useRef(selectedIndex);

  // Sync pager when segmented control changes
  if (lastIndex.current !== selectedIndex) {
    lastIndex.current = selectedIndex;
    pagerRef.current?.setPage(selectedIndex);
  }

  const onPageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      lastIndex.current = e.nativeEvent.position;
      onIndexChange(e.nativeEvent.position);
    },
    [onIndexChange],
  );

  return (
    <PagerView
      ref={pagerRef}
      style={{ flex: 1 }}
      initialPage={selectedIndex}
      onPageSelected={onPageSelected}
    >
      {(children as ReactNode[]).map((child, i) => (
        <View key={i} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </PagerView>
  );
}
