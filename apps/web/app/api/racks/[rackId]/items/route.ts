import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function hasOverlap(aStart: number, aHeight: number, bStart: number, bHeight: number): boolean {
  return aStart <= bStart + bHeight - 1 && bStart <= aStart + aHeight - 1;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ rackId: string }> }) {
  await getCurrentContext();
  const { rackId } = await params;
  const body = await request.json();
  const { deviceInstanceId, startRu, heightRu, side } = body as {
    deviceInstanceId: string;
    startRu: number;
    heightRu: number;
    side: "FRONT" | "REAR";
  };

  const existingItems = await prisma.rackMountedItem.findMany({
    where: { rackId, side }
  });

  const conflict = existingItems.some((item) => hasOverlap(startRu, heightRu, item.startRu, item.heightRu));
  if (conflict) {
    return NextResponse.json({ error: "Overlap with existing item" }, { status: 409 });
  }

  const item = await prisma.rackMountedItem.create({
    data: { rackId, deviceInstanceId, startRu, heightRu, side },
    include: {
      deviceInstance: { include: { productTemplate: true } }
    }
  });

  return NextResponse.json({ item });
}
