import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getAudio, getChapter } from '@/lib/quran-data';
import type { AudioAyah } from '@/types/quran';

export type AudioState = {
  status: 'idle' | 'loading' | 'playing';
  surah: number;
  ayah: number;
  continuous: boolean;
  activeWordPos: number; // word.w of currently spoken word, 0 if none
};

const IDLE: AudioState = { status: 'idle', surah: 0, ayah: 0, continuous: false, activeWordPos: 0 };

let state: AudioState = { ...IDLE };
let player: AudioPlayer | null = null;
let statusSub: { remove(): void } | null = null;
let currentSegments: AudioAyah['seg'] = [];
let currentReciter = '';
let currentDuration = 0;
let audioModeSet = false;

// --- Listener pattern (mirrors storage.ts) ---

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((fn) => fn()); }

export function subscribeAudio(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getAudioState(): AudioState {
  return state;
}

// --- Internal helpers ---

async function ensureAudioMode() {
  if (audioModeSet) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  audioModeSet = true;
}

function onStatusUpdate(status: { currentTime: number; duration: number; playing: boolean }) {
  // Word-level highlighting (currentTime is in seconds, segments are in milliseconds)
  if (currentSegments.length > 0) {
    const posMs = status.currentTime * 1000;
    let wordPos = 0;
    for (const seg of currentSegments) {
      if (posMs >= seg[2] && posMs < seg[3]) {
        wordPos = seg[1];
        break;
      }
      // If past this segment's end, use it as fallback (handles gaps between segments)
      if (posMs >= seg[2]) {
        wordPos = seg[1];
      }
    }
    if (wordPos !== state.activeWordPos) {
      state = { ...state, activeWordPos: wordPos };
      notify();
    }
  }

  // Track finished — detect when currentTime reaches duration
  currentDuration = status.duration;
  if (status.duration > 0 && status.currentTime >= status.duration && !status.playing) {
    if (!state.continuous) {
      stopInternal();
      notify();
    } else {
      playNextAyah();
    }
  }
}

async function startPlayback(reciter: string, surah: number, ayah: number, continuous: boolean) {
  await ensureAudioMode();

  // Clean up previous player
  cleanup();

  currentReciter = reciter;
  currentDuration = 0;

  // Find audio data for this ayah
  let audioData: AudioAyah[];
  try {
    audioData = getAudio(reciter, surah);
  } catch {
    stopInternal();
    notify();
    return;
  }

  // Audio data uses global sequential ayah numbering, not per-surah.
  // Use array index: index 0 = ayah 1 of this surah.
  const audioAyah = audioData[ayah - 1];
  if (!audioAyah) {
    stopInternal();
    notify();
    return;
  }

  currentSegments = audioAyah.seg;
  state = { status: 'loading', surah, ayah, continuous, activeWordPos: 0 };
  notify();

  try {
    player = createAudioPlayer({ uri: audioAyah.url });
    statusSub = player.addListener('playbackStatusUpdate', onStatusUpdate);
    player.play();
    state = { ...state, status: 'playing' };
    notify();
  } catch {
    stopInternal();
    notify();
  }
}

function playNextAyah() {
  const { surah, ayah } = state;
  const chapter = getChapter(surah);
  if (!chapter) { stopInternal(); notify(); return; }

  if (ayah < chapter.versesCount) {
    startPlayback(currentReciter, surah, ayah + 1, true);
  } else if (surah < 114) {
    startPlayback(currentReciter, surah + 1, 1, true);
  } else {
    stopInternal();
    notify();
  }
}

function cleanup() {
  if (statusSub) { statusSub.remove(); statusSub = null; }
  if (player) { player.release(); player = null; }
}

function stopInternal() {
  cleanup();
  state = { ...IDLE };
  currentSegments = [];
  currentDuration = 0;
}

// --- Public API ---

export async function playAyah(reciter: string, surah: number, ayah: number) {
  await startPlayback(reciter, surah, ayah, false);
}

export async function playFrom(reciter: string, surah: number, ayah: number) {
  await startPlayback(reciter, surah, ayah, true);
}

export function stop() {
  stopInternal();
  notify();
}
