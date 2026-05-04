import { NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

export async function DELETE(_request: Request, context: { params: Promise<{ drawingEdgeId: string }> }) {
  await getCurrentContext();
  const { drawingEdgeId } = await context.params;
  const edge = await prisma.drawingEdge.findUniqueOrThrow({
    where: { id: drawingEdgeId },
    select: { cableId: true }
  });

  await prisma.cable.delete({ where: { id: edge.cableId } });

  return NextResponse.json({ ok: true });
}
