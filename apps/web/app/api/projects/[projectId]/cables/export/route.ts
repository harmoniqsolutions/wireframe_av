import { NextResponse } from "next/server";
import { prisma } from "@wireframe-av/db";
import { exportCableScheduleCsv } from "@wireframe-av/export/src/csvExport";
import { getCurrentContext } from "@/lib/context";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  await getCurrentContext();
  const { projectId } = await context.params;
  const cables = await prisma.cable.findMany({
    where: { projectId },
    orderBy: { cableNumber: "asc" },
    include: {
      sourceDevicePort: { include: { deviceInstance: true } },
      destinationDevicePort: { include: { deviceInstance: true } },
      cableType: true,
      connectorA: true,
      connectorB: true,
      fromLocation: true,
      toLocation: true
    }
  });

  const csv = exportCableScheduleCsv(
    cables.map((cable) => ({
      "Cable Number": cable.cableNumber,
      "Source Device": cable.sourceDevicePort.deviceInstance.tag,
      "Source Port": cable.sourceDevicePort.name,
      "Destination Device": cable.destinationDevicePort.deviceInstance.tag,
      "Destination Port": cable.destinationDevicePort.name,
      "Cable Type": cable.cableType?.name,
      "Connector A": cable.connectorA?.name,
      "Connector B": cable.connectorB?.name,
      "From Location": cable.fromLocation?.name,
      "To Location": cable.toLocation?.name,
      "Estimated Length": cable.estimatedLength,
      Status: cable.status,
      Notes: cable.notes
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"cable-schedule.csv\""
    }
  });
}
