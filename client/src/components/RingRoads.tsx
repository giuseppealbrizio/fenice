import { Line } from '@react-three/drei';
import type { RoadSegment } from '../services/layout.service';

interface RingRoadsProps {
  roads: RoadSegment[];
}

export function RingRoads({ roads }: RingRoadsProps): React.JSX.Element {
  return (
    <group>
      {roads.map((road, i) => {
        const points = road.points.map((p) => [p.x, p.y, p.z] as [number, number, number]);
        return (
          <group key={`ring-${road.zone}-${i}`}>
            {/* Road surface — dark lane */}
            <Line
              points={points}
              color="#0a1a3e"
              lineWidth={road.width * 10}
              opacity={0.4}
              transparent
            />
            {/* Lane markings — faint cyan */}
            <Line points={points} color="#00E5FF" lineWidth={1} opacity={0.15} transparent />
          </group>
        );
      })}
    </group>
  );
}
