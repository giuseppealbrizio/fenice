import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PULSE_WAVE_CONFIG } from '../../utils/atmosphere';

// Shared state for pulse wave — buildings read this to apply boost
// Module-level variable (not Zustand) for per-frame performance
export let pulseWaveRadius = -1;

export function PulseWave(): null {
  const lastPulseRef = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const elapsed = t - lastPulseRef.current;

    if (elapsed > PULSE_WAVE_CONFIG.intervalMs / 1000) {
      lastPulseRef.current = t;
    }

    const pulseAge = t - lastPulseRef.current;
    if (pulseAge < PULSE_WAVE_CONFIG.durationSec) {
      pulseWaveRadius = (pulseAge / PULSE_WAVE_CONFIG.durationSec) * PULSE_WAVE_CONFIG.maxRadius;
    } else {
      pulseWaveRadius = -1;
    }
  });

  return null;
}
