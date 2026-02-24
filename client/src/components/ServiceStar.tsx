import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { ServiceStarLayout } from '../services/cosmos-layout.service';
import { SERVICE_STAR, STAR_CHART } from '../utils/cosmos';
import { METHOD_COLORS } from '../utils/colors';
import { useWorldStore } from '../stores/world.store';
import { useViewStore } from '../stores/view.store';
import { useCosmosSettingsStore } from '../stores/cosmos-settings.store';

/** Create a procedural radial glow texture. */
function createGlowTexture(color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color + '80');
  gradient.addColorStop(0.4, color + '30');
  gradient.addColorStop(0.7, color + '10');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ServiceStarProps {
  star: ServiceStarLayout;
}

export function ServiceStar({ star }: ServiceStarProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const endpoints = useWorldStore((s) => s.endpoints);
  const visualMode = useViewStore((s) => s.visualMode);
  const coreRadius = useCosmosSettingsStore((s) => s.starCoreRadius);
  const emissiveIntensity = useCosmosSettingsStore((s) => s.starEmissiveIntensity);
  const glowScale = useCosmosSettingsStore((s) => s.starGlowScale);

  const isStarChart = visualMode === 'light';

  // Determine star color from the dominant method of its endpoints
  const starColor = useMemo(() => {
    const serviceEps = endpoints.filter((e) => e.serviceId === star.serviceId);
    const method = serviceEps[0]?.method ?? 'get';
    return METHOD_COLORS[method];
  }, [endpoints, star.serviceId]);

  const glowTexture = useMemo(() => createGlowTexture(starColor), [starColor]);
  const coronaTexture = useMemo(() => createGlowTexture(starColor), [starColor]);

  // Gentle pulse animation (only in deep space mode)
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (isStarChart) {
      groupRef.current.scale.setScalar(1);
      return;
    }
    const t = clock.elapsedTime * SERVICE_STAR.pulseSpeed;
    const scale =
      SERVICE_STAR.pulseMin +
      ((SERVICE_STAR.pulseMax - SERVICE_STAR.pulseMin) / 2) * (1 + Math.sin(t));
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[star.position.x, star.position.y, star.position.z]}>
      {isStarChart ? (
        <>
          {/* Star Chart: wireframe sphere */}
          <mesh>
            <sphereGeometry args={[coreRadius, 16, 16]} />
            <meshBasicMaterial
              color={STAR_CHART.wireColor}
              wireframe
              transparent
              opacity={STAR_CHART.starWireOpacity}
            />
          </mesh>
          {/* Equator ring for visual anchor */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[coreRadius * 1.3, 0.02, 8, 48]} />
            <meshBasicMaterial color={STAR_CHART.accentColor} transparent opacity={0.4} />
          </mesh>
          {/* Center dot */}
          <mesh>
            <sphereGeometry args={[coreRadius * 0.15, 8, 8]} />
            <meshBasicMaterial color={STAR_CHART.accentColor} />
          </mesh>
        </>
      ) : (
        <>
          {/* Core star sphere */}
          <mesh>
            <sphereGeometry args={[coreRadius, 32, 32]} />
            <meshPhysicalMaterial
              color={starColor}
              emissive={starColor}
              emissiveIntensity={emissiveIntensity}
              roughness={SERVICE_STAR.roughness}
              metalness={SERVICE_STAR.metalness}
            />
          </mesh>

          {/* Large glow sprite */}
          <sprite scale={[glowScale, glowScale, 1]}>
            <spriteMaterial
              map={glowTexture}
              transparent
              opacity={SERVICE_STAR.glowOpacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>

          {/* Corona sprite (smaller, brighter) */}
          <sprite scale={[SERVICE_STAR.coronaScale, SERVICE_STAR.coronaScale, 1]}>
            <spriteMaterial
              map={coronaTexture}
              transparent
              opacity={SERVICE_STAR.coronaOpacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>

          {/* Point light to illuminate nearby planets */}
          <pointLight color={starColor} intensity={1.0} distance={20} decay={2} />
        </>
      )}

      {/* Label */}
      <Html center occlude={false} position={[0, coreRadius + 1.2, 0]}>
        <div
          style={{
            pointerEvents: 'none',
            fontSize: isStarChart ? '11px' : '13px',
            fontWeight: isStarChart ? 500 : 600,
            color: isStarChart ? STAR_CHART.labelColor : '#e0f0ff',
            textShadow: isStarChart ? 'none' : '0 0 8px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            fontFamily: isStarChart ? 'monospace' : 'inherit',
            textTransform: isStarChart ? 'uppercase' : 'none',
            letterSpacing: isStarChart ? '1.5px' : '0',
          }}
        >
          {star.tag}
        </div>
      </Html>
    </group>
  );
}
