"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { DeviceNode } from "./device-node";

type SidebarDevice = {
  id: string;
  tag: string;
  name: string;
  model: string;
  placed: boolean;
};

function CanvasInner({
  drawingPageId,
  initialNodes,
  initialEdges,
  devices
}: {
  drawingPageId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  devices: SidebarDevice[];
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { message, setMessage } = useEditorStore();

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), []);
  const placedDeviceIds = new Set(nodes.map((node) => String(node.data.deviceInstanceId)));

  const addDevice = useCallback(
    async (deviceId: string) => {
      const response = await fetch(`/api/drawing-pages/${drawingPageId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceInstanceId: deviceId,
          x: 80 + nodes.length * 48,
          y: 80 + nodes.length * 24
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage("Unable to add device to drawing page.");
        return;
      }
      setNodes((current) => (current.some((node) => node.id === payload.node.id) ? current : [...current, payload.node]));
      setMessage(null);
    },
    [drawingPageId, nodes.length, setMessage, setNodes]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return;
      const response = await fetch(`/api/drawing-pages/${drawingPageId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourcePortId: connection.sourceHandle,
          targetPortId: connection.targetHandle
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.message ?? "Connection rejected.");
        return;
      }

      setEdges((current) => addEdge({ ...payload.edge, type: "default" }, current));
      setMessage(payload.message);
    },
    [drawingPageId, setEdges, setMessage]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        fetch(`/api/drawing-edges/${edge.id}`, { method: "DELETE" }).then((response) => {
          if (!response.ok) {
            setMessage("Unable to remove the cable for the deleted drawing edge.");
            return;
          }
          setMessage("Cable removed from the project schedule.");
        });
      }
    },
    [setMessage]
  );

  const persistNode = useCallback((node: Node) => {
    clearTimeout(saveTimers.current[node.id]);
    saveTimers.current[node.id] = setTimeout(() => {
      fetch(`/api/drawing-nodes/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node.position)
      });
    }, 450);
  }, []);

  return (
    <div className="grid h-[720px] grid-cols-[260px_1fr] overflow-hidden rounded-md border border-neutral-200 bg-white">
      <aside className="border-r border-neutral-200 bg-neutral-50 p-3">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-neutral-950">Project Devices</h3>
        </div>
        <div className="space-y-2">
          {devices.map((device) => {
            const placed = placedDeviceIds.has(device.id);
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => addDevice(device.id)}
                className="w-full rounded-md border border-neutral-200 bg-white p-3 text-left text-sm transition hover:border-neutral-300 hover:bg-neutral-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-950">{device.tag}</span>
                  <Plus className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="mt-1 truncate text-xs text-neutral-500">{device.name} / {device.model}</div>
                <div className="mt-2 text-[11px] uppercase text-neutral-400">{placed ? "On page" : "Not on page"}</div>
              </button>
            );
          })}
          {!devices.length && <p className="text-sm text-neutral-500">Add project equipment before building schematics.</p>}
        </div>
      </aside>
      <section className="relative">
        {message && (
          <div className="absolute left-4 top-4 z-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm">
            {message}
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onNodeDragStop={(_, node) => persistNode(node)}
          fitView
        >
          <Background gap={24} size={1} color="#d4d4d4" />
          <MiniMap pannable zoomable nodeColor="#737373" />
          <Controls />
        </ReactFlow>
      </section>
    </div>
  );
}

export function SchematicCanvas(props: React.ComponentProps<typeof CanvasInner>) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
