"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? Number(text) : null;
}

export async function updateCable(projectId: string, cableId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.cable.update({
    where: { id: cableId },
    data: {
      cableTypeId: optionalText(formData.get("cableTypeId")),
      estimatedLength: optionalNumber(formData.get("estimatedLength")),
      status: String(formData.get("status") ?? "DESIGNED") as "DESIGNED" | "PULLED" | "TERMINATED" | "TESTED" | "VERIFIED",
      notes: optionalText(formData.get("notes"))
    }
  });

  revalidatePath(`/projects/${projectId}/cables`);
  revalidatePath(`/projects/${projectId}/schematics`);
}
