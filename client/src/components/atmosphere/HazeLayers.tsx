import { useMemo } from 'react';
import * as THREE from 'three';
import { HAZE_LAYERS_CONFIG } from '../../utils/atmosphere';
import { useCosmosSettingsStore } from '../../stores/cosmos-settings.store';

export function HazeLayers(): React.JSX.Element {
  const hazeOpacity = useCosmosSettingsStore((s) => s.hazeOpacity);
  const layers = useMemo(() => {
    return HAZE_LAYERS_CONFIG.layers.map((layer, i) => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradient.addColorStop(0, `rgba(10, 10, 40, 0.4)`);
      gradient.addColorStop(0.5, `rgba(5, 5, 26, 0.2)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      return { ...layer, texture: new THREE.CanvasTexture(canvas), key: i };
    });
  }, []);

  return (
    <group>
      {layers.map((layer) => (
        <mesh key={layer.key} position={[0, 10, -layer.z]} rotation={[0, 0, 0]}>
          <planeGeometry args={[100, 60]} />
          <meshBasicMaterial
            map={layer.texture}
            color={layer.color}
            transparent
            opacity={layer.opacity * hazeOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
