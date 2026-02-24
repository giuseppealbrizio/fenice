// client/src/components/CurvedRoute.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { CosmosPosition } from '../services/cosmos-layout.service';
import { CURVED_ROUTE, STAR_CHART } from '../utils/cosmos';
import { useCosmosSettingsStore } from '../stores/cosmos-settings.store';
import { useViewStore } from '../stores/view.store';

interface CurvedRouteProps {
  from: CosmosPosition;
  to: CosmosPosition;
  color: string;
  opacity?: number | undefined;
  tubeRadius?: number | undefined;
  pulseSize?: number | undefined;
}

export function CurvedRoute({
  from,
  to,
  color,
  opacity,
  tubeRadius,
  pulseSize,
}: CurvedRouteProps): React.JSX.Element {
  const pulseRef = useRef<THREE.Mesh>(null);
  const archHeight = useCosmosSettingsStore((s) => s.routeArchHeight);
  const settingsOpacity = useCosmosSettingsStore((s) => s.routeOpacity);
  const visualMode = useViewStore((s) => s.visualMode);
  const isStarChart = visualMode === 'light';

  // Settings opacity acts as the base; explicit opacity prop scales proportionally
  const baseOpacity =
    opacity != null ? opacity * (settingsOpacity / CURVED_ROUTE.opacity) : settingsOpacity;

  const curve = useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, from.z);
    const end = new THREE.Vector3(to.x, to.y, to.z);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += archHeight;
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [from, to, archHeight]);

  const tubeGeometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        CURVED_ROUTE.segments,
        tubeRadius ?? CURVED_ROUTE.tubeRadius,
        CURVED_ROUTE.radialSegments,
        false
      ),
    [curve, tubeRadius]
  );

  // Star chart: thin dashed line, no tube, no pulse
  const starChartPoints = useMemo(() => {
    if (!isStarChart) return [];
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const p = curve.getPoint(t);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, [isStarChart, curve]);

  // Animate pulse sphere along the curve (deep space only)
  useFrame(({ clock }) => {
    if (!pulseRef.current || isStarChart) return;
    const t = (clock.elapsedTime * CURVED_ROUTE.pulseSpeed) % 1;
    const point = curve.getPoint(t);
    pulseRef.current.position.copy(point);
  });

  if (isStarChart) {
    return (
      <Line
        points={starChartPoints}
        color={STAR_CHART.dimColor}
        lineWidth={1}
        opacity={STAR_CHART.routeOpacity}
        transparent
      />
    );
  }

  return (
    <group>
      {/* Tube route */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={Math.min(baseOpacity, 1)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Animated pulse */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[pulseSize ?? CURVED_ROUTE.pulseSize, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
