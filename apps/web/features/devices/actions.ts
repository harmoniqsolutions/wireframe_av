"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function addDeviceInstanceToProject(projectId: string, formData: FormData) {
  await getCurrentContext();
  const productTemplateId = String(formData.get("productTemplateId"));
  const template = await prisma.productTemplate.findUniqueOrThrow({
    where: { id: productTemplateId },
    include: { ports: true }
  });

  await prisma.$transaction(async (tx) => {
    const device = await tx.deviceInstance.create({
      data: {
        projectId,
        productTemplateId: template.id,
        locationId: optionalText(formData.get("locationId")),
        tag: String(formData.get("tag") ?? "").trim(),
        displayName: optionalText(formData.get("displayName")),
        notes: optionalText(formData.get("notes"))
      }
    });

    if (template.ports.length) {
      await tx.devicePortInstance.createMany({
        data: template.ports.map((port) => ({
          deviceInstanceId: device.id,
          productPortTemplateId: port.id,
          name: port.name,
          connectorTypeId: port.connectorTypeId,
          signalTypeId: port.signalTypeId,
          direction: port.direction,
          side: port.side,
          sortOrder: port.sortOrder,
          notes: port.notes
        }))
      });
    }
  });

  revalidatePath(`/projects/${projectId}/equipment`);
  revalidatePath(`/projects/${projectId}/schematics`);
}

export async function deleteDeviceInstance(projectId: string, deviceInstanceId: string) {
  await getCurrentContext();
  await prisma.deviceInstance.delete({ where: { id: deviceInstanceId } });
  revalidatePath(`/projects/${projectId}/equipment`);
  revalidatePath(`/projects/${projectId}/schematics`);
  revalidatePath(`/projects/${projectId}/cables`);
}
