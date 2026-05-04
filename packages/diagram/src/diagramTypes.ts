import type { PortDirection, PortSide } from "@wireframe-av/shared/src/types";

export type DiagramPort = {
  id: string;
  name: string;
  direction: PortDirection;
  side: PortSide;
  sortOrder: number;
};

export type DiagramDeviceNodeData = {
  deviceInstanceId: string;
  tag: string;
  displayName: string | null;
  productName: string;
  productModel: string;
  ports: DiagramPort[];
};

export type DiagramNode = {
  id: string;
  type: "device";
  position: {
    x: number;
    y: number;
  };
  data: DiagramDeviceNodeData;
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;
};
