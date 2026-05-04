import Link from "next/link";
import { Filter, Pencil, Trash2 } from "lucide-react";
import { Prisma, prisma } from "@wireframe-av/db";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { addDeviceInstanceToProject, deleteDeviceInstance } from "@/features/devices/actions";

export const dynamic = "force-dynamic";

export default async function ProjectEquipmentPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    equipmentCategory?: string;
    equipmentLocationId?: string;
    productQ?: string;
    manufacturerId?: string;
    category?: string;
  }>;
}) {
  const { projectId } = await params;
  const filters = await searchParams;
  const selectedEquipmentCategory = filters.equipmentCategory?.trim();
  const selectedEquipmentLocationId = filters.equipmentLocationId?.trim();
  const productQ = filters.productQ?.trim();
  const selectedManufacturerId = filters.manufacturerId?.trim();
  const selectedCategory = filters.category?.trim();
  const deviceWhere: Prisma.DeviceInstanceWhereInput = {
    AND: [
      { projectId },
      selectedEquipmentCategory ? { productTemplate: { category: selectedEquipmentCategory } } : {},
      selectedEquipmentLocationId === "unassigned"
        ? { locationId: null }
        : selectedEquipmentLocationId
          ? { locationId: selectedEquipmentLocationId }
          : {}
    ]
  };
  const productWhere: Prisma.ProductTemplateWhereInput = {
    AND: [
      productQ
        ? {
            OR: [
              { name: { contains: productQ, mode: "insensitive" } },
              { model: { contains: productQ, mode: "insensitive" } },
              { category: { contains: productQ, mode: "insensitive" } },
              { manufacturer: { name: { contains: productQ, mode: "insensitive" } } }
            ]
          }
        : {},
      selectedManufacturerId ? { manufacturerId: selectedManufacturerId } : {},
      selectedCategory ? { category: selectedCategory } : {}
    ]
  };

  const [devices, products, locations, manufacturers, categoryRows] = await Promise.all([
    prisma.deviceInstance.findMany({
      where: deviceWhere,
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
    prisma.productTemplate.findMany({
      where: productWhere,
      orderBy: [{ manufacturer: { name: "asc" } }, { model: "asc" }],
      include: { manufacturer: true, _count: { select: { ports: true } } }
    }),
    prisma.projectLocation.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
    prisma.productTemplate.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" }
    })
  ]);
  const categories = categoryRows.map((row) => row.category).filter((category): category is string => Boolean(category));

  const addDevice = addDeviceInstanceToProject.bind(null, projectId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-950">Equipment</h2>
            <p className="mt-1 text-sm text-neutral-500">Device instances are project snapshots of product templates and ports.</p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div className="font-medium text-neutral-700">{devices.length} project devices</div>
            <div>{devices.reduce((total, device) => total + device.ports.length, 0)} snapshotted ports</div>
          </div>
        </div>

        <Panel className="mb-5 p-4">
          <form className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end" action={`/projects/${projectId}/equipment`}>
            <div className="space-y-2">
              <Label htmlFor="equipmentLocationId">Equipment Location</Label>
              <AutoSubmitSelect id="equipmentLocationId" name="equipmentLocationId" defaultValue={selectedEquipmentLocationId ?? ""}>
                <option value="">All locations</option>
                <option value="unassigned">Unassigned</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipmentCategory">Equipment Category</Label>
              <AutoSubmitSelect id="equipmentCategory" name="equipmentCategory" defaultValue={selectedEquipmentCategory ?? ""}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </AutoSubmitSelect>
            </div>
            <Link
              href={`/projects/${projectId}/equipment`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-transparent px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Clear
            </Link>
          </form>
        </Panel>

        <Panel className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Tag</Th>
                <Th>Device</Th>
                <Th>Category</Th>
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
                    <Td>{device.productTemplate.category ?? "Uncategorized"}</Td>
                    <Td>{device.location?.name ?? "Unassigned"}</Td>
                    <Td>
                      <div className="max-w-lg text-xs text-neutral-600">
                        {device.ports.map((port) => `${port.name} (${port.connectorType.name}, ${port.signalType.name})`).join("; ")}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/projects/${projectId}/equipment/${device.id}`}
                          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                          aria-label={`Edit ${device.tag}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={deleteDevice}>
                        <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${device.tag}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {!devices.length && (
                <tr>
                  <Td colSpan={6} className="py-8 text-center text-neutral-500">
                    No devices in this project yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Panel>
      </section>

      <Panel className="h-fit p-4">
        <form className="mb-4 space-y-3 border-b border-neutral-200 pb-4" action={`/projects/${projectId}/equipment`}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
            <Filter className="h-4 w-4" />
            Filter Templates
          </h3>
          <div className="space-y-2">
            <Label htmlFor="productQ">Search</Label>
            <Input id="productQ" name="productQ" defaultValue={productQ ?? ""} placeholder="Biamp, Tesira, DSP" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacturerId">Manufacturer</Label>
            <AutoSubmitSelect id="manufacturerId" name="manufacturerId" defaultValue={selectedManufacturerId ?? ""}>
              <option value="">All manufacturers</option>
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <AutoSubmitSelect id="category" name="category" defaultValue={selectedCategory ?? ""}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </AutoSubmitSelect>
          </div>
        </form>
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
                  {[product.manufacturer?.name, product.model, product.category, `(${product._count.ports} ports)`].filter(Boolean).join(" / ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input id="tag" name="tag" required placeholder="DSP-001" autoCapitalize="characters" />
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
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
            Common tag prefixes: DSP, AMP, SW, DISP, MIC, RX, TX, CAM, SPK.
          </div>
          <Button type="submit" className="w-full" disabled={!products.length}>
            Add Device
          </Button>
        </form>
      </Panel>
    </div>
  );
}
