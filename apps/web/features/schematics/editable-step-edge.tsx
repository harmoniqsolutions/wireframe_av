"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from "@xyflow/react";

type EditableStepEdgeData = {
  routeOffsetX?: number;
  routeOffsetY?: number;
  onRouteChange?: (edgeId: string, route: { routeOffsetX: number; routeOffsetY: number }) => void;
};

type Point = {
  x: number;
  y: number;
};

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundedOrthogonalPath(points: Point[], radius = 18) {
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

function orthogonalPoints(source: Point, target: Point, routeOffset: Point) {
  const midX = (source.x + target.x) / 2 + routeOffset.x;
  const midY = (source.y + target.y) / 2 + routeOffset.y;

  return [
    source,
    { x: midX, y: source.y },
    { x: midX, y: midY },
    { x: target.x, y: midY },
    target
  ];
}

export function EditableStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  markerEnd,
  label,
  data
}: EdgeProps) {
  const edgeData = useMemo(() => (data ?? {}) as EditableStepEdgeData, [data]);
  const { screenToFlowPosition } = useReactFlow();
  const [routeOffset, setRouteOffset] = useState({
    x: edgeData.routeOffsetX ?? 0,
    y: edgeData.routeOffsetY ?? 0
  });
  const routeOffsetRef = useRef(routeOffset);

  useEffect(() => {
    const nextRouteOffset = {
      x: edgeData.routeOffsetX ?? 0,
      y: edgeData.routeOffsetY ?? 0
    };
    setRouteOffset(nextRouteOffset);
    routeOffsetRef.current = nextRouteOffset;
  }, [edgeData.routeOffsetX, edgeData.routeOffsetY]);

  const source = useMemo(() => ({ x: sourceX, y: sourceY }), [sourceX, sourceY]);
  const target = useMemo(() => ({ x: targetX, y: targetY }), [targetX, targetY]);
  const controlPoint = useMemo(
    () => ({
      x: (sourceX + targetX) / 2 + routeOffset.x,
      y: (sourceY + targetY) / 2 + routeOffset.y
    }),
    [routeOffset.x, routeOffset.y, sourceX, sourceY, targetX, targetY]
  );

  const edgePath = useMemo(
    () => roundedOrthogonalPath(orthogonalPoints(source, target, routeOffset), 18),
    [routeOffset, source, target]
  );

  const fallbackPath = useMemo(
    () => getBezierPath({ sourceX, sourceY, targetX, targetY })[0],
    [sourceX, sourceY, targetX, targetY]
  );

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const startPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const startOffset = routeOffsetRef.current;

      function move(moveEvent: PointerEvent) {
        const currentPosition = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        const nextOffset = {
          x: startOffset.x + currentPosition.x - startPosition.x,
          y: startOffset.y + currentPosition.y - startPosition.y
        };
        routeOffsetRef.current = nextOffset;
        setRouteOffset(nextOffset);
      }

      function stop() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        edgeData.onRouteChange?.(id, {
          routeOffsetX: routeOffsetRef.current.x,
          routeOffsetY: routeOffsetRef.current.y
        });
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    },
    [edgeData, id, screenToFlowPosition]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath || fallbackPath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#171717" : "#525252",
          strokeWidth: selected ? 2.5 : 1.75
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${controlPoint.x}px, ${controlPoint.y - 22}px)`,
            pointerEvents: "all"
          }}
        >
          {label}
        </div>
        <button
          type="button"
          onPointerDown={startDrag}
          className="nodrag nopan absolute h-4 w-4 rounded-sm border border-neutral-700 bg-white shadow-sm transition hover:bg-neutral-100"
          style={{
            transform: `translate(-50%, -50%) translate(${controlPoint.x}px, ${controlPoint.y}px)`,
            pointerEvents: "all"
          }}
          aria-label={`Adjust route for ${label ?? "cable"}`}
          title="Drag to adjust cable route"
        />
      </EdgeLabelRenderer>
    </>
  );
}
