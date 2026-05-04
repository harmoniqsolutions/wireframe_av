import Link from "next/link";
import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createDevicePortInstance,
  deleteDevicePortInstance,
  updateDeviceInstance,
  updateDevicePortInstance
} from "@/features/devices/actions";
import { portDirections, portSides } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DeviceInstancePage({
  params
}: {
  params: Promise<{ projectId: string; deviceInstanceId: string }>;
}) {
  const { projectId, deviceInstanceId } = await params;
  const [device, locations, connectorTypes, signalTypes] = await Promise.all([
    prisma.deviceInstance.findUnique({
      where: { id: deviceInstanceId },
      include: {
        productTemplate: { include: { manufacturer: true } },
        location: true,
        ports: {
          orderBy: [{ side: "asc" }, { sortOrder: "asc" }],
          include: {
            connectorType: true,
            signalType: true,
            _count: { select: { sourceCables: true, destinationCables: true } }
          }
        }
      }
    }),
    prisma.projectLocation.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    prisma.connectorType.findMany({ orderBy: { name: "asc" } }),
    prisma.signalType.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!device || device.projectId !== projectId) notFound();

  const updateDevice = updateDeviceInstance.bind(null, projectId, device.id);
  const createPort = createDevicePortInstance.bind(null, projectId, device.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm text-neutral-500 hover:text-neutral-900" href={`/projects/${projectId}/equipment`}>
            Equipment
          </Link>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{device.tag}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {[device.productTemplate.manufacturer?.name, device.productTemplate.model, device.productTemplate.category].filter(Boolean).join(" / ")}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <div className="font-medium text-neutral-700">{device.ports.length} snapshot ports</div>
          <div>{device.location?.name ?? "Unassigned"}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <Panel className="p-4">
          <form action={updateDevice} className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-950">Equipment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Input id="tag" name="tag" required defaultValue={device.tag} autoCapitalize="characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select id="locationId" name="locationId" defaultValue={device.locationId ?? ""}>
                  <option value="">Unassigned</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" name="displayName" defaultValue={device.displayName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={device.notes ?? ""} />
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              Product template: {device.productTemplate.name}. Changes here affect this project device only.
            </div>
            <Button type="submit">Save Equipment</Button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel className="overflow-x-auto">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-950">Snapshot Ports</h3>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Connector</Th>
                  <Th>Signal</Th>
                  <Th>Direction</Th>
                  <Th>Side</Th>
                  <Th>Sort</Th>
                  <Th>Notes</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {device.ports.map((port) => {
                  const updatePort = updateDevicePortInstance.bind(null, projectId, device.id, port.id);
                  const deletePort = deleteDevicePortInstance.bind(null, projectId, device.id, port.id);
                  const connectedCableCount = port._count.sourceCables + port._count.destinationCables;
                  return (
                    <tr key={port.id}>
                      <Td colSpan={8}>
                        <form
                          action={updatePort}
                          className="grid min-w-[980px] grid-cols-[1fr_1.2fr_1.35fr_0.9fr_0.8fr_60px_1fr_auto_auto] gap-2"
                        >
                          <Input name="name" required defaultValue={port.name} aria-label="Port name" />
                          <Select name="connectorTypeId" defaultValue={port.connectorTypeId} aria-label="Connector type">
                            {connectorTypes.map((connector) => (
                              <option key={connector.id} value={connector.id}>
                                {connector.name}
                              </option>
                            ))}
                          </Select>
                          <Select name="signalTypeId" defaultValue={port.signalTypeId} aria-label="Signal type">
                            {signalTypes.map((signal) => (
                              <option key={signal.id} value={signal.id}>
                                {signal.name}
                              </option>
                            ))}
                          </Select>
                          <Select name="direction" defaultValue={port.direction} aria-label="Direction">
                            {portDirections.map((direction) => (
                              <option key={direction} value={direction}>
                                {direction}
                              </option>
                            ))}
                          </Select>
                          <Select name="side" defaultValue={port.side} aria-label="Side">
                            {portSides.map((side) => (
                              <option key={side} value={side}>
                                {side}
                              </option>
                            ))}
                          </Select>
                          <Input name="sortOrder" type="number" defaultValue={port.sortOrder} aria-label="Sort order" />
                          <Input name="notes" defaultValue={port.notes ?? ""} placeholder="Notes" aria-label="Port notes" />
                          <Button type="submit" size="sm" variant="secondary">
                            Save
                          </Button>
                          <Button
                            form={`delete-device-port-${port.id}`}
                            type="submit"
                            size="sm"
                            variant="ghost"
                            title={connectedCableCount ? `Deletes ${connectedCableCount} connected cable(s)` : undefined}
                            aria-label={`Delete ${port.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                        <form id={`delete-device-port-${port.id}`} action={deletePort} />
                      </Td>
                    </tr>
                  );
                })}
                {!device.ports.length && (
                  <tr>
                    <Td colSpan={8} className="py-8 text-center text-neutral-500">
                      No ports on this equipment yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Panel>

          <Panel className="overflow-x-auto p-4">
            <form
              action={createPort}
              className="grid min-w-[1040px] grid-cols-[1fr_1.15fr_1.3fr_0.9fr_0.85fr_72px_72px_1fr_auto] gap-3"
            >
              <Input name="name" required placeholder="Output 1" aria-label="New port name" />
              <Select name="connectorTypeId" required aria-label="Connector type">
                {connectorTypes.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </Select>
              <Select name="signalTypeId" required aria-label="Signal type">
                {signalTypes.map((signal) => (
                  <option key={signal.id} value={signal.id}>
                    {signal.name}
                  </option>
                ))}
              </Select>
              <Select name="direction" defaultValue="OUTPUT" aria-label="Direction">
                {portDirections.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </Select>
              <Select name="side" defaultValue="RIGHT" aria-label="Side">
                {portSides.map((side) => (
                  <option key={side} value={side}>
                    {side}
                  </option>
                ))}
              </Select>
              <Input name="sortOrder" type="number" defaultValue={0} aria-label="Sort order" />
              <Input name="quantity" type="number" min="1" max="48" defaultValue={1} aria-label="Quantity" />
              <Input name="notes" placeholder="Notes" aria-label="New port notes" />
              <Button type="submit">Add Port</Button>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
