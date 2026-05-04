import { Download } from "lucide-react";
import { prisma } from "@wireframe-av/db";
import { Panel } from "@/components/ui/panel";
import { CableScheduleTable } from "@/features/cables/cable-schedule-table";

export const dynamic = "force-dynamic";

export default async function ProjectCablesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [cables, cableTypes] = await Promise.all([
    prisma.cable.findMany({
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
    }),
    prisma.cableType.findMany({ orderBy: { name: "asc" } })
  ]);

  const rows = cables.map((cable) => ({
    id: cable.id,
    cableNumber: cable.cableNumber,
    sourceDevice: cable.sourceDevicePort.deviceInstance.tag,
    sourcePort: cable.sourceDevicePort.name,
    destinationDevice: cable.destinationDevicePort.deviceInstance.tag,
    destinationPort: cable.destinationDevicePort.name,
    cableTypeId: cable.cableTypeId,
    cableType: cable.cableType?.name ?? null,
    connectorA: cable.connectorA?.name ?? null,
    connectorB: cable.connectorB?.name ?? null,
    fromLocation: cable.fromLocation?.name ?? null,
    toLocation: cable.toLocation?.name ?? null,
    estimatedLength: cable.estimatedLength,
    status: cable.status,
    notes: cable.notes
  }));

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-950">Cable Schedule</h2>
          <p className="mt-1 text-sm text-neutral-500">Master schedule generated from structured schematic connections.</p>
        </div>
        <a
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
          href={`/api/projects/${projectId}/cables/export`}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
      <Panel className="overflow-hidden">
        <CableScheduleTable initialRows={rows} cableTypes={cableTypes} />
      </Panel>
    </div>
  );
}
