import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STAR_FIELD_CONFIG } from '../utils/atmosphere';
import {
  generateStarPositions,
  generateStarSizes,
  generateStarClasses,
} from '../utils/atmosphere-geometry';
import type { QualityLevel } from '../stores/view.store';

// Spectral class colors (visually weighted for appeal, not strict astrophysics)
const SPECTRAL_COLORS = [
  new THREE.Color('#9bb0ff'), // O — deep blue (rare, bright)
  new THREE.Color('#aabfff'), // B — blue-white
  new THREE.Color('#cce0ff'), // A — white-blue
  new THREE.Color('#f0f0ff'), // F — warm white
  new THREE.Color('#fff8e8'), // G — yellow (Sun-like)
  new THREE.Color('#ffd4a0'), // K — orange
  new THREE.Color('#ffb070'), // M — deep orange
] as const;

function getSpectralColor(): THREE.Color {
  const r = Math.random();
  if (r < 0.03) return SPECTRAL_COLORS[0]!; // O
  if (r < 0.08) return SPECTRAL_COLORS[1]!; // B
  if (r < 0.18) return SPECTRAL_COLORS[2]!; // A
  if (r < 0.33) return SPECTRAL_COLORS[3]!; // F
  if (r < 0.53) return SPECTRAL_COLORS[4]!; // G
  if (r < 0.75) return SPECTRAL_COLORS[5]!; // K
  return SPECTRAL_COLORS[6]!; // M
}

interface StarFieldProps {
  quality: QualityLevel;
}

export function StarField({ quality }: StarFieldProps): React.JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const count = quality === 'ultra' ? 12000 : quality === 'high' ? STAR_FIELD_CONFIG.count : 1500;
  const radius = quality === 'ultra' ? 250 : STAR_FIELD_CONFIG.radius;
  const maxSize = quality === 'ultra' ? 3.0 : STAR_FIELD_CONFIG.maxSize;

  const { positions, sizes, colors, starClasses } = useMemo(() => {
    const pos = generateStarPositions(count, radius);
    const sz = generateStarSizes(count, STAR_FIELD_CONFIG.minSize, maxSize);
    const cls = quality !== 'low' ? generateStarClasses(count) : null;

    const colorArr = new Float32Array(count * 3);
    if (quality === 'ultra') {
      // Spectral class colors for ultra
      for (let i = 0; i < count; i++) {
        const c = getSpectralColor();
        colorArr[i * 3] = c.r;
        colorArr[i * 3 + 1] = c.g;
        colorArr[i * 3 + 2] = c.b;
      }
    } else {
      const palette = STAR_FIELD_CONFIG.colors.map((hex) => new THREE.Color(hex));
      for (let i = 0; i < count; i++) {
        const c = palette[i % palette.length]!;
        colorArr[i * 3] = c.r;
        colorArr[i * 3 + 1] = c.g;
        colorArr[i * 3 + 2] = c.b;
      }
    }

    return { positions: pos, sizes: sz, colors: colorArr, starClasses: cls };
  }, [count, quality, radius, maxSize]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const sizeAttr = geo.getAttribute('size');
    if (!sizeAttr) return;
    const arr = sizeAttr.array as Float32Array;
    const t = clock.elapsedTime * STAR_FIELD_CONFIG.twinkleSpeed;

    if (quality !== 'low' && starClasses) {
      // Per-class twinkle: small=fast, medium=moderate, large=near-fixed
      for (let i = 0; i < arr.length; i++) {
        const classVal = starClasses[i]!;
        const speed = classVal === 0 ? 2.5 : classVal === 1 ? 0.6 : 0.15;
        const brightness = classVal === 0 ? 0.7 : classVal === 1 ? 0.85 : 1.0;
        arr[i] = sizes[i]! * (brightness + (1 - brightness) * Math.sin(t * speed + i * 1.37));
      }
    } else {
      // Low quality: uniform twinkle (original behavior)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = sizes[i]! * (0.7 + 0.3 * Math.sin(t + i * 1.37));
      }
    }
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
