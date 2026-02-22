import { Line } from '@react-three/drei';
import type { WorldEdge, WorldEndpoint } from '../types/world';
import type { BuildingLayout, Position3D } from '../services/layout.service';
import type { SemanticState } from '../types/semantic';
import { LINK_STATE_COLORS } from '../utils/colors';
import type { LinkState } from '../types/semantic';

interface EdgesProps {
  edges: WorldEdge[];
  buildingLayouts: BuildingLayout[];
  endpointSemantics: Record<string, SemanticState>;
  endpointMap: Map<string, WorldEndpoint>;
  gatePosition: Position3D;
}

/** Determine worst linkState between two endpoints for edge coloring */
export function worstLinkState(a: LinkState | undefined, b: LinkState | undefined): LinkState {
  const precedence: LinkState[] = ['blocked', 'degraded', 'ok', 'unknown'];
  const aIdx = precedence.indexOf(a ?? 'unknown');
  const bIdx = precedence.indexOf(b ?? 'unknown');
  return precedence[Math.min(aIdx, bIdx)] ?? 'unknown';
}

/** Compute edge waypoints — auth-gated edges route through gate center */
export function computeEdgePoints(
  source: Position3D,
  target: Position3D,
  gatePosition: Position3D,
  isAuthGated: boolean
): [number, number, number][] {
  const y = 0.05;
  if (isAuthGated) {
    return [
      [source.x, y, source.z],
      [gatePosition.x, y, gatePosition.z],
      [target.x, y, target.z],
    ];
  }
  return [
    [source.x, y, source.z],
    [target.x, y, target.z],
  ];
}

export function Edges({
  edges,
  buildingLayouts,
  endpointSemantics,
  endpointMap,
  gatePosition,
}: EdgesProps): React.JSX.Element {
  const posMap = new Map(buildingLayouts.map((b) => [b.endpointId, b.position]));

  return (
    <group>
      {edges.map((edge) => {
        const source = posMap.get(edge.sourceId);
        const target = posMap.get(edge.targetId);
        if (!source || !target) return null;

        const sourceEp = endpointMap.get(edge.sourceId);
        const targetEp = endpointMap.get(edge.targetId);
        const sourceSem = endpointSemantics[edge.sourceId];
        const targetSem = endpointSemantics[edge.targetId];
        const edgeLinkState = worstLinkState(sourceSem?.linkState, targetSem?.linkState);
        const style = LINK_STATE_COLORS[edgeLinkState];

        // Auth-gated: source is public (!hasAuth) AND target is protected (hasAuth)
        const isAuthGated = !!sourceEp && !sourceEp.hasAuth && !!targetEp && targetEp.hasAuth;
        const points = computeEdgePoints(source, target, gatePosition, isAuthGated);

        const isDashed = style.edgeStyle === 'dashed';
        const dashProps = isDashed ? { dashSize: 0.5, gapSize: 0.3 } : {};

        return (
          <Line
            key={edge.id}
            points={points}
            color={style.hex}
            lineWidth={isDashed ? 1 : 1.5}
            opacity={style.opacity}
            transparent
            dashed={isDashed}
            {...dashProps}
          />
        );
      })}
    </group>
  );
}
