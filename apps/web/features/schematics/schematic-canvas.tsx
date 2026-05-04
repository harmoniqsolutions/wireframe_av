"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Maximize2, Minimize2, Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { DeviceNode } from "./device-node";
import { EditableStepEdge } from "./editable-step-edge";

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
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { message, setMessage } = useEditorStore();

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), []);
  const edgeTypes = useMemo(() => ({ editableStep: EditableStepEdge }), []);
  const placedDeviceIds = new Set(nodes.map((node) => String(node.data.deviceInstanceId)));

  const updateEdgeRoute = useCallback(
    async (edgeId: string, route: { routeOffsetX: number; routeOffsetY: number }) => {
      setEdges((current) =>
        current.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                type: "editableStep",
                data: {
                  ...edge.data,
                  ...route
                }
              }
            : edge
        )
      );

      const response = await fetch(`/api/drawing-edges/${edgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(route)
      });

      if (!response.ok) {
        setMessage("Unable to save cable route adjustment.");
        return;
      }

      setMessage("Cable route updated.");
    },
    [setEdges, setMessage]
  );

  const routedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: "editableStep",
        data: {
          routeOffsetX: 0,
          routeOffsetY: 0,
          ...edge.data,
          onRouteChange: updateEdgeRoute
        }
      })),
    [edges, updateEdgeRoute]
  );

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

      setEdges((current) => addEdge({ ...payload.edge, type: "editableStep" }, current));
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

  const toggleFullscreen = useCallback(async () => {
    if (!workspaceRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await workspaceRef.current.requestFullscreen();
  }, []);

  useEffect(() => {
    function updateFullscreenState() {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    }

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  return (
    <div
      ref={workspaceRef}
      className="grid h-full min-h-[520px] grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-md border border-neutral-200 bg-white"
    >
      <aside className="min-h-0 overflow-auto border-r border-neutral-200 bg-neutral-50 p-3">
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
      <section className="relative min-h-0">
        {message && (
          <div className="absolute left-4 top-4 z-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm">
            {message}
          </div>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-10 inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-100"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
        <ReactFlow
          nodes={nodes}
          edges={routedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
