"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function numberedPortName(name: string, index: number) {
  if (index === 0) return name;
  const match = name.match(/^(.*?)(\d+)$/);
  if (!match) return `${name} ${index + 1}`;
  return `${match[1]}${Number(match[2]) + index}`;
}

async function manufacturerIdFromForm(formData: FormData) {
  const manufacturerName = optionalText(formData.get("manufacturer"));
  if (!manufacturerName) return null;
  const manufacturer = await prisma.manufacturer.upsert({
    where: { name: manufacturerName },
    update: {},
    create: { name: manufacturerName }
  });
  return manufacturer.id;
}

export async function createProductTemplate(formData: FormData) {
  await getCurrentContext();
  const product = await prisma.productTemplate.create({
    data: {
      manufacturerId: await manufacturerIdFromForm(formData),
      name: String(formData.get("name") ?? "").trim(),
      model: String(formData.get("model") ?? "").trim(),
      category: optionalText(formData.get("category")),
      rackUnits: optionalNumber(formData.get("rackUnits")),
      notes: optionalText(formData.get("notes")),
      verificationStatus: String(formData.get("verificationStatus") ?? "MANUAL") as
        | "MANUAL"
        | "AI_DRAFT"
        | "USER_VERIFIED"
        | "TEAM_VERIFIED"
        | "ADMIN_VERIFIED"
        | "DEPRECATED"
    }
  });

  revalidatePath("/library/products");
  redirect(`/library/products/${product.id}`);
}

export async function updateProductTemplate(productId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.productTemplate.update({
    where: { id: productId },
    data: {
      manufacturerId: await manufacturerIdFromForm(formData),
      name: String(formData.get("name") ?? "").trim(),
      model: String(formData.get("model") ?? "").trim(),
      category: optionalText(formData.get("category")),
      rackUnits: optionalNumber(formData.get("rackUnits")),
      notes: optionalText(formData.get("notes")),
      verificationStatus: String(formData.get("verificationStatus") ?? "MANUAL") as
        | "MANUAL"
        | "AI_DRAFT"
        | "USER_VERIFIED"
        | "TEAM_VERIFIED"
        | "ADMIN_VERIFIED"
        | "DEPRECATED"
    }
  });

  revalidatePath("/library/products");
  revalidatePath(`/library/products/${productId}`);
}

export async function createProductPortTemplate(productTemplateId: string, formData: FormData) {
  await getCurrentContext();
  const quantity = Math.max(1, Math.min(48, Number(formData.get("quantity") ?? 1)));
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const baseData = {
    productTemplateId,
    connectorTypeId: String(formData.get("connectorTypeId")),
    signalTypeId: String(formData.get("signalTypeId")),
    direction: String(formData.get("direction")) as "INPUT" | "OUTPUT" | "BIDIRECTIONAL",
    side: String(formData.get("side")) as "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "FRONT" | "REAR",
    notes: optionalText(formData.get("notes"))
  };

  await prisma.productPortTemplate.createMany({
    data: Array.from({ length: quantity }, (_, index) => ({
      ...baseData,
      name: numberedPortName(name, index),
      sortOrder: sortOrder + index
    }))
  });

  revalidatePath(`/library/products/${productTemplateId}`);
}

export async function updateProductPortTemplate(productTemplateId: string, portId: string, formData: FormData) {
  await getCurrentContext();
  await prisma.productPortTemplate.update({
    where: { id: portId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      connectorTypeId: String(formData.get("connectorTypeId")),
      signalTypeId: String(formData.get("signalTypeId")),
      direction: String(formData.get("direction")) as "INPUT" | "OUTPUT" | "BIDIRECTIONAL",
      side: String(formData.get("side")) as "LEFT" | "RIGHT" | "TOP" | "BOTTOM" | "FRONT" | "REAR",
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      notes: optionalText(formData.get("notes"))
    }
  });

  revalidatePath(`/library/products/${productTemplateId}`);
}

export async function deleteProductPortTemplate(productTemplateId: string, portId: string) {
  await getCurrentContext();
  await prisma.productPortTemplate.delete({ where: { id: portId } });
  revalidatePath(`/library/products/${productTemplateId}`);
}
