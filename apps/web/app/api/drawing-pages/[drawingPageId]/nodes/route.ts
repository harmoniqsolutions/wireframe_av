import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@wireframe-av/db";
import { mapDrawingNodeToReactFlow } from "@wireframe-av/diagram/src/diagramMapping";
import { getCurrentContext } from "@/lib/context";

export async function POST(request: NextRequest, context: { params: Promise<{ drawingPageId: string }> }) {
  await getCurrentContext();
  const { drawingPageId } = await context.params;
  const body = (await request.json()) as { deviceInstanceId: string; x?: number; y?: number };

  const include = {
    include: {
      deviceInstance: {
        include: {
          productTemplate: true,
          ports: {
            include: {
              connectorType: true,
              signalType: true
            }
          }
        }
      }
    }
  };

  let node;

  try {
    node = await prisma.drawingNode.create({
      data: {
        drawingPageId,
        deviceInstanceId: body.deviceInstanceId,
        x: body.x ?? 80,
        y: body.y ?? 80
      },
      ...include
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    node = await prisma.drawingNode.findUniqueOrThrow({
      where: {
        drawingPageId_deviceInstanceId: {
          drawingPageId,
          deviceInstanceId: body.deviceInstanceId
        }
      },
      ...include
    });
  }

  return NextResponse.json({ node: mapDrawingNodeToReactFlow(node) });
}
