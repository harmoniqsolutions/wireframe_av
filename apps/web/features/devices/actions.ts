"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wireframe-av/db";
import { getCurrentContext } from "@/lib/context";

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function numberedPortName(name: string, index: number) {
  if (index === 0) return name;
  const match = name.match(/^(.*?)(\d+)$/);
  if (!match) return `${name} ${index + 1}`;
  return `${match[1]}${Number(match[2]) + index}`;
}

function projectPaths(projectId: string, deviceInstanceId?: string) {
  return [
    `/projects/${projectId}/equipment`,
    deviceInstanceId ? `/projects/${projectId}/equipment/${deviceInstanceId}` : null,
    `/projects/${projectId}/schematics`,
    `/projects/${projectId}/cables`,
    `/projects/${projectId}/racks`
  ].filter((path): path is string => Boolean(path));
}

function revalidateProjectDevice(projectId: string, deviceInstanceId?: string) {
  for (const path of projectPaths(projectId, deviceInstanceId)) {
    revalidatePath(path);
  }
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
        tag: String(formData.get("tag") ?? "").trim().toUpperCase(),
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

  revalidateProjectDevice(projectId);
}

export async function updateDeviceInstance(projectId: string, deviceInstanceId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.deviceInstance.update({
    where: { id: deviceInstanceId, projectId },
    data: {
      locationId: optionalText(formData.get("locationId")),
      tag: String(formData.get("tag") ?? "").trim().toUpperCase(),
      displayName: optionalText(formData.get("displayName")),
      notes: optionalText(formData.get("notes"))
    }
  });

  revalidateProjectDevice(projectId, deviceInstanceId);
}

export async function createDevicePortInstance(projectId: string, deviceInstanceId: string, formData: FormData) {
  await getCurrentContext();
  const quantity = Math.max(1, Math.min(48, Number(formData.get("quantity") ?? 1)));
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const baseData = {
    deviceInstanceId,
    connectorTypeId: String(formData.get("connectorTypeId")),
    signalTypeId: String(formData.get("signalTypeId")),
    direction: String(formData.get("direction")) as "INPUT" | "OUTPUT" | "BIDIRECTIONAL",
    side: String(formData.get("side")) as "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "FRONT" | "REAR",
    notes: optionalText(formData.get("notes"))
  };

  await prisma.devicePortInstance.createMany({
    data: Array.from({ length: quantity }, (_, index) => ({
      ...baseData,
      name: numberedPortName(name, index),
      sortOrder: sortOrder + index
    }))
  });

  revalidateProjectDevice(projectId, deviceInstanceId);
}

export async function updateDevicePortInstance(projectId: string, deviceInstanceId: string, portId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.devicePortInstance.update({
    where: { id: portId, deviceInstanceId },
    data: {
      productPortTemplateId: null,
      name: String(formData.get("name") ?? "").trim(),
      connectorTypeId: String(formData.get("connectorTypeId")),
      signalTypeId: String(formData.get("signalTypeId")),
      direction: String(formData.get("direction")) as "INPUT" | "OUTPUT" | "BIDIRECTIONAL",
      side: String(formData.get("side")) as "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "FRONT" | "REAR",
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      notes: optionalText(formData.get("notes"))
    }
  });

  revalidateProjectDevice(projectId, deviceInstanceId);
}

export async function deleteDevicePortInstance(projectId: string, deviceInstanceId: string, portId: string) {
  await getCurrentContext();
  await prisma.$transaction(async (tx) => {
    const connectedCables = await tx.cable.findMany({
      where: {
        projectId,
        OR: [{ sourceDevicePortId: portId }, { destinationDevicePortId: portId }]
      },
      select: { id: true }
    });

    if (connectedCables.length) {
      await tx.cable.deleteMany({ where: { id: { in: connectedCables.map((cable) => cable.id) } } });
    }

    await tx.devicePortInstance.delete({ where: { id: portId, deviceInstanceId } });
  });

  revalidateProjectDevice(projectId, deviceInstanceId);
}

export async function deleteDeviceInstance(projectId: string, deviceInstanceId: string) {
  await getCurrentContext();
  await prisma.$transaction(async (tx) => {
    const devicePorts = await tx.devicePortInstance.findMany({
      where: { deviceInstanceId },
      select: { id: true }
    });
    const portIds = devicePorts.map((port) => port.id);

    if (portIds.length) {
      await tx.cable.deleteMany({
        where: {
          projectId,
          OR: [{ sourceDevicePortId: { in: portIds } }, { destinationDevicePortId: { in: portIds } }]
        }
      });
    }

    await tx.deviceInstance.delete({ where: { id: deviceInstanceId, projectId } });
  });

  revalidateProjectDevice(projectId, deviceInstanceId);
}
