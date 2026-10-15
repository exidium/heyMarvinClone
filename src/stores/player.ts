import { create } from "zustand";

/** Shared playback state between the media player and the transcript. */
type PlayerState = {
  currentMs: number;
  playing: boolean;
  seekRequest: { ms: number; nonce: number } | null;
  setCurrent: (ms: number) => void;
  setPlaying: (p: boolean) => void;
  seek: (ms: number) => void;
};

export const usePlayer = create<PlayerState>((set) => ({
  currentMs: 0,
  playing: false,
  seekRequest: null,
  setCurrent: (ms) => set({ currentMs: ms }),
  setPlaying: (playing) => set({ playing }),
  seek: (ms) => set((s) => ({ seekRequest: { ms, nonce: (s.seekRequest?.nonce ?? 0) + 1 } })),
}));
