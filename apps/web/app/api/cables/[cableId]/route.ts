import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

export async function PATCH(request: NextRequest, context: { params: Promise<{ cableId: string }> }) {
  await getCurrentContext();
  const { cableId } = await context.params;
  const body = (await request.json()) as {
    cableTypeId?: string | null;
    estimatedLength?: number | null;
    status?: "DESIGNED" | "PULLED" | "TERMINATED" | "TESTED" | "VERIFIED";
    notes?: string | null;
  };

  const cable = await prisma.cable.update({
    where: { id: cableId },
    data: {
      cableTypeId: body.cableTypeId || null,
      estimatedLength: body.estimatedLength ?? null,
      status: body.status ?? "DESIGNED",
      notes: body.notes || null
    }
  });

  return NextResponse.json({ cable });
}
