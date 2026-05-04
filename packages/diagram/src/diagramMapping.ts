import type { DiagramEdge, DiagramNode, DiagramWaypoint } from "./diagramTypes";

function parseWaypoints(value: unknown): DiagramWaypoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const record = point as Record<string, unknown>;
      const x = Number(record.x);
      const y = Number(record.y);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is DiagramWaypoint => point !== null);
}

type DrawingNodeRecord = {
  id: string;
  x: number;
  y: number;
  deviceInstance: {
    id: string;
    tag: string;
    displayName: string | null;
    productTemplate: {
      name: string;
      model: string;
    };
    ports: Array<{
      id: string;
      name: string;
      connectorType: {
        name: string;
      };
      signalType: {
        name: string;
      };
      direction: "INPUT" | "OUTPUT" | "BIDIRECTIONAL";
      side: "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "FRONT" | "REAR";
      sortOrder: number;
    }>;
  };
};

type DrawingEdgeRecord = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  routeOffsetX: number;
  routeOffsetY: number;
  manualWaypoints: unknown;
  cable: {
    cableNumber: string;
    sourceDevicePortId: string;
    destinationDevicePortId: string;
    sourceDevicePort?: {
      connectorType: {
        name: string;
      };
      signalType: {
        name: string;
      };
    };
  };
};

export function mapDrawingNodeToReactFlow(node: DrawingNodeRecord): DiagramNode {
  return {
    id: node.id,
    type: "device",
    position: {
      x: node.x,
      y: node.y
    },
    data: {
      deviceInstanceId: node.deviceInstance.id,
      tag: node.deviceInstance.tag,
      displayName: node.deviceInstance.displayName,
      productName: node.deviceInstance.productTemplate.name,
      productModel: node.deviceInstance.productTemplate.model,
      ports: node.deviceInstance.ports
        .map((port) => ({
          id: port.id,
          name: port.name,
          connectorTypeName: port.connectorType.name,
          signalTypeName: port.signalType.name,
          direction: port.direction,
          side: port.side,
          sortOrder: port.sortOrder
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
  };
}

export function mapDrawingEdgeToReactFlow(edge: DrawingEdgeRecord): DiagramEdge {
  return {
    id: edge.id,
    type: "editableStep",
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.cable.sourceDevicePortId,
    targetHandle: edge.cable.destinationDevicePortId,
    label: edge.cable.cableNumber,
    data: {
      routeOffsetX: edge.routeOffsetX,
      routeOffsetY: edge.routeOffsetY,
      manualWaypoints: parseWaypoints(edge.manualWaypoints),
      signalTypeName: edge.cable.sourceDevicePort?.signalType.name,
      connectorTypeName: edge.cable.sourceDevicePort?.connectorType.name
    }
  };
}
