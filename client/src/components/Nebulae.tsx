import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { NEBULA_CONFIG } from '../utils/atmosphere';
import type { QualityLevel } from '../stores/view.store';

function createNebulaTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(0.3, color + '20');
  gradient.addColorStop(0.7, color + '08');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface NebulaData {
  position: [number, number, number];
  basePosition: [number, number, number];
  scale: number;
  rotation: number;
  texture: THREE.CanvasTexture;
  rotationSpeed: number;
  driftOffset: number;
}

interface NebulaeProps {
  quality: QualityLevel;
}

/** Extra colors for high-quality distant nebulae */
const EXTRA_NEBULA_COLORS = ['#300070', '#180040'] as const;

export function Nebulae({ quality }: NebulaeProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  const nebulae = useMemo<NebulaData[]>(() => {
    // Base 3 nebulae (always present)
    const base: NebulaData[] = NEBULA_CONFIG.colors.map((color, i) => {
      const angle = (i / NEBULA_CONFIG.count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 80 + Math.random() * 40;
      const pos: [number, number, number] = [
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 40,
        Math.sin(angle) * dist,
      ];
      return {
        position: [...pos] as [number, number, number],
        basePosition: pos,
        scale:
          NEBULA_CONFIG.minScale +
          Math.random() * (NEBULA_CONFIG.maxScale - NEBULA_CONFIG.minScale),
        rotation: Math.random() * Math.PI * 2,
        texture: createNebulaTexture(color),
        rotationSpeed: NEBULA_CONFIG.rotationSpeed * (0.8 + Math.random() * 0.4),
        driftOffset: Math.random() * Math.PI * 2,
      };
    });

    // High quality: add 2 extra smaller nebulae at greater distance
    if (quality === 'high') {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 30;
        const pos: [number, number, number] = [
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * 50,
          Math.sin(angle) * dist,
        ];
        base.push({
          position: [...pos] as [number, number, number],
          basePosition: pos,
          scale: NEBULA_CONFIG.minScale * 0.6 + Math.random() * 15,
          rotation: Math.random() * Math.PI * 2,
          texture: createNebulaTexture(EXTRA_NEBULA_COLORS[i]!),
          rotationSpeed: NEBULA_CONFIG.rotationSpeed * (0.6 + Math.random() * 0.3),
          driftOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    return base;
  }, [quality]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < groupRef.current.children.length; i++) {
      const child = groupRef.current.children[i];
      const data = nebulae[i];
      if (!child || !data) continue;

      // Rotation (always applied)
      child.rotation.z += data.rotationSpeed * delta * 60;

      if (quality === 'high') {
        // Drift: sin-based movement on X/Z
        const driftX = Math.sin(t * 0.01 + data.driftOffset) * 3;
        const driftZ = Math.sin(t * 0.01 + data.driftOffset + 1.5) * 3;
        child.position.x = data.basePosition[0] + driftX;
        child.position.z = data.basePosition[2] + driftZ;

        // Breathing opacity
        const sprite = child as THREE.Sprite;
        if (sprite.material) {
          const baseOpacity = NEBULA_CONFIG.opacity;
          sprite.material.opacity =
            baseOpacity * (0.7 + 0.3 * Math.sin(t * 0.05 + data.driftOffset));
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {nebulae.map((n, i) => (
        <sprite
          key={`nebula-${i}`}
          position={n.position}
          scale={[n.scale, n.scale, 1]}
          rotation={[0, 0, n.rotation]}
        >
          <spriteMaterial
            map={n.texture}
            transparent
            opacity={NEBULA_CONFIG.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
