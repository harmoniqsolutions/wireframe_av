"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createProject(formData: FormData) {
  const context = await getCurrentContext();
  const project = await prisma.project.create({
    data: {
      organizationId: context.organizationId,
      name: String(formData.get("name") ?? "Untitled Project").trim(),
      clientName: optionalText(formData.get("clientName")),
      projectNumber: optionalText(formData.get("projectNumber")),
      description: optionalText(formData.get("description"))
    }
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: String(formData.get("name") ?? "Untitled Project").trim(),
      clientName: optionalText(formData.get("clientName")),
      projectNumber: optionalText(formData.get("projectNumber")),
      description: optionalText(formData.get("description")),
      status: String(formData.get("status") ?? "DRAFT") as "DRAFT" | "ACTIVE" | "ARCHIVED"
    }
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createLocation(projectId: string, formData: FormData) {
  await getCurrentContext();
  const count = await prisma.projectLocation.count({ where: { projectId } });
  await prisma.projectLocation.create({
    data: {
      projectId,
      name: String(formData.get("name") ?? "Location").trim(),
      description: optionalText(formData.get("description")),
      sortOrder: count + 1
    }
  });

  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/equipment`);
}
