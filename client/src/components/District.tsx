import { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { DistrictLayout } from '../services/layout.service';
import { GROUND_Y, ZONE_LAYOUT_CONFIG } from '../utils/constants';
import { ZONE_STYLES } from '../utils/colors';
import { useViewStore } from '../stores/view.store';

const GRID_TEXTURE_SIZE = 256;
const GRID_SPACING = 2; // lines every 2 units

/** Generate a procedural grid texture with subtle lines. */
function createGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_TEXTURE_SIZE;
  canvas.height = GRID_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, GRID_TEXTURE_SIZE, GRID_TEXTURE_SIZE);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  // Draw grid lines (the texture repeats, so one period is enough)
  const step = GRID_TEXTURE_SIZE / GRID_SPACING;
  for (let i = 0; i <= GRID_SPACING; i++) {
    const pos = i * step;
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, GRID_TEXTURE_SIZE);
    ctx.stroke();
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(GRID_TEXTURE_SIZE, pos);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

const LIGHT_ZONE_FLOOR_COLORS = {
  'public-perimeter': '#dce8ff',
  'protected-core': '#d4e2ff',
  'auth-hub': '#cad8f7',
} as const;

interface DistrictProps {
  layout: DistrictLayout;
}

export function District({ layout }: DistrictProps): React.JSX.Element {
  const visualMode = useViewStore((s) => s.visualMode);
  const quality = useViewStore((s) => s.quality);
  const width = layout.bounds.maxX - layout.bounds.minX;
  const depth = layout.bounds.maxZ - layout.bounds.minZ;
  const showGrid = visualMode === 'dark' && quality === 'high';

  // Procedural grid texture for dark mode + high quality
  const gridTexture = useMemo(() => {
    if (!showGrid) return null;
    const tex = createGridTexture();
    // Repeat based on district size so lines appear every 2 world units
    tex.repeat.set(width / GRID_SPACING, depth / GRID_SPACING);
    return tex;
  }, [showGrid, width, depth]);
  const zoneStyle = ZONE_STYLES[layout.zone];
  const floorColor =
    visualMode === 'light' ? LIGHT_ZONE_FLOOR_COLORS[layout.zone] : zoneStyle.floorColor;
  const labelColor = visualMode === 'light' ? '#1f3159' : '#c7d6ff';
  const labelShadow =
    visualMode === 'light' ? '0 1px 3px rgba(255,255,255,0.9)' : '0 0 8px rgba(0,0,0,0.9)';

  // Border wireframe for protected-core
  const borderPoints: [number, number, number][] = [
    [layout.bounds.minX, GROUND_Y + 0.01, layout.bounds.minZ],
    [layout.bounds.maxX, GROUND_Y + 0.01, layout.bounds.minZ],
    [layout.bounds.maxX, GROUND_Y + 0.01, layout.bounds.maxZ],
    [layout.bounds.minX, GROUND_Y + 0.01, layout.bounds.maxZ],
    [layout.bounds.minX, GROUND_Y + 0.01, layout.bounds.minZ],
  ];

  // Corner accent marks for protected-core districts
  const ACCENT_LENGTH = 0.6;
  const accentY = GROUND_Y + 0.02;

  const cornerAccents: [number, number, number][][] = [
    // Top-left
    [
      [layout.bounds.minX, accentY, layout.bounds.minZ],
      [layout.bounds.minX + ACCENT_LENGTH, accentY, layout.bounds.minZ],
    ],
    [
      [layout.bounds.minX, accentY, layout.bounds.minZ],
      [layout.bounds.minX, accentY, layout.bounds.minZ + ACCENT_LENGTH],
    ],
    // Top-right
    [
      [layout.bounds.maxX, accentY, layout.bounds.minZ],
      [layout.bounds.maxX - ACCENT_LENGTH, accentY, layout.bounds.minZ],
    ],
    [
      [layout.bounds.maxX, accentY, layout.bounds.minZ],
      [layout.bounds.maxX, accentY, layout.bounds.minZ + ACCENT_LENGTH],
    ],
    // Bottom-left
    [
      [layout.bounds.minX, accentY, layout.bounds.maxZ],
      [layout.bounds.minX + ACCENT_LENGTH, accentY, layout.bounds.maxZ],
    ],
    [
      [layout.bounds.minX, accentY, layout.bounds.maxZ],
      [layout.bounds.minX, accentY, layout.bounds.maxZ - ACCENT_LENGTH],
    ],
    // Bottom-right
    [
      [layout.bounds.maxX, accentY, layout.bounds.maxZ],
      [layout.bounds.maxX - ACCENT_LENGTH, accentY, layout.bounds.maxZ],
    ],
    [
      [layout.bounds.maxX, accentY, layout.bounds.maxZ],
      [layout.bounds.maxX, accentY, layout.bounds.maxZ - ACCENT_LENGTH],
    ],
  ];

  return (
    <group>
      {/* Ground plane */}
      <mesh position={[layout.center.x, GROUND_Y, layout.center.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={floorColor}
          transparent
          opacity={ZONE_LAYOUT_CONFIG[layout.zone].groundOpacity}
          roughness={0.9}
          emissive={visualMode === 'dark' ? floorColor : '#000000'}
          emissiveIntensity={visualMode === 'dark' ? 0.05 : 0}
        />
      </mesh>

      {/* Grid overlay (dark mode + high quality) */}
      {showGrid && gridTexture && (
        <mesh
          position={[layout.center.x, GROUND_Y + 0.005, layout.center.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial
            map={gridTexture}
            transparent
            opacity={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Zone border + corner accents (protected-core only) */}
      {zoneStyle.borderColor && (
        <>
          <Line
            points={borderPoints}
            color={zoneStyle.borderColor}
            lineWidth={1}
            opacity={0.3}
            transparent
          />
          {cornerAccents.map((pts, idx) => (
            <Line
              key={`accent-${idx}`}
              points={pts}
              color={zoneStyle.borderColor!}
              lineWidth={2}
              opacity={0.6}
              transparent
            />
          ))}
        </>
      )}

      {/* Service tag label in screen-space to avoid mirrored/clipped 3D text */}
      <Html position={[layout.center.x, 0.2, layout.bounds.minZ - 0.45]} center occlude={false}>
        <div
          style={{
            pointerEvents: 'none',
            fontSize: '20px',
            fontWeight: 600,
            color: labelColor,
            textShadow: labelShadow,
            whiteSpace: 'nowrap',
          }}
        >
          {layout.tag}
        </div>
      </Html>
    </group>
  );
}
