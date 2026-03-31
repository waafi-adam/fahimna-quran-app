import { useSyncExternalStore } from 'react';
import { subscribeAudio, getAudioState, type AudioState } from '@/lib/audio-player';

export function useAudioPlayer(): AudioState {
  return useSyncExternalStore(subscribeAudio, getAudioState);
}
