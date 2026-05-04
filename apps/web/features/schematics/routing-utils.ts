import { Position } from "@xyflow/react";

export type RoutePoint = {
  x: number;
  y: number;
};

export function snapToGrid(value: number, gridSize = 20) {
  return Math.round(value / gridSize) * gridSize;
}

function distance(a: RoutePoint, b: RoutePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function roundedOrthogonalPath(points: RoutePoint[], radius = 12) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const previousDistance = distance(previous, current);
    const nextDistance = distance(current, next);
    const cornerRadius = Math.min(radius, previousDistance / 2, nextDistance / 2);

    if (cornerRadius < 1) {
      path += ` L ${current.x} ${current.y}`;
      continue;
    }

    const beforeCorner = {
      x: current.x + ((previous.x - current.x) / previousDistance) * cornerRadius,
      y: current.y + ((previous.y - current.y) / previousDistance) * cornerRadius
    };
    const afterCorner = {
      x: current.x + ((next.x - current.x) / nextDistance) * cornerRadius,
      y: current.y + ((next.y - current.y) / nextDistance) * cornerRadius
    };

    path += ` L ${beforeCorner.x} ${beforeCorner.y} Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}

function directionForPosition(position: Position | undefined, fallback: RoutePoint): RoutePoint {
  if (position === Position.Left) return { x: -1, y: 0 };
  if (position === Position.Right) return { x: 1, y: 0 };
  if (position === Position.Top) return { x: 0, y: -1 };
  if (position === Position.Bottom) return { x: 0, y: 1 };
  return fallback;
}

function simplifyPoints(points: RoutePoint[]) {
  const withoutDuplicates = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });

  return withoutDuplicates.filter((point, index) => {
    const previous = withoutDuplicates[index - 1];
    const next = withoutDuplicates[index + 1];
    if (!previous || !next) return true;
    return !(previous.x === point.x && point.x === next.x) && !(previous.y === point.y && point.y === next.y);
  });
}

function orthogonalize(points: RoutePoint[]) {
  if (points.length < 2) return points;

  const result: RoutePoint[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = result[result.length - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      result.push({ x: current.x, y: previous.y });
    }
    result.push(current);
  }

  return simplifyPoints(result);
}

export function buildOrthogonalRoutePoints({
  source,
  target,
  routeOffset,
  sourcePosition,
  targetPosition,
  manualWaypoints
}: {
  source: RoutePoint;
  target: RoutePoint;
  routeOffset: RoutePoint;
  sourcePosition?: Position;
  targetPosition?: Position;
  manualWaypoints?: RoutePoint[];
}) {
  if (manualWaypoints?.length) {
    return orthogonalize([source, ...manualWaypoints, target]);
  }

  const sourceFallback = source.x <= target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const targetFallback = target.x >= source.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const sourceDirection = directionForPosition(sourcePosition, sourceFallback);
  const targetDirection = directionForPosition(targetPosition, targetFallback);
  const sourceStub = {
    x: source.x + sourceDirection.x * 40,
    y: source.y + sourceDirection.y * 40
  };
  const targetStub = {
    x: target.x + targetDirection.x * 40,
    y: target.y + targetDirection.y * 40
  };

  const sourceFacesTarget =
    sourceDirection.x !== 0 &&
    targetDirection.x !== 0 &&
    sourceDirection.x !== targetDirection.x &&
    ((sourceDirection.x > 0 && source.x < target.x) || (sourceDirection.x < 0 && source.x > target.x));
  const routeX = sourceFacesTarget
    ? (sourceStub.x + targetStub.x) / 2 + routeOffset.x
    : sourceDirection.x >= 0
      ? Math.max(source.x, target.x) + 90 + routeOffset.x
      : Math.min(source.x, target.x) - 90 + routeOffset.x;
  const routeY = (source.y + target.y) / 2 + routeOffset.y;

  return simplifyPoints([
    source,
    sourceStub,
    { x: routeX, y: sourceStub.y },
    { x: routeX, y: routeY },
    { x: targetStub.x, y: routeY },
    targetStub,
    target
  ]);
}

export function projectOntoSegments(point: RoutePoint, waypoints: RoutePoint[]) {
  let bestPoint = point;
  let bestDistance = Infinity;
  let bestSegmentIndex = 0;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) continue;
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    const projected = {
      x: start.x + t * dx,
      y: start.y + t * dy
    };
    const projectedDistance = (point.x - projected.x) ** 2 + (point.y - projected.y) ** 2;
    if (projectedDistance < bestDistance) {
      bestPoint = projected;
      bestDistance = projectedDistance;
      bestSegmentIndex = index;
    }
  }

  return {
    point: bestPoint,
    segmentIndex: bestSegmentIndex
  };
}
