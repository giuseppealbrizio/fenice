import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STATUS_PARTICLES_CONFIG } from '../../utils/atmosphere';
import { LINK_STATE_COLORS } from '../../utils/colors';

interface StatusBuilding {
  position: { x: number; z: number };
  height: number;
  linkState: 'degraded' | 'blocked';
}

interface Props {
  buildings: StatusBuilding[];
}

export function StatusParticles({ buildings }: Props): React.JSX.Element | null {
  const pointsRef = useRef<THREE.Points>(null);
  const count = buildings.length * STATUS_PARTICLES_CONFIG.countPerBuilding;

  const { positions, colors, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const ph = new Float32Array(count);

    let idx = 0;
    for (const building of buildings) {
      const color = new THREE.Color(LINK_STATE_COLORS[building.linkState].hex);
      for (let i = 0; i < STATUS_PARTICLES_CONFIG.countPerBuilding; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.5;
        pos[idx * 3] = building.position.x + Math.cos(angle) * radius;
        pos[idx * 3 + 1] = Math.random() * building.height;
        pos[idx * 3 + 2] = building.position.z + Math.sin(angle) * radius;
        col[idx * 3] = color.r;
        col[idx * 3 + 1] = color.g;
        col[idx * 3 + 2] = color.b;
        ph[idx] = Math.random() * Math.PI * 2;
        idx++;
      }
    }
    return { positions: pos, colors: col, phases: ph };
  }, [buildings, count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const y = arr[i * 3 + 1]! + STATUS_PARTICLES_CONFIG.riseSpeed * 0.016;
      arr[i * 3 + 1] = y > STATUS_PARTICLES_CONFIG.maxHeight ? 0 : y;
      arr[i * 3] = arr[i * 3]! + Math.sin(t * 2 + phases[i]!) * 0.002;
    }
    posAttr.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={STATUS_PARTICLES_CONFIG.size}
        sizeAttenuation
        transparent
        opacity={STATUS_PARTICLES_CONFIG.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
