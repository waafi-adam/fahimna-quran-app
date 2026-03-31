import { type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
};

export default function TabPager({ selectedIndex, children }: Props) {
  return (
    <View style={{ flex: 1 }}>
      {children[selectedIndex]}
    </View>
  );
}
