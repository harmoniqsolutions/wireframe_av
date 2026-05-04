import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function parseManualWaypoints(value: unknown): Prisma.InputJsonValue | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const record = point as Record<string, unknown>;
      const x = Number(record.x);
      const y = Number(record.y);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is { x: number; y: number } => point !== null);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ drawingEdgeId: string }> }) {
  await getCurrentContext();
  const { drawingEdgeId } = await context.params;
  const body = (await request.json()) as { routeOffsetX?: number; routeOffsetY?: number; manualWaypoints?: unknown };
  const manualWaypoints = parseManualWaypoints(body.manualWaypoints);

  const edge = await prisma.drawingEdge.update({
    where: { id: drawingEdgeId },
    data: {
      routeOffsetX: Number.isFinite(body.routeOffsetX) ? body.routeOffsetX : 0,
      routeOffsetY: Number.isFinite(body.routeOffsetY) ? body.routeOffsetY : 0,
      ...(manualWaypoints !== undefined ? { manualWaypoints } : {})
    },
    select: {
      id: true,
      routeOffsetX: true,
      routeOffsetY: true,
      manualWaypoints: true
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
