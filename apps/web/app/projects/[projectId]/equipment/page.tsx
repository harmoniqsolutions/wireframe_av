import Link from "next/link";
import { Trash2 } from "lucide-react";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { addDeviceInstanceToProject, deleteDeviceInstance } from "@/features/devices/actions";

export const dynamic = "force-dynamic";

export default async function ProjectEquipmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [devices, products, locations] = await Promise.all([
    prisma.deviceInstance.findMany({
      where: { projectId },
      orderBy: { tag: "asc" },
      include: {
        productTemplate: { include: { manufacturer: true } },
        location: true,
        ports: {
          orderBy: { sortOrder: "asc" },
          include: { connectorType: true, signalType: true }
        }
      }
    }),
    prisma.productTemplate.findMany({ orderBy: { model: "asc" }, include: { manufacturer: true, _count: { select: { ports: true } } } }),
    prisma.projectLocation.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } })
  ]);

  const addDevice = addDeviceInstanceToProject.bind(null, projectId);

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6">
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-neutral-950">Equipment</h2>
          <p className="mt-1 text-sm text-neutral-500">Device instances are project snapshots of product templates and ports.</p>
        </div>

        <Panel className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Tag</Th>
                <Th>Device</Th>
                <Th>Location</Th>
                <Th>Ports</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const deleteDevice = deleteDeviceInstance.bind(null, projectId, device.id);
                return (
                  <tr key={device.id}>
                    <Td className="font-semibold">{device.tag}</Td>
                    <Td>
                      <div>{device.displayName ?? device.productTemplate.name}</div>
                      <div className="text-xs text-neutral-500">
                        {[device.productTemplate.manufacturer?.name, device.productTemplate.model].filter(Boolean).join(" ")}
                      </div>
                    </Td>
                    <Td>{device.location?.name ?? "Unassigned"}</Td>
                    <Td>
                      <div className="max-w-lg text-xs text-neutral-600">
                        {device.ports.map((port) => `${port.name} (${port.connectorType.name}, ${port.signalType.name})`).join("; ")}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <form action={deleteDevice}>
                        <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${device.tag}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </Td>
                  </tr>
                );
              })}
              {!devices.length && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-neutral-500">
                    No devices in this project yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Panel>
      </section>

      <Panel className="h-fit p-4">
        <form action={addDevice} className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-950">Add Device</h3>
          {!products.length && (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
              Create a <Link className="font-medium text-neutral-950 underline" href="/library/products">product template</Link> first.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="productTemplateId">Product Template</Label>
            <Select id="productTemplateId" name="productTemplateId" required disabled={!products.length}>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {[product.manufacturer?.name, product.model, `(${product._count.ports} ports)`].filter(Boolean).join(" ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" name="tag" required placeholder="DSP-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Select id="locationId" name="locationId" defaultValue="">
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
            <Input id="displayName" name="displayName" placeholder="Audio DSP" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Rack room A" />
          </div>
          <Button type="submit" className="w-full" disabled={!products.length}>
            Add Device
          </Button>
        </form>
      </Panel>
    </div>
  );
}
