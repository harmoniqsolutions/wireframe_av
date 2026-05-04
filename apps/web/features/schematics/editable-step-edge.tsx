"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { colorForSignal } from "@wireframe-av/diagram/src/signalColors";
import {
  buildOrthogonalRoutePoints,
  roundedOrthogonalPath,
  snapToGrid,
  type RoutePoint
} from "./routing-utils";

type EditableStepEdgeData = {
  routeOffsetX?: number;
  routeOffsetY?: number;
  manualWaypoints?: RoutePoint[];
  signalTypeName?: string;
  connectorTypeName?: string;
  onRouteChange?: (edgeId: string, route: { routeOffsetX: number; routeOffsetY: number; manualWaypoints?: RoutePoint[] }) => void;
};

export function EditableStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  data
}: EdgeProps) {
  const edgeData = useMemo(() => (data ?? {}) as EditableStepEdgeData, [data]);
  const manualWaypoints = useMemo(() => edgeData.manualWaypoints ?? [], [edgeData.manualWaypoints]);
  const signalColor = colorForSignal(edgeData.signalTypeName);
  const { screenToFlowPosition } = useReactFlow();
  const [activeWaypoints, setActiveWaypoints] = useState<RoutePoint[]>(manualWaypoints);
  const activeWaypointsRef = useRef(activeWaypoints);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setActiveWaypoints(manualWaypoints);
    activeWaypointsRef.current = manualWaypoints;
  }, [manualWaypoints]);

  const source = useMemo(() => ({ x: sourceX, y: sourceY }), [sourceX, sourceY]);
  const target = useMemo(() => ({ x: targetX, y: targetY }), [targetX, targetY]);
  const routeOffset = useMemo(
    () => ({
      x: edgeData.routeOffsetX ?? 0,
      y: edgeData.routeOffsetY ?? 0
    }),
    [edgeData.routeOffsetX, edgeData.routeOffsetY]
  );
  const routePoints = useMemo(
    () =>
      buildOrthogonalRoutePoints({
        source,
        target,
        routeOffset,
        sourcePosition,
        targetPosition,
        manualWaypoints: activeWaypoints
      }),
    [activeWaypoints, routeOffset, source, sourcePosition, target, targetPosition]
  );
  const controlPoint = routePoints[Math.floor(routePoints.length / 2)] ?? {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2
  };
  const edgePath = useMemo(() => roundedOrthogonalPath(routePoints, 12), [routePoints]);

  const fallbackPath = useMemo(
    () => getBezierPath({ sourceX, sourceY, targetX, targetY })[0],
    [sourceX, sourceY, targetX, targetY]
  );

  const startWaypointDrag = useCallback(
    (event: ReactMouseEvent<SVGCircleElement>, waypointIndex: number) => {
      event.preventDefault();
      event.stopPropagation();

      const startPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const originalWaypoints = activeWaypointsRef.current.map((point) => ({ ...point }));
      const originalPoint = originalWaypoints[waypointIndex];
      if (!originalPoint) return;

      function move(moveEvent: PointerEvent) {
        const currentPosition = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        const nextWaypoints = originalWaypoints.map((point, index) =>
          index === waypointIndex
            ? {
                x: snapToGrid(originalPoint.x + currentPosition.x - startPosition.x),
                y: snapToGrid(originalPoint.y + currentPosition.y - startPosition.y)
              }
            : point
        );
        activeWaypointsRef.current = nextWaypoints;
        setActiveWaypoints(nextWaypoints);
      }

      function stop() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        edgeData.onRouteChange?.(id, {
          routeOffsetX: 0,
          routeOffsetY: 0,
          manualWaypoints: activeWaypointsRef.current
        });
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [edgeData, id, screenToFlowPosition]
  );

  const showWaypointHandles = (selected || hovered) && activeWaypoints.length > 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath || fallbackPath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "hsl(var(--foreground))" : signalColor,
          strokeWidth: selected ? 2.5 : 1.75
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-sm transition-all"
          style={{
            transform: `translate(-50%, -50%) translate(${controlPoint.x}px, ${controlPoint.y - 22}px)`,
            pointerEvents: "all",
            borderColor: selected ? "hsl(var(--foreground))" : "hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
            color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
            opacity: selected || hovered ? 1 : 0.55
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title={[label, edgeData.signalTypeName, edgeData.connectorTypeName].filter(Boolean).join(" / ")}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
      {showWaypointHandles && (
        <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          {activeWaypoints.map((waypoint, index) => (
            <g key={`${id}-waypoint-${index}`}>
              <circle cx={waypoint.x} cy={waypoint.y} r={5} fill="white" stroke="#171717" strokeWidth={2} />
              <circle
                cx={waypoint.x}
                cy={waypoint.y}
                r={12}
                fill="transparent"
                className="nodrag nopan cursor-grab"
                onMouseDown={(event) => startWaypointDrag(event, index)}
              />
            </g>
          ))}
        </g>
      )}
    </>
  );
}
