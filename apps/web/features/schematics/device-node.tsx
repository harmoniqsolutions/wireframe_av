"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DiagramDeviceNodeData, DiagramPort } from "@wireframe-av/diagram/src/diagramTypes";
import { cn } from "@/lib/utils";

function positionForSide(side: DiagramPort["side"]) {
  if (side === "LEFT") return Position.Left;
  if (side === "RIGHT") return Position.Right;
  if (side === "TOP") return Position.Top;
  if (side === "BOTTOM") return Position.Bottom;
  return side === "FRONT" ? Position.Left : Position.Right;
}

function offset(index: number, count: number) {
  return `${((index + 1) / (count + 1)) * 100}%`;
}

function PortHandle({ port, index, count }: { port: DiagramPort; index: number; count: number }) {
  const position = positionForSide(port.side);
  const isHorizontal = position === Position.Left || position === Position.Right;
  const style = isHorizontal ? { top: offset(index, count) } : { left: offset(index, count) };
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
      ? { top: `calc(${offset(index, count)} - 9px)` }
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
  const ports = nodeData.ports ?? [];
  const grouped = {
    LEFT: ports.filter((port) => port.side === "LEFT" || port.side === "FRONT"),
    RIGHT: ports.filter((port) => port.side === "RIGHT" || port.side === "REAR"),
    TOP: ports.filter((port) => port.side === "TOP"),
    BOTTOM: ports.filter((port) => port.side === "BOTTOM")
  };

  return (
    <div
      className={cn(
        "relative min-h-[132px] w-[270px] border bg-white shadow-sm",
        selected ? "border-neutral-950" : "border-neutral-400"
      )}
    >
      <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3 text-center">
        <div className="text-sm font-bold text-neutral-950">{nodeData.tag}</div>
        <div className="mt-0.5 truncate text-xs text-neutral-600">
          {nodeData.displayName ?? `${nodeData.productName} ${nodeData.productModel}`}
        </div>
      </div>
      <div className="px-4 py-8 text-center text-[11px] uppercase text-neutral-500">
        {nodeData.productModel}
      </div>
      {ports.map((port) => {
        const list = grouped[port.side === "FRONT" ? "LEFT" : port.side === "REAR" ? "RIGHT" : (port.side as keyof typeof grouped)] ?? [];
        const index = list.findIndex((item) => item.id === port.id);
        return <PortHandle key={`${port.id}-handle`} port={port} index={index} count={list.length} />;
      })}
      {ports.map((port) => {
        const list = grouped[port.side === "FRONT" ? "LEFT" : port.side === "REAR" ? "RIGHT" : (port.side as keyof typeof grouped)] ?? [];
        const index = list.findIndex((item) => item.id === port.id);
        return <PortLabel key={`${port.id}-label`} port={port} index={index} count={list.length} />;
      })}
    </div>
  );
}
