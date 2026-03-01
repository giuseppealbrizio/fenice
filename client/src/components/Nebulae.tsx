import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { NEBULA_CONFIG } from '../utils/atmosphere';
import type { QualityLevel } from '../stores/view.store';
import { useCosmosSettingsStore } from '../stores/cosmos-settings.store';

// ─── Nebula color palettes inspired by real nebulae ─────────────────────────

interface NebulaPalette {
  core: [number, number, number];
  ring: [number, number, number];
  outer: [number, number, number];
  accent: [number, number, number];
}

const NEBULA_PALETTES: NebulaPalette[] = [
  // Helix — blue-lavender core, golden ring, deep purple haze
  { core: [100, 130, 210], ring: [230, 170, 50], outer: [100, 30, 100], accent: [255, 140, 70] },
  // Carina — teal core, magenta ring, crimson haze
  { core: [60, 170, 170], ring: [200, 60, 170], outer: [130, 20, 50], accent: [255, 100, 200] },
  // Eagle — pale blue core, emerald ring, deep indigo haze
  { core: [130, 165, 230], ring: [80, 200, 100], outer: [30, 30, 100], accent: [170, 230, 130] },
  // Orion — pink core, amber ring, deep violet haze
  { core: [200, 100, 150], ring: [230, 140, 60], outer: [60, 20, 90], accent: [255, 110, 110] },
  // Cat's Eye — cyan core, lime ring, teal haze
  { core: [70, 200, 230], ring: [130, 230, 60], outer: [15, 70, 70], accent: [100, 255, 180] },
];

function createRichNebulaTexture(palette: NebulaPalette): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2;

  // All layers additive
  ctx.globalCompositeOperation = 'lighter';

  // Layer 1: Diffuse outer haze
  const [or, og, ob] = palette.outer;
  const outerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.2, cx, cy, maxR);
  outerGrad.addColorStop(0, `rgba(${or},${og},${ob},0.35)`);
  outerGrad.addColorStop(0.3, `rgba(${or},${og},${ob},0.25)`);
  outerGrad.addColorStop(0.6, `rgba(${or},${og},${ob},0.12)`);
  outerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, size, size);

  // Layer 2: Bright ring (annular — peaks at 40-60% radius)
  const [rr, rg, rb] = palette.ring;
  const ringGrad = ctx.createRadialGradient(cx, cy, maxR * 0.12, cx, cy, maxR * 0.7);
  ringGrad.addColorStop(0, 'rgba(0,0,0,0)');
  ringGrad.addColorStop(0.25, `rgba(${rr},${rg},${rb},0.06)`);
  ringGrad.addColorStop(0.42, `rgba(${rr},${rg},${rb},0.45)`);
  ringGrad.addColorStop(0.55, `rgba(${rr},${rg},${rb},0.5)`);
  ringGrad.addColorStop(0.72, `rgba(${rr},${rg},${rb},0.2)`);
  ringGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ringGrad;
  ctx.fillRect(0, 0, size, size);

  // Layer 3: Core glow
  const [cr, cg, cb] = palette.core;
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.35);
  coreGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0.75)`);
  coreGrad.addColorStop(0.25, `rgba(${cr},${cg},${cb},0.55)`);
  coreGrad.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.18)`);
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  // Layer 4: Bright knots scattered in ring area
  const [ar, ag, ab] = palette.accent;
  for (let i = 0; i < 180; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = maxR * (0.28 + Math.random() * 0.32);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = 0.5 + Math.random() * 3;
    const alpha = 0.08 + Math.random() * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha.toFixed(2)})`;
    ctx.fill();
  }

  // Layer 5: Faint filaments radiating outward from ring
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const innerDist = maxR * (0.4 + Math.random() * 0.15);
    const outerDist = maxR * (0.65 + Math.random() * 0.25);
    const x1 = cx + Math.cos(angle) * innerDist;
    const y1 = cy + Math.sin(angle) * innerDist;
    const x2 = cx + Math.cos(angle + (Math.random() - 0.5) * 0.3) * outerDist;
    const y2 = cy + Math.sin(angle + (Math.random() - 0.5) * 0.3) * outerDist;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${or},${og},${ob},${(0.05 + Math.random() * 0.15).toFixed(2)})`;
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ─── Component ──────────────────────────────────────────────────────────────

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

export function Nebulae({ quality }: NebulaeProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const nebulaOpacity = useCosmosSettingsStore((s) => s.nebulaOpacity);

  const nebulae = useMemo<NebulaData[]>(() => {
    const count = quality !== 'low' ? NEBULA_CONFIG.count : 3;
    const result: NebulaData[] = [];

    for (let i = 0; i < count; i++) {
      const palette = NEBULA_PALETTES[i % NEBULA_PALETTES.length]!;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 70 + Math.random() * 50;
      const pos: [number, number, number] = [
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 35,
        Math.sin(angle) * dist,
      ];
      result.push({
        position: [...pos] as [number, number, number],
        basePosition: pos,
        scale:
          NEBULA_CONFIG.minScale +
          Math.random() * (NEBULA_CONFIG.maxScale - NEBULA_CONFIG.minScale),
        rotation: Math.random() * Math.PI * 2,
        texture: createRichNebulaTexture(palette),
        rotationSpeed: NEBULA_CONFIG.rotationSpeed * (0.8 + Math.random() * 0.4),
        driftOffset: Math.random() * Math.PI * 2,
      });
    }

    return result;
  }, [quality]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < groupRef.current.children.length; i++) {
      const child = groupRef.current.children[i];
      const data = nebulae[i];
      if (!child || !data) continue;

      // Slow rotation
      child.rotation.z += data.rotationSpeed * delta * 60;

      if (quality !== 'low') {
        // Drift
        const driftX = Math.sin(t * 0.01 + data.driftOffset) * 3;
        const driftZ = Math.sin(t * 0.01 + data.driftOffset + 1.5) * 3;
        child.position.x = data.basePosition[0] + driftX;
        child.position.z = data.basePosition[2] + driftZ;

        // Breathing opacity
        const sprite = child as THREE.Sprite;
        if (sprite.material) {
          sprite.material.opacity =
            nebulaOpacity * (0.7 + 0.3 * Math.sin(t * 0.05 + data.driftOffset));
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
            opacity={nebulaOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
