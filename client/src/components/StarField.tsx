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

interface StarFieldProps {
  quality: QualityLevel;
}

export function StarField({ quality }: StarFieldProps): React.JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);

  const count = quality === 'high' ? STAR_FIELD_CONFIG.count : 1500;

  const { positions, sizes, colors, starClasses } = useMemo(() => {
    const pos = generateStarPositions(count, STAR_FIELD_CONFIG.radius);
    const sz = generateStarSizes(count, STAR_FIELD_CONFIG.minSize, STAR_FIELD_CONFIG.maxSize);
    const cls = quality === 'high' ? generateStarClasses(count) : null;
    const colorArr = new Float32Array(count * 3);
    const palette = STAR_FIELD_CONFIG.colors.map((hex) => new THREE.Color(hex));
    for (let i = 0; i < count; i++) {
      const c = palette[i % palette.length]!;
      colorArr[i * 3] = c.r;
      colorArr[i * 3 + 1] = c.g;
      colorArr[i * 3 + 2] = c.b;
    }
    return { positions: pos, sizes: sz, colors: colorArr, starClasses: cls };
  }, [count, quality]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const sizeAttr = geo.getAttribute('size');
    if (!sizeAttr) return;
    const arr = sizeAttr.array as Float32Array;
    const t = clock.elapsedTime * STAR_FIELD_CONFIG.twinkleSpeed;

    if (quality === 'high' && starClasses) {
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
