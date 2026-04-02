import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { playAyah, playFrom, stop } from '@/lib/audio-player';
import { useTheme } from '@/lib/theme';

type Props = {
  surah: number;
  ayah: number;
  reciter: string;
};

export default function AyahPlayButtons({ surah, ayah, reciter }: Props) {
  const audio = useAudioPlayer();
  const { colors } = useTheme();
  const isPlaying = audio.surah === surah && audio.ayah === ayah && audio.status !== 'idle';

  if (isPlaying) {
    return (
      <Pressable onPress={stop} hitSlop={8}>
        <Ionicons name="stop-circle" size={20} color={colors.destructive} />
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Pressable onPress={() => playAyah(reciter, surah, ayah)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Ionicons name="play-circle-outline" size={18} color={colors.textMuted} />
        <Text style={{ fontSize: 11, color: colors.textMuted }}>Play</Text>
      </Pressable>
      <Pressable onPress={() => playFrom(reciter, surah, ayah)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Ionicons name="play-forward-outline" size={18} color={colors.textMuted} />
        <Text style={{ fontSize: 11, color: colors.textMuted }}>Play from here</Text>
      </Pressable>
    </View>
  );
}
