import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { CosmosPosition } from '../services/cosmos-layout.service';
import { computeOrbitPoint } from '../services/cosmos-layout.service';
import { ORBITAL_PATH, STAR_CHART } from '../utils/cosmos';
import { useViewStore } from '../stores/view.store';

interface OrbitalPathProps {
  center: CosmosPosition;
  radius: number;
  tilt: number;
  color: string;
}

export function OrbitalPath({ center, radius, tilt, color }: OrbitalPathProps): React.JSX.Element {
  const visualMode = useViewStore((s) => s.visualMode);
  const isStarChart = visualMode === 'light';

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= ORBITAL_PATH.segments; i++) {
      const angle = (i / ORBITAL_PATH.segments) * Math.PI * 2;
      const p = computeOrbitPoint(center, radius, angle, tilt);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  }, [center, radius, tilt]);

  return (
    <Line
      points={points}
      color={isStarChart ? STAR_CHART.dimColor : color}
      lineWidth={isStarChart ? STAR_CHART.orbitLineWidth : ORBITAL_PATH.lineWidth}
      opacity={isStarChart ? STAR_CHART.orbitOpacity : ORBITAL_PATH.opacity}
      transparent
    />
  );
}
