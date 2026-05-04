import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

export async function PATCH(request: NextRequest, context: { params: Promise<{ drawingNodeId: string }> }) {
  await getCurrentContext();
  const { drawingNodeId } = await context.params;
  const body = (await request.json()) as { x: number; y: number };

  await prisma.drawingNode.update({
    where: { id: drawingNodeId },
    data: { x: body.x, y: body.y }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ drawingNodeId: string }> }) {
  await getCurrentContext();
  const { drawingNodeId } = await context.params;

  await prisma.$transaction(async (tx) => {
    const edges = await tx.drawingEdge.findMany({
      where: {
        OR: [{ sourceNodeId: drawingNodeId }, { targetNodeId: drawingNodeId }]
      },
      select: { cableId: true }
    });

    await tx.cable.deleteMany({
      where: {
        id: {
          in: edges.map((edge) => edge.cableId)
        }
      }
    });

    await tx.drawingNode.delete({ where: { id: drawingNodeId } });
  });

  return NextResponse.json({ ok: true });
}
