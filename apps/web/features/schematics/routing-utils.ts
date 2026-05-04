import { Position } from "@xyflow/react";

export type RoutePoint = {
  x: number;
  y: number;
};

export type RouteObstacle = {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type RouteDirection = "horizontal" | "vertical";

const DEFAULT_STUB_LENGTH = 40;
const DEFAULT_OBSTACLE_PADDING = 24;
const BEND_COST = 1_000_000;

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

function expandedObstacle(obstacle: RouteObstacle, padding = DEFAULT_OBSTACLE_PADDING) {
  return {
    left: obstacle.x - padding,
    right: obstacle.x + obstacle.width + padding,
    top: obstacle.y - padding,
    bottom: obstacle.y + obstacle.height + padding
  };
}

function pointInsideObstacle(point: RoutePoint, obstacle: RouteObstacle) {
  const rect = expandedObstacle(obstacle);
  return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
}

function segmentIntersectsObstacle(start: RoutePoint, end: RoutePoint, obstacle: RouteObstacle) {
  const rect = expandedObstacle(obstacle);
  if (start.x === end.x) {
    const segmentTop = Math.min(start.y, end.y);
    const segmentBottom = Math.max(start.y, end.y);
    return start.x > rect.left && start.x < rect.right && segmentBottom > rect.top && segmentTop < rect.bottom;
  }

  if (start.y === end.y) {
    const segmentLeft = Math.min(start.x, end.x);
    const segmentRight = Math.max(start.x, end.x);
    return start.y > rect.top && start.y < rect.bottom && segmentRight > rect.left && segmentLeft < rect.right;
  }

  return true;
}

function routeIsClear(points: RoutePoint[], obstacles: RouteObstacle[]) {
  return points.every((point) => obstacles.every((obstacle) => !pointInsideObstacle(point, obstacle))) &&
    points.every((point, index) => {
      const next = points[index + 1];
      return !next || obstacles.every((obstacle) => !segmentIntersectsObstacle(point, next, obstacle));
    });
}

function directionBetween(start: RoutePoint, end: RoutePoint): RouteDirection | null {
  if (start.x === end.x && start.y !== end.y) return "vertical";
  if (start.y === end.y && start.x !== end.x) return "horizontal";
  return null;
}

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((value) => Math.round(value * 100) / 100))].sort((a, b) => a - b);
}

function pointKey(point: RoutePoint) {
  return `${point.x},${point.y}`;
}

function defaultOrthogonalRoute({
  source,
  target,
  routeOffset,
  sourcePosition,
  targetPosition
}: {
  source: RoutePoint;
  target: RoutePoint;
  routeOffset: RoutePoint;
  sourcePosition?: Position;
  targetPosition?: Position;
}) {
  const sourceFallback = source.x <= target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const targetFallback = target.x >= source.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  const sourceDirection = directionForPosition(sourcePosition, sourceFallback);
  const targetDirection = directionForPosition(targetPosition, targetFallback);
  const sourceStub = {
    x: source.x + sourceDirection.x * DEFAULT_STUB_LENGTH,
    y: source.y + sourceDirection.y * DEFAULT_STUB_LENGTH
  };
  const targetStub = {
    x: target.x + targetDirection.x * DEFAULT_STUB_LENGTH,
    y: target.y + targetDirection.y * DEFAULT_STUB_LENGTH
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

  return {
    sourceDirection,
    targetDirection,
    sourceStub,
    targetStub,
    points: simplifyPoints([
      source,
      sourceStub,
      { x: routeX, y: sourceStub.y },
      { x: routeX, y: routeY },
      { x: targetStub.x, y: routeY },
      targetStub,
      target
    ])
  };
}

function buildObstacleAwareRoute({
  source,
  target,
  routeOffset,
  sourcePosition,
  targetPosition,
  obstacles
}: {
  source: RoutePoint;
  target: RoutePoint;
  routeOffset: RoutePoint;
  sourcePosition?: Position;
  targetPosition?: Position;
  obstacles: RouteObstacle[];
}) {
  const fallbackRoute = defaultOrthogonalRoute({ source, target, routeOffset, sourcePosition, targetPosition });
  const fallbackPoints = fallbackRoute.points;

  if ((routeOffset.x !== 0 || routeOffset.y !== 0) && routeIsClear(fallbackPoints, obstacles)) {
    return fallbackPoints;
  }

  const xLines = uniqueSorted([
    source.x,
    source.x + fallbackRoute.sourceDirection.x * DEFAULT_STUB_LENGTH,
    target.x,
    target.x + fallbackRoute.targetDirection.x * DEFAULT_STUB_LENGTH,
    (source.x + target.x) / 2 + routeOffset.x,
    ...obstacles.flatMap((obstacle) => {
      const rect = expandedObstacle(obstacle);
      return [rect.left, rect.right];
    })
  ]);
  const yLines = uniqueSorted([
    source.y,
    source.y + fallbackRoute.sourceDirection.y * DEFAULT_STUB_LENGTH,
    target.y,
    target.y + fallbackRoute.targetDirection.y * DEFAULT_STUB_LENGTH,
    (source.y + target.y) / 2 + routeOffset.y,
    ...obstacles.flatMap((obstacle) => {
      const rect = expandedObstacle(obstacle);
      return [rect.top, rect.bottom];
    })
  ]);

  const sourceStub = fallbackRoute.sourceStub;
  const targetStub = fallbackRoute.targetStub;
  const points = new Map<string, RoutePoint>();

  for (const x of xLines) {
    for (const y of yLines) {
      const point = { x, y };
      if (obstacles.some((obstacle) => pointInsideObstacle(point, obstacle))) continue;
      points.set(pointKey(point), point);
    }
  }

  points.set(pointKey(sourceStub), sourceStub);
  points.set(pointKey(targetStub), targetStub);

  const pointList = [...points.values()];
  const pointIndex = new Map(pointList.map((point, index) => [pointKey(point), index]));
  const adjacency: Array<Array<{ index: number; distance: number }>> = pointList.map(() => []);

  for (const y of yLines) {
    const row = pointList.filter((point) => point.y === y).sort((a, b) => a.x - b.x);
    for (let index = 0; index < row.length - 1; index += 1) {
      const start = row[index];
      const end = row[index + 1];
      if (!routeIsClear([start, end], obstacles)) continue;
      const startIndex = pointIndex.get(pointKey(start));
      const endIndex = pointIndex.get(pointKey(end));
      if (startIndex === undefined || endIndex === undefined) continue;
      const segmentLength = Math.abs(end.x - start.x);
      adjacency[startIndex].push({ index: endIndex, distance: segmentLength });
      adjacency[endIndex].push({ index: startIndex, distance: segmentLength });
    }
  }

  for (const x of xLines) {
    const column = pointList.filter((point) => point.x === x).sort((a, b) => a.y - b.y);
    for (let index = 0; index < column.length - 1; index += 1) {
      const start = column[index];
      const end = column[index + 1];
      if (!routeIsClear([start, end], obstacles)) continue;
      const startIndex = pointIndex.get(pointKey(start));
      const endIndex = pointIndex.get(pointKey(end));
      if (startIndex === undefined || endIndex === undefined) continue;
      const segmentLength = Math.abs(end.y - start.y);
      adjacency[startIndex].push({ index: endIndex, distance: segmentLength });
      adjacency[endIndex].push({ index: startIndex, distance: segmentLength });
    }
  }

  const startIndex = pointIndex.get(pointKey(sourceStub));
  const endIndex = pointIndex.get(pointKey(targetStub));
  if (startIndex === undefined || endIndex === undefined) return fallbackPoints;

  type State = {
    index: number;
    direction: RouteDirection | null;
    cost: number;
    previousKey?: string;
  };
  const initialDirection = directionBetween(source, sourceStub);
  const finalDirection = directionBetween(targetStub, target);
  const initialState: State = { index: startIndex, direction: initialDirection, cost: 0 };
  const queue: State[] = [initialState];
  const best = new Map<string, State>([[`${startIndex}:${initialDirection ?? "none"}`, initialState]]);
  let finishedKey: string | null = null;
  let finishedCost = Infinity;

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) break;

    const currentKey = `${current.index}:${current.direction ?? "none"}`;
    if (best.get(currentKey)?.cost !== current.cost) continue;
    if (current.cost > finishedCost) break;
    if (current.index === endIndex) {
      const finalBend = current.direction && finalDirection && current.direction !== finalDirection ? BEND_COST : 0;
      const totalCost = current.cost + finalBend;
      if (totalCost < finishedCost) {
        finishedCost = totalCost;
        finishedKey = currentKey;
      }
      continue;
    }

    for (const neighbor of adjacency[current.index]) {
      const nextDirection = directionBetween(pointList[current.index], pointList[neighbor.index]);
      if (!nextDirection) continue;
      const bends = current.direction && current.direction !== nextDirection ? 1 : 0;
      const nextCost = current.cost + neighbor.distance + bends * BEND_COST;
      const nextKey = `${neighbor.index}:${nextDirection}`;
      const existing = best.get(nextKey);
      if (existing && existing.cost <= nextCost) continue;
      const nextState = {
        index: neighbor.index,
        direction: nextDirection,
        cost: nextCost,
        previousKey: currentKey
      };
      best.set(nextKey, nextState);
      queue.push(nextState);
    }
  }

  if (!finishedKey) return fallbackPoints;

  const routedPoints: RoutePoint[] = [];
  let currentKey: string | undefined = finishedKey;
  while (currentKey) {
    const state = best.get(currentKey);
    if (!state) break;
    routedPoints.push(pointList[state.index]);
    currentKey = state.previousKey;
  }

  const route = simplifyPoints([source, ...routedPoints.reverse(), target]);
  return routeIsClear(route, obstacles) ? route : fallbackPoints;
}

export function buildOrthogonalRoutePoints({
  source,
  target,
  routeOffset,
  sourcePosition,
  targetPosition,
  manualWaypoints,
  obstacles = []
}: {
  source: RoutePoint;
  target: RoutePoint;
  routeOffset: RoutePoint;
  sourcePosition?: Position;
  targetPosition?: Position;
  manualWaypoints?: RoutePoint[];
  obstacles?: RouteObstacle[];
}) {
  if (manualWaypoints?.length) {
    return orthogonalize([source, ...manualWaypoints, target]);
  }

  const route = buildObstacleAwareRoute({
    source,
    target,
    routeOffset,
    sourcePosition,
    targetPosition,
    obstacles
  });

  return simplifyPoints(route);
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
