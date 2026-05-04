import type { DiagramEdge, DiagramNode } from "./diagramTypes";

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
  cable: {
    cableNumber: string;
    sourceDevicePortId: string;
    destinationDevicePortId: string;
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
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.cable.sourceDevicePortId,
    targetHandle: edge.cable.destinationDevicePortId,
    label: edge.cable.cableNumber
  };
}
