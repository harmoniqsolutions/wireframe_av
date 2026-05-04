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

function inferCableTypeName(connectorName: string, signalName: string) {
  if (connectorName === "RJ45" && (signalName === "Network Data" || signalName === "Dante/AES67" || signalName === "AV-over-IP")) return "CAT6A";
  if (connectorName === "HDMI Type A" && signalName === "HDMI Video") return "HDMI";
  if (connectorName === "BNC" && signalName === "SDI Video") return "SDI Coax";
  if ((connectorName === "3-pin Euroblock" || connectorName === "XLR 3-pin") && signalName === "Analog Audio Balanced") {
    return "Balanced Audio Cable";
  }
  if ((connectorName === "NL2" || connectorName === "NL4") && signalName === "Speaker Level Audio") return "Speaker Cable 12/2";
  if ((connectorName === "USB-A" || connectorName === "USB-B" || connectorName === "USB-C") && signalName === "USB") return "USB Cable";
  if ((connectorName === "LC Fiber" || connectorName === "SC Fiber" || connectorName === "ST Fiber") && signalName === "Fiber") return "Duplex Fiber";
  if ((connectorName === "IEC C14" || connectorName === "NEMA 5-15") && signalName === "AC Power") return "AC Power Cable";
  return null;
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
  const inferredCableTypeName = inferCableTypeName(normalized.sourcePort.connectorType.name, normalized.sourcePort.signalType.name);
  const inferredCableType = inferredCableTypeName
    ? await prisma.cableType.findUnique({ where: { name: inferredCableTypeName }, select: { id: true } })
    : null;

  const existingCable = await prisma.cable.findFirst({
    where: {
      projectId: page.projectId,
      sourceDevicePortId: normalized.sourcePort.id,
      destinationDevicePortId: normalized.destinationPort.id
    },
    select: { cableNumber: true }
  });

  if (existingCable) {
    return NextResponse.json(
      {
        allowed: false,
        severity: "error",
        message: `Connection already exists as ${existingCable.cableNumber}.`
      },
      { status: 400 }
    );
  }

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
        cableTypeId: inferredCableType?.id,
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
    severity: result.severity,
    message: result.severity === "warning" ? `Cable created with warning. ${result.message}` : "Cable created.",
    edge: mapDrawingEdgeToReactFlow(edge)
  });
}
