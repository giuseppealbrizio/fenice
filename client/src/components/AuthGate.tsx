import { useRef } from 'react';
import type { Mesh } from 'three';
import { useWorldStore } from '../stores/world.store';
import { LINK_STATE_COLORS } from '../utils/colors';
import type { Position3D } from '../services/layout.service';

interface AuthGateProps {
  position: Position3D;
}

export function AuthGate({ position }: AuthGateProps): React.JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const authGate = useWorldStore((s) => s.authGate);
  const linkStyle = LINK_STATE_COLORS[authGate.linkState];

  return (
    <mesh ref={meshRef} position={[position.x, 1.0, position.z]}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color={linkStyle.hex}
        emissive={linkStyle.hex}
        emissiveIntensity={authGate.open ? 0.5 : 0.1}
        roughness={0.3}
        metalness={0.4}
        transparent={!authGate.open}
        opacity={authGate.open ? 1.0 : 0.4}
      />
    </mesh>
  );
}
