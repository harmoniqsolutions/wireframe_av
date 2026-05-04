import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

export async function PATCH(request: NextRequest, context: { params: Promise<{ drawingEdgeId: string }> }) {
  await getCurrentContext();
  const { drawingEdgeId } = await context.params;
  const body = (await request.json()) as { routeOffsetX?: number; routeOffsetY?: number };

  const edge = await prisma.drawingEdge.update({
    where: { id: drawingEdgeId },
    data: {
      routeOffsetX: Number.isFinite(body.routeOffsetX) ? body.routeOffsetX : 0,
      routeOffsetY: Number.isFinite(body.routeOffsetY) ? body.routeOffsetY : 0
    },
    select: {
      id: true,
      routeOffsetX: true,
      routeOffsetY: true
    }
  });

  return NextResponse.json({ edge });
}

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
