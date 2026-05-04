"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createDrawingPage(projectId: string, formData: FormData) {
  await getCurrentContext();
  const count = await prisma.drawingPage.count({ where: { projectId } });
  await prisma.drawingPage.create({
    data: {
      projectId,
      name: String(formData.get("name") ?? "Schematic").trim(),
      type: String(formData.get("type") ?? "GENERAL") as "AUDIO" | "VIDEO" | "CONTROL" | "NETWORK" | "POWER" | "RACK" | "GENERAL",
      sheetNumber: optionalText(formData.get("sheetNumber")),
      sortOrder: count + 1
    }
  });

  revalidatePath(`/projects/${projectId}/schematics`);
}
