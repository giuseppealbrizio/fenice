import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useCinematicStore,
  CINEMATIC_PRESETS,
  type CameraKeyframe,
} from '../stores/cinematic.store';

/** Smooth interpolation between two keyframes at normalized t (0-1). */
function lerpKeyframe(
  a: CameraKeyframe,
  b: CameraKeyframe,
  t: number
): { position: THREE.Vector3; target: THREE.Vector3 } {
  // Smooth-step easing for cinematic feel
  const s = t * t * (3 - 2 * t);
  return {
    position: new THREE.Vector3(...a.position).lerp(new THREE.Vector3(...b.position), s),
    target: new THREE.Vector3(...a.target).lerp(new THREE.Vector3(...b.target), s),
  };
}

/**
 * Must be placed inside Canvas. Drives camera along cinematic preset paths.
 * When active, disables OrbitControls and takes full control of the camera.
 */
export function CinematicCamera(): null {
  const { camera, controls } = useThree();
  const savedState = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const wasActive = useRef(false);

  useFrame((_, delta) => {
    const { active, playing, presetName, progress, speed } = useCinematicStore.getState();

    // Restore camera when cinematic stops
    if (!active && wasActive.current) {
      wasActive.current = false;
      if (controls && 'enabled' in controls) {
        (controls as unknown as { enabled: boolean }).enabled = true;
      }
      if (savedState.current && controls && 'target' in controls) {
        camera.position.copy(savedState.current.position);
        (controls as unknown as { target: THREE.Vector3 }).target.copy(savedState.current.target);
      }
      savedState.current = null;
      return;
    }

    if (!active || !playing || !presetName) return;

    const preset = CINEMATIC_PRESETS.find((p) => p.name === presetName);
    if (!preset || preset.keyframes.length < 2) return;

    // Save camera state on first frame
    if (!wasActive.current) {
      wasActive.current = true;
      if (controls && 'target' in controls) {
        savedState.current = {
          position: camera.position.clone(),
          target: (controls as unknown as { target: THREE.Vector3 }).target.clone(),
        };
        (controls as unknown as { enabled: boolean }).enabled = false;
      }
    }

    // Calculate total duration (excluding first keyframe which is instant)
    const keyframes = preset.keyframes;
    let totalDuration = 0;
    for (let i = 1; i < keyframes.length; i++) {
      totalDuration += keyframes[i]!.duration;
    }

    // Advance progress
    const newProgress = progress + (delta * speed) / totalDuration;

    if (newProgress >= 1) {
      if (preset.loop) {
        useCinematicStore.getState().setProgress(0);
      } else {
        useCinematicStore.getState().stop();
      }
      return;
    }

    useCinematicStore.getState().setProgress(newProgress);

    // Find which segment we're in
    const absoluteTime = newProgress * totalDuration;
    let elapsed = 0;
    let segIdx = 0;

    for (let i = 1; i < keyframes.length; i++) {
      const segDuration = keyframes[i]!.duration;
      if (elapsed + segDuration > absoluteTime) {
        segIdx = i - 1;
        break;
      }
      elapsed += segDuration;
      segIdx = i - 1;
    }

    const fromKf = keyframes[segIdx]!;
    const toKf = keyframes[Math.min(segIdx + 1, keyframes.length - 1)]!;
    const segDuration = toKf.duration || 1;
    const segT = Math.min(1, (absoluteTime - elapsed) / segDuration);

    const { position, target } = lerpKeyframe(fromKf, toKf, segT);

    camera.position.copy(position);
    camera.lookAt(target);

    // Also update OrbitControls target so handoff is smooth
    if (controls && 'target' in controls) {
      (controls as unknown as { target: THREE.Vector3; update: () => void }).target.copy(target);
    }
  });

  return null;
}
