import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DUST_CONFIG } from '../utils/atmosphere';
import { generateDustPositions } from '../utils/atmosphere-geometry';
import type { QualityLevel } from '../stores/view.store';
import { useCosmosSettingsStore } from '../stores/cosmos-settings.store';

interface DustParticlesProps {
  quality: QualityLevel;
}

const TRAIL_COUNT = 50;
const ULTRA_TRAIL_COUNT = 150;

export function DustParticles({ quality }: DustParticlesProps): React.JSX.Element {
  const pointsRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const dustOpacity = useCosmosSettingsStore((s) => s.dustOpacity);

  const count = quality === 'ultra' ? 2500 : quality === 'high' ? DUST_CONFIG.count : 300;

  const { basePositions, dustSizes, twinkleOffsets } = useMemo(() => {
    const bp = generateDustPositions(count, DUST_CONFIG.spread);
    // Individual size variation (1-3px range mapped to minSize-maxSize)
    const ds = new Float32Array(count);
    const to = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      ds[i] = DUST_CONFIG.minSize + Math.random() * (DUST_CONFIG.maxSize - DUST_CONFIG.minSize);
      to[i] = Math.random() * Math.PI * 2;
    }
    return { basePositions: bp, dustSizes: ds, twinkleOffsets: to };
  }, [count]);

  // Trail particles (high+ quality)
  const trailCount = quality === 'ultra' ? ULTRA_TRAIL_COUNT : TRAIL_COUNT;
  const trailData = useMemo(() => {
    if (quality === 'low') return null;
    const positions = generateDustPositions(trailCount, DUST_CONFIG.spread * 0.8);
    const sizes = new Float32Array(trailCount);
    const offsets = new Float32Array(trailCount);
    for (let i = 0; i < trailCount; i++) {
      sizes[i] = DUST_CONFIG.minSize * 0.5 + Math.random() * DUST_CONFIG.minSize;
      offsets[i] = Math.random() * Math.PI * 2;
    }
    return { positions, sizes, offsets };
  }, [quality, trailCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position');
    const sizeAttr = geo.getAttribute('size');
    if (!posAttr) return;
    const posArr = posAttr.array as Float32Array;
    const t = clock.elapsedTime * DUST_CONFIG.driftSpeed;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArr[i3] = basePositions[i3]! + Math.sin(t + i * 0.73) * 0.3;
      posArr[i3 + 1] = basePositions[i3 + 1]! + Math.cos(t + i * 1.17) * 0.2;
      posArr[i3 + 2] = basePositions[i3 + 2]! + Math.sin(t + i * 0.91) * 0.3;
    }
    posAttr.needsUpdate = true;

    // Individual twinkle per particle via size attribute
    if (sizeAttr) {
      const sizeArr = sizeAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        sizeArr[i] =
          dustSizes[i]! * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.5 + twinkleOffsets[i]!));
      }
      sizeAttr.needsUpdate = true;
    }

    // Animate trail particles
    if (quality !== 'low' && trailRef.current && trailData) {
      const trailGeo = trailRef.current.geometry;
      const trailPosAttr = trailGeo.getAttribute('position');
      if (trailPosAttr) {
        const trailPosArr = trailPosAttr.array as Float32Array;
        for (let i = 0; i < trailCount; i++) {
          const i3 = i * 3;
          trailPosArr[i3] = trailData.positions[i3]! + Math.sin(t * 0.7 + i * 0.63) * 0.5;
          trailPosArr[i3 + 1] = trailData.positions[i3 + 1]! + Math.cos(t * 0.7 + i * 1.07) * 0.3;
          trailPosArr[i3 + 2] = trailData.positions[i3 + 2]! + Math.sin(t * 0.7 + i * 0.81) * 0.5;
        }
        trailPosAttr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[basePositions.slice(), 3]} />
          <bufferAttribute attach="attributes-size" args={[dustSizes.slice(), 1]} />
        </bufferGeometry>
        <pointsMaterial
          color={DUST_CONFIG.color}
          size={DUST_CONFIG.maxSize}
          sizeAttenuation
          transparent
          opacity={dustOpacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {quality !== 'low' && trailData && (
        <points ref={trailRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[trailData.positions.slice(), 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={DUST_CONFIG.color}
            size={DUST_CONFIG.minSize}
            sizeAttenuation
            transparent
            opacity={dustOpacity * 0.4}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </>
  );
}
