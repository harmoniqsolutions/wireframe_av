"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DiagramDeviceNodeData, DiagramPort } from "@wireframe-av/diagram/src/diagramTypes";
import { cn } from "@/lib/utils";

const NODE_WIDTH = 270;
const MIN_NODE_HEIGHT = 132;
const HEADER_HEIGHT = 62;
const PORT_TOP_PADDING = 24;
const PORT_BOTTOM_PADDING = 24;
const SIDE_PORT_SPACING = 26;
const PORT_LABEL_OFFSET = 8;

type PortGroupKey = "LEFT" | "RIGHT" | "TOP" | "BOTTOM";

function positionForSide(side: DiagramPort["side"]) {
  if (side === "LEFT") return Position.Left;
  if (side === "RIGHT") return Position.Right;
  if (side === "TOP") return Position.Top;
  if (side === "BOTTOM") return Position.Bottom;
  return side === "FRONT" ? Position.Left : Position.Right;
}

function groupKeyForSide(side: DiagramPort["side"]): PortGroupKey {
  if (side === "FRONT") return "LEFT";
  if (side === "REAR") return "RIGHT";
  return side;
}

function offset(index: number, count: number) {
  return `${((index + 1) / (count + 1)) * 100}%`;
}

function PortHandle({ port, index, count }: { port: DiagramPort; index: number; count: number }) {
  const position = positionForSide(port.side);
  const isHorizontal = position === Position.Left || position === Position.Right;
  const style = isHorizontal
    ? { top: HEADER_HEIGHT + PORT_TOP_PADDING + index * SIDE_PORT_SPACING }
    : { left: offset(index, count) };
  const canSource = port.direction === "OUTPUT" || port.direction === "BIDIRECTIONAL";
  const canTarget = port.direction === "INPUT" || port.direction === "BIDIRECTIONAL";

  return (
    <>
      {canSource && <Handle id={port.id} type="source" position={position} style={style} />}
      {canTarget && <Handle id={port.id} type="target" position={position} style={style} />}
    </>
  );
}

function PortLabel({ port, index, count }: { port: DiagramPort; index: number; count: number }) {
  const position = positionForSide(port.side);
  const style =
    position === Position.Left || position === Position.Right
      ? { top: HEADER_HEIGHT + PORT_TOP_PADDING + index * SIDE_PORT_SPACING - PORT_LABEL_OFFSET }
      : { left: `calc(${offset(index, count)} - 36px)` };

  return (
    <div
      className={cn(
        "pointer-events-none absolute max-w-[92px] truncate text-[10px] leading-4 text-neutral-700",
        position === Position.Left && "left-3 text-left",
        position === Position.Right && "right-3 text-right",
        position === Position.Top && "top-2 w-20 text-center",
        position === Position.Bottom && "bottom-2 w-20 text-center"
      )}
      style={style}
      title={port.name}
    >
      {port.name}
    </div>
  );
}

export function DeviceNode({ data, selected }: NodeProps) {
  const nodeData = data as DiagramDeviceNodeData;
  const allPorts = nodeData.ports ?? [];
  const ports = allPorts.filter((port) => port.side !== "TOP" && port.side !== "BOTTOM");
  const grouped = {
    LEFT: ports.filter((port) => port.side === "LEFT" || port.side === "FRONT"),
    RIGHT: ports.filter((port) => port.side === "RIGHT" || port.side === "REAR"),
    TOP: [],
    BOTTOM: []
  };
  const verticalPortCount = Math.max(grouped.LEFT.length, grouped.RIGHT.length);
  const verticalPortHeight =
    verticalPortCount > 0
      ? PORT_TOP_PADDING + (verticalPortCount - 1) * SIDE_PORT_SPACING + PORT_BOTTOM_PADDING
      : 0;
  const nodeHeight = Math.max(MIN_NODE_HEIGHT, HEADER_HEIGHT + verticalPortHeight);

  return (
    <div
      className={cn(
        "relative border bg-white shadow-sm",
        selected ? "border-neutral-950" : "border-neutral-400"
      )}
      style={{ width: NODE_WIDTH, minHeight: nodeHeight }}
    >
      <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3 text-center" style={{ height: HEADER_HEIGHT }}>
        <div className="text-sm font-bold text-neutral-950">{nodeData.tag}</div>
        <div className="mt-0.5 truncate text-xs text-neutral-600">
          {nodeData.displayName ?? `${nodeData.productName} ${nodeData.productModel}`}
        </div>
      </div>
      <div className="px-4 py-8 text-center text-[11px] uppercase text-neutral-500">
        {nodeData.productModel}
      </div>
      {ports.map((port) => {
        const list = grouped[groupKeyForSide(port.side)] ?? [];
        const index = list.findIndex((item) => item.id === port.id);
        return <PortHandle key={`${port.id}-handle`} port={port} index={index} count={list.length} />;
      })}
      {ports.map((port) => {
        const list = grouped[groupKeyForSide(port.side)] ?? [];
        const index = list.findIndex((item) => item.id === port.id);
        return <PortLabel key={`${port.id}-label`} port={port} index={index} count={list.length} />;
      })}
    </div>
  );
}
