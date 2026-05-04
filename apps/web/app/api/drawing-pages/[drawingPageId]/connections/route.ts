import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { mapDrawingEdgeToReactFlow } from "@wireframe-av/diagram/src/diagramMapping";
import { validateConnection } from "@wireframe-av/validation/src/connectionValidation";
import { nextCableNumber } from "@/lib/cable-number";
import { getCurrentContext } from "@/lib/context";

type ConnectionBody = {
  sourceNodeId: string;
  targetNodeId: string;
  sourcePortId: string;
  targetPortId: string;
};

function normalizeCableEndpoints<T extends { direction: string }>(sourcePort: T, targetPort: T) {
  if (sourcePort.direction === "INPUT" && targetPort.direction === "OUTPUT") {
    return { sourcePort: targetPort, destinationPort: sourcePort, reversed: true };
  }

  if (sourcePort.direction === "BIDIRECTIONAL" && targetPort.direction === "OUTPUT") {
    return { sourcePort: targetPort, destinationPort: sourcePort, reversed: true };
  }

  return { sourcePort, destinationPort: targetPort, reversed: false };
}

export async function POST(request: NextRequest, context: { params: Promise<{ drawingPageId: string }> }) {
  await getCurrentContext();
  const { drawingPageId } = await context.params;
  const body = (await request.json()) as ConnectionBody;

  const [page, sourcePort, targetPort] = await Promise.all([
    prisma.drawingPage.findUniqueOrThrow({ where: { id: drawingPageId } }),
    prisma.devicePortInstance.findUniqueOrThrow({
      where: { id: body.sourcePortId },
      include: { connectorType: true, signalType: true, deviceInstance: true }
    }),
    prisma.devicePortInstance.findUniqueOrThrow({
      where: { id: body.targetPortId },
      include: { connectorType: true, signalType: true, deviceInstance: true }
    })
  ]);

  const result = validateConnection({
    sourcePort: {
      id: sourcePort.id,
      deviceInstanceId: sourcePort.deviceInstanceId,
      name: sourcePort.name,
      connectorTypeId: sourcePort.connectorTypeId,
      connectorTypeName: sourcePort.connectorType.name,
      signalTypeId: sourcePort.signalTypeId,
      signalTypeName: sourcePort.signalType.name,
      direction: sourcePort.direction
    },
    targetPort: {
      id: targetPort.id,
      deviceInstanceId: targetPort.deviceInstanceId,
      name: targetPort.name,
      connectorTypeId: targetPort.connectorTypeId,
      connectorTypeName: targetPort.connectorType.name,
      signalTypeId: targetPort.signalTypeId,
      signalTypeName: targetPort.signalType.name,
      direction: targetPort.direction
    }
  });

  if (!result.allowed) {
    return NextResponse.json(result, { status: 400 });
  }

  const normalized = normalizeCableEndpoints(sourcePort, targetPort);
  const sourceNodeId = normalized.reversed ? body.targetNodeId : body.sourceNodeId;
  const targetNodeId = normalized.reversed ? body.sourceNodeId : body.targetNodeId;

  const edge = await prisma.$transaction(async (tx) => {
    const existingNumbers = await tx.cable.findMany({
      where: { projectId: page.projectId },
      select: { cableNumber: true }
    });

    const cable = await tx.cable.create({
      data: {
        projectId: page.projectId,
        cableNumber: nextCableNumber(existingNumbers.map((item) => item.cableNumber)),
        sourceDevicePortId: normalized.sourcePort.id,
        destinationDevicePortId: normalized.destinationPort.id,
        connectorAId: normalized.sourcePort.connectorTypeId,
        connectorBId: normalized.destinationPort.connectorTypeId,
        fromLocationId: normalized.sourcePort.deviceInstance.locationId,
        toLocationId: normalized.destinationPort.deviceInstance.locationId,
        status: "DESIGNED"
      }
    });

    return tx.drawingEdge.create({
      data: {
        drawingPageId,
        cableId: cable.id,
        sourceNodeId,
        targetNodeId
      },
      include: {
        cable: true
      }
    });
  });

  return NextResponse.json({
    allowed: true,
    severity: "success",
    message: "Cable created.",
    edge: mapDrawingEdgeToReactFlow(edge)
  });
}
