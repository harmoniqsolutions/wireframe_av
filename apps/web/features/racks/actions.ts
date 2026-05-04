"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createRack(projectId: string, formData: FormData) {
  await getCurrentContext();
  const name = String(formData.get("name") ?? "Rack").trim();
  const heightRu = parseInt(String(formData.get("heightRu") ?? "42"), 10) || 42;
  const numberingDirection = String(formData.get("numberingDirection") ?? "BOTTOM_UP") as "BOTTOM_UP" | "TOP_DOWN";
  const locationId = optionalText(formData.get("locationId"));

  await prisma.rack.create({
    data: {
      projectId,
      name,
      heightRu,
      numberingDirection,
      locationId
    }
  });

  revalidatePath(`/projects/${projectId}/racks`);
}

export async function deleteRack(projectId: string, rackId: string) {
  await getCurrentContext();
  await prisma.rack.delete({ where: { id: rackId } });
  revalidatePath(`/projects/${projectId}/racks`);
}
