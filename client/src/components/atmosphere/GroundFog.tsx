import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GROUND_FOG_CONFIG } from '../../utils/atmosphere';

export function GroundFog(): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise = Math.random() * 0.3 + 0.7 * Math.sin(x * 0.05) * Math.cos(y * 0.05);
        const alpha = Math.max(0, Math.min(1, noise * 0.5));
        ctx.fillStyle = `rgba(0, 0, 32, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material;
    if (mat instanceof THREE.MeshBasicMaterial && mat.map) {
      mat.map.offset.x = clock.elapsedTime * GROUND_FOG_CONFIG.driftSpeed * 0.3;
      mat.map.offset.y = clock.elapsedTime * GROUND_FOG_CONFIG.driftSpeed * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_FOG_CONFIG.height, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial
        map={texture}
        color={GROUND_FOG_CONFIG.color}
        transparent
        opacity={GROUND_FOG_CONFIG.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
