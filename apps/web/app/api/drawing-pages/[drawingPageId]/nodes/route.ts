import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { mapDrawingNodeToReactFlow } from "@wireframe-av/diagram/src/diagramMapping";
import { getCurrentContext } from "@/lib/context";

export async function POST(request: NextRequest, context: { params: Promise<{ drawingPageId: string }> }) {
  await getCurrentContext();
  const { drawingPageId } = await context.params;
  const body = (await request.json()) as { deviceInstanceId: string; x?: number; y?: number };

  const node = await prisma.drawingNode.upsert({
    where: {
      drawingPageId_deviceInstanceId: {
        drawingPageId,
        deviceInstanceId: body.deviceInstanceId
      }
    },
    update: {},
    create: {
      drawingPageId,
      deviceInstanceId: body.deviceInstanceId,
      x: body.x ?? 80,
      y: body.y ?? 80
    },
    include: {
      deviceInstance: {
        include: {
          productTemplate: true,
          ports: true
        }
      }
    }
  });

  return NextResponse.json({ node: mapDrawingNodeToReactFlow(node) });
}
