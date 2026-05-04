"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackgroundVariant,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node
} from "@xyflow/react";
import { CirclePlus, Focus, Maximize2, Minimize2, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { DeviceNode } from "./device-node";
import { EditableStepEdge } from "./editable-step-edge";
import {
  buildOrthogonalRoutePoints,
  projectOntoSegments,
  snapToGrid,
  type RoutePoint
} from "./routing-utils";

type SidebarDevice = {
  id: string;
  tag: string;
  name: string;
  model: string;
  placed: boolean;
};

type ContextMenu =
  | {
      kind: "node";
      nodeId: string;
      label: string;
      x: number;
      y: number;
    }
  | {
      kind: "edge";
      edgeId: string;
      label: string;
      x: number;
      y: number;
      flowX: number;
      flowY: number;
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
  const { fitView, getInternalNode, screenToFlowPosition } = useReactFlow();
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const { message, setMessage: setRawMessage } = useEditorStore();

  const setMessage = useCallback(
    (msg: string | null) => {
      setRawMessage(msg);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (msg !== null) {
        dismissTimer.current = setTimeout(() => setRawMessage(null), 3000);
      }
    },
    [setRawMessage]
  );

  const nodeTypes = useMemo(() => ({ device: DeviceNode }), []);
  const edgeTypes = useMemo(() => ({ editableStep: EditableStepEdge }), []);
  const placedDeviceIds = new Set(nodes.map((node) => String(node.data.deviceInstanceId)));
  const filteredDevices = useMemo(() => {
    const query = deviceSearch.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((device) =>
      [device.tag, device.name, device.model].some((value) => value.toLowerCase().includes(query))
    );
  }, [deviceSearch, devices]);

  const updateEdgeRoute = useCallback(
    async (edgeId: string, route: { routeOffsetX: number; routeOffsetY: number; manualWaypoints?: RoutePoint[] }) => {
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

  const getEdgeRoutePoints = useCallback(
    (edge: Edge) => {
      const sourceInternal = getInternalNode(edge.source);
      const targetInternal = getInternalNode(edge.target);
      const sourceBounds = sourceInternal?.internals.handleBounds;
      const targetBounds = targetInternal?.internals.handleBounds;
      const sourceHandle = [...(sourceBounds?.source ?? []), ...(sourceBounds?.target ?? [])].find(
        (handle) => handle.id === edge.sourceHandle
      );
      const targetHandle = [...(targetBounds?.source ?? []), ...(targetBounds?.target ?? [])].find(
        (handle) => handle.id === edge.targetHandle
      );

      if (!sourceInternal || !targetInternal || !sourceHandle || !targetHandle) return null;

      const edgeData = (edge.data ?? {}) as {
        routeOffsetX?: number;
        routeOffsetY?: number;
        manualWaypoints?: RoutePoint[];
      };

      return buildOrthogonalRoutePoints({
        source: {
          x: Math.round(sourceInternal.internals.positionAbsolute.x + sourceHandle.x + sourceHandle.width / 2),
          y: Math.round(sourceInternal.internals.positionAbsolute.y + sourceHandle.y + sourceHandle.height / 2)
        },
        target: {
          x: Math.round(targetInternal.internals.positionAbsolute.x + targetHandle.x + targetHandle.width / 2),
          y: Math.round(targetInternal.internals.positionAbsolute.y + targetHandle.y + targetHandle.height / 2)
        },
        routeOffset: {
          x: edgeData.routeOffsetX ?? 0,
          y: edgeData.routeOffsetY ?? 0
        },
        sourcePosition: sourceHandle.position,
        targetPosition: targetHandle.position,
        manualWaypoints: edgeData.manualWaypoints ?? []
      });
    },
    [getInternalNode]
  );

  const addRouteHandle = useCallback(
    async (edgeId: string, flowPoint: RoutePoint) => {
      const edge = edges.find((item) => item.id === edgeId);
      if (!edge) return;

      const routePoints = getEdgeRoutePoints(edge);
      if (!routePoints) {
        setContextMenu(null);
        setMessage("Unable to add a route handle until the cable is measured on the canvas.");
        return;
      }

      const edgeData = (edge.data ?? {}) as { manualWaypoints?: RoutePoint[] };
      const existingWaypoints = edgeData.manualWaypoints ?? [];
      const projected = projectOntoSegments(flowPoint, routePoints);
      const start = routePoints[projected.segmentIndex];
      const end = routePoints[projected.segmentIndex + 1];
      const nextWaypoint =
        start && end && start.y === end.y
          ? { x: snapToGrid(projected.point.x), y: start.y }
          : start && end && start.x === end.x
            ? { x: start.x, y: snapToGrid(projected.point.y) }
            : { x: snapToGrid(projected.point.x), y: snapToGrid(projected.point.y) };

      const existingSegmentIndexes = existingWaypoints.map((waypoint) => projectOntoSegments(waypoint, routePoints).segmentIndex);
      let insertIndex = existingWaypoints.length;
      for (let index = 0; index < existingSegmentIndexes.length; index += 1) {
        if (projected.segmentIndex <= existingSegmentIndexes[index]) {
          insertIndex = index;
          break;
        }
      }

      const manualWaypoints = [...existingWaypoints];
      manualWaypoints.splice(insertIndex, 0, nextWaypoint);
      await updateEdgeRoute(edgeId, { routeOffsetX: 0, routeOffsetY: 0, manualWaypoints });
      setContextMenu(null);
    },
    [edges, getEdgeRoutePoints, setMessage, updateEdgeRoute]
  );

  const removeNearestRouteHandle = useCallback(
    async (edgeId: string, flowPoint: RoutePoint) => {
      const edge = edges.find((item) => item.id === edgeId);
      const edgeData = (edge?.data ?? {}) as { manualWaypoints?: RoutePoint[] };
      const manualWaypoints = edgeData.manualWaypoints ?? [];
      if (!manualWaypoints.length) {
        setContextMenu(null);
        return;
      }

      let nearestIndex = 0;
      let nearestDistance = Infinity;
      for (let index = 0; index < manualWaypoints.length; index += 1) {
        const point = manualWaypoints[index];
        const distance = Math.abs(point.x - flowPoint.x) + Math.abs(point.y - flowPoint.y);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      }

      const nextWaypoints = manualWaypoints.filter((_, index) => index !== nearestIndex);
      await updateEdgeRoute(edgeId, { routeOffsetX: 0, routeOffsetY: 0, manualWaypoints: nextWaypoints });
      setContextMenu(null);
    },
    [edges, updateEdgeRoute]
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

  useEffect(() => {
    Object.values(saveTimers.current).forEach((timer) => clearTimeout(timer));
    saveTimers.current = {};
    setNodes(initialNodes);
    setEdges(initialEdges);
    setContextMenu(null);
    setMessage(null);
  }, [drawingPageId, initialEdges, initialNodes, setEdges, setMessage, setNodes]);

  const addDevice = useCallback(
    async (deviceId: string) => {
      const response = await fetch(`/api/drawing-pages/${drawingPageId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceInstanceId: deviceId,
          x: 80 + nodes.length * 40,
          y: 80 + nodes.length * 20
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

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      const response = await fetch(`/api/drawing-edges/${edgeId}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Unable to remove the cable for the deleted drawing edge.");
        return;
      }
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      setContextMenu(null);
      setMessage("Cable removed from the project schedule.");
    },
    [setEdges, setMessage]
  );

  const resetConnectedRoutes = useCallback(
    async (nodeId: string) => {
      const connectedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
      if (!connectedEdges.length) {
        setContextMenu(null);
        setMessage("No connected cable routes to reset.");
        return;
      }

      setEdges((current) =>
        current.map((edge) =>
          connectedEdges.some((connectedEdge) => connectedEdge.id === edge.id)
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  routeOffsetX: 0,
                  routeOffsetY: 0,
                  manualWaypoints: []
                }
              }
            : edge
        )
      );

      const results = await Promise.all(
        connectedEdges.map((edge) =>
          fetch(`/api/drawing-edges/${edge.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routeOffsetX: 0, routeOffsetY: 0, manualWaypoints: [] })
          })
        )
      );

      setContextMenu(null);
      setMessage(results.every((response) => response.ok) ? "Connected cable routes reset." : "Some cable routes could not be reset.");
    },
    [edges, setEdges, setMessage]
  );

  const removeNodeFromPage = useCallback(
    async (nodeId: string) => {
      const response = await fetch(`/api/drawing-nodes/${nodeId}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Unable to remove device from schematic page.");
        return;
      }

      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setContextMenu(null);
      setMessage("Device removed from page. Connected page cables were removed.");
    },
    [setEdges, setMessage, setNodes]
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

  const fitDrawing = useCallback(() => {
    setContextMenu(null);
    window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 250 }));
  }, [fitView]);

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
        <label className="mb-3 flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-500">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={deviceSearch}
            onChange={(event) => setDeviceSearch(event.target.value)}
            placeholder="Search devices"
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </label>
        <div className="space-y-2">
          {filteredDevices.map((device) => {
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
          {devices.length > 0 && !filteredDevices.length && (
            <p className="text-sm text-neutral-500">No project devices match this search.</p>
          )}
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
          onPaneClick={() => setContextMenu(null)}
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            const nodeData = node.data as { tag?: string; displayName?: string | null; productName?: string; productModel?: string };
            setContextMenu({
              kind: "node",
              nodeId: node.id,
              label: nodeData.tag ?? nodeData.displayName ?? nodeData.productName ?? "Device",
              x: event.clientX,
              y: event.clientY
            });
          }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault();
            const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            setContextMenu({
              kind: "edge",
              edgeId: edge.id,
              label: String(edge.label ?? "Cable"),
              x: event.clientX,
              y: event.clientY,
              flowX: flowPosition.x,
              flowY: flowPosition.y
            });
          }}
          onNodeDragStop={(_, node) => persistNode(node)}
          connectionMode={ConnectionMode.Loose}
          connectOnClick
          connectionRadius={28}
          defaultEdgeOptions={{ type: "editableStep", interactionWidth: 18 }}
          fitView
          proOptions={{ hideAttribution: true }}
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
          <MiniMap pannable zoomable nodeColor="#737373" />
          <Controls />
        </ReactFlow>
        {contextMenu && (
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="border-b border-neutral-100 px-3 py-2 text-xs font-semibold uppercase text-neutral-500">
              {contextMenu.label}
            </div>
            {contextMenu.kind === "edge" ? (
              <>
                <button
                  type="button"
                  onClick={() => addRouteHandle(contextMenu.edgeId, { x: contextMenu.flowX, y: contextMenu.flowY })}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                >
                  <CirclePlus className="h-4 w-4" />
                  Add route handle
                </button>
                {(((edges.find((edge) => edge.id === contextMenu.edgeId)?.data ?? {}) as { manualWaypoints?: RoutePoint[] }).manualWaypoints?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => removeNearestRouteHandle(contextMenu.edgeId, { x: contextMenu.flowX, y: contextMenu.flowY })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove nearest handle
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updateEdgeRoute(contextMenu.edgeId, { routeOffsetX: 0, routeOffsetY: 0, manualWaypoints: [] }).then(() => setContextMenu(null))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset route
                </button>
                <button
                  type="button"
                  onClick={() => deleteEdge(contextMenu.edgeId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete cable
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => resetConnectedRoutes(contextMenu.nodeId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset connected routes
                </button>
                <button
                  type="button"
                  onClick={fitDrawing}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-100"
                >
                  <Focus className="h-4 w-4" />
                  Fit drawing
                </button>
                <button
                  type="button"
                  onClick={() => removeNodeFromPage(contextMenu.nodeId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove from page
                </button>
              </>
            )}
          </div>
        )}
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
