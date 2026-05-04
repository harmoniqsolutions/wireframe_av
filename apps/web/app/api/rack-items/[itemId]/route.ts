import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function hasOverlap(aStart: number, aHeight: number, bStart: number, bHeight: number): boolean {
  return aStart <= bStart + bHeight - 1 && bStart <= aStart + aHeight - 1;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  await getCurrentContext();
  const { itemId } = await params;
  const body = await request.json();
  const { startRu, side } = body as { startRu: number; side?: "FRONT" | "REAR" };

  const existing = await prisma.rackMountedItem.findUniqueOrThrow({ where: { id: itemId } });
  const effectiveSide = side ?? existing.side;

  const siblings = await prisma.rackMountedItem.findMany({
    where: { rackId: existing.rackId, side: effectiveSide, NOT: { id: itemId } }
  });

  const conflict = siblings.some((item) => hasOverlap(startRu, existing.heightRu, item.startRu, item.heightRu));
  if (conflict) {
    return NextResponse.json({ error: "Overlap with existing item" }, { status: 409 });
  }

  const updated = await prisma.rackMountedItem.update({
    where: { id: itemId },
    data: { startRu, side: effectiveSide },
    include: {
      deviceInstance: { include: { productTemplate: true } }
    }
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  await getCurrentContext();
  const { itemId } = await params;
  await prisma.rackMountedItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
