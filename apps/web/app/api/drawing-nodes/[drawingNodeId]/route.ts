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
