import { create } from 'zustand';

// ─── Keyframe definition ────────────────────────────────────────────────────

export interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
  duration: number; // seconds to reach this keyframe from the previous one
}

export interface CinematicPreset {
  name: string;
  label: string;
  loop: boolean;
  keyframes: CameraKeyframe[];
}

// ─── Presets ────────────────────────────────────────────────────────────────

export const CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    name: 'orbit',
    label: 'Grand Orbit',
    loop: true,
    keyframes: [
      { position: [60, 30, 0], target: [0, 0, 0], duration: 0 },
      { position: [0, 25, 60], target: [0, 0, 0], duration: 8 },
      { position: [-60, 35, 0], target: [0, 0, 0], duration: 8 },
      { position: [0, 20, -60], target: [0, 0, 0], duration: 8 },
      { position: [60, 30, 0], target: [0, 0, 0], duration: 8 },
    ],
  },
  {
    name: 'flythrough',
    label: 'Flythrough',
    loop: false,
    keyframes: [
      { position: [80, 50, 80], target: [0, 0, 0], duration: 0 },
      { position: [40, 20, 40], target: [0, 5, 0], duration: 6 },
      { position: [10, 8, 10], target: [0, 2, 0], duration: 5 },
      { position: [-5, 5, 0], target: [5, 0, 5], duration: 4 },
      { position: [-30, 15, -20], target: [0, 0, 0], duration: 5 },
      { position: [-60, 40, -40], target: [0, 5, 0], duration: 6 },
    ],
  },
  {
    name: 'topdown',
    label: 'Top-Down Sweep',
    loop: false,
    keyframes: [
      { position: [0, 80, 0.1], target: [0, 0, 0], duration: 0 },
      { position: [0, 80, 0.1], target: [30, 0, 0], duration: 5 },
      { position: [0, 80, 0.1], target: [0, 0, 30], duration: 5 },
      { position: [0, 80, 0.1], target: [-30, 0, 0], duration: 5 },
      { position: [0, 80, 0.1], target: [0, 0, 0], duration: 4 },
      { position: [0, 50, 30], target: [0, 0, 0], duration: 4 },
    ],
  },
  {
    name: 'dramatic',
    label: 'Dramatic Rise',
    loop: false,
    keyframes: [
      { position: [5, 2, 5], target: [0, 3, 0], duration: 0 },
      { position: [8, 5, 8], target: [0, 3, 0], duration: 3 },
      { position: [15, 12, 15], target: [0, 2, 0], duration: 4 },
      { position: [30, 25, 30], target: [0, 0, 0], duration: 5 },
      { position: [50, 40, 50], target: [0, 0, 0], duration: 6 },
      { position: [70, 50, 20], target: [0, 5, 0], duration: 5 },
    ],
  },
  {
    name: 'nebula-tour',
    label: 'Nebula Tour',
    loop: false,
    keyframes: [
      { position: [40, 25, 40], target: [0, 0, 0], duration: 0 },
      { position: [60, 15, 30], target: [80, 0, 50], duration: 6 },
      { position: [30, 10, 60], target: [50, -10, 80], duration: 6 },
      { position: [-20, 20, 50], target: [-70, 5, 60], duration: 6 },
      { position: [-40, 30, 0], target: [0, 0, 0], duration: 5 },
      { position: [40, 25, 40], target: [0, 0, 0], duration: 5 },
    ],
  },
];

// ─── Store ──────────────────────────────────────────────────────────────────

interface CinematicState {
  active: boolean;
  presetName: string | null;
  progress: number; // 0-1 normalized progress through all keyframes
  playing: boolean;
  speed: number; // playback speed multiplier

  play: (presetName: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (speed: number) => void;
  setProgress: (progress: number) => void;
}

export const useCinematicStore = create<CinematicState>((set) => ({
  active: false,
  presetName: null,
  progress: 0,
  playing: false,
  speed: 1,

  play: (presetName) =>
    set({
      active: true,
      presetName,
      progress: 0,
      playing: true,
    }),
  stop: () =>
    set({
      active: false,
      presetName: null,
      progress: 0,
      playing: false,
    }),
  pause: () => set({ playing: false }),
  resume: () => set({ playing: true }),
  setSpeed: (speed) => set({ speed }),
  setProgress: (progress) => set({ progress }),
}));
