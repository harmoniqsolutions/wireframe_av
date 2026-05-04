import Link from "next/link";
import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, Td, Th } from "@/components/ui/table";
import {
  createProductPortTemplate,
  deleteProductPortTemplate,
  updateProductPortTemplate,
  updateProductTemplate
} from "@/features/products/actions";
import { portDirections, portSides } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function ProductTemplatePage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const [product, connectorTypes, signalTypes] = await Promise.all([
    prisma.productTemplate.findUnique({
      where: { id: productId },
      include: {
        manufacturer: true,
        ports: {
          orderBy: [{ side: "asc" }, { sortOrder: "asc" }],
          include: { connectorType: true, signalType: true }
        }
      }
    }),
    prisma.connectorType.findMany({ orderBy: { name: "asc" } }),
    prisma.signalType.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!product) notFound();

  const updateProduct = updateProductTemplate.bind(null, product.id);
  const createPort = createProductPortTemplate.bind(null, product.id);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link className="text-sm text-neutral-500 hover:text-neutral-900" href="/library/products">
            Product Library
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-950">{product.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-[420px_1fr] gap-6">
        <Panel className="p-4">
          <form action={updateProduct} className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-950">Template Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input id="manufacturer" name="manufacturer" defaultValue={product.manufacturer?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" required defaultValue={product.model} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={product.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" defaultValue={product.category ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rackUnits">Rack Units</Label>
                <Input id="rackUnits" name="rackUnits" type="number" min="0" defaultValue={product.rackUnits ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={product.notes ?? ""} />
            </div>
            <Button type="submit">Save Template</Button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-950">Port Templates</h2>
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
                  <Th />
                </tr>
              </thead>
              <tbody>
                {product.ports.map((port) => {
                  const updatePort = updateProductPortTemplate.bind(null, product.id, port.id);
                  const deletePort = deleteProductPortTemplate.bind(null, product.id, port.id);
                  return (
                    <tr key={port.id}>
                      <Td colSpan={7}>
                        <form action={updatePort} className="grid grid-cols-[1.1fr_1.3fr_1.5fr_1fr_1fr_64px_36px] gap-2">
                          <Input name="name" defaultValue={port.name} aria-label="Port name" />
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
                          <div className="flex gap-1">
                            <Button type="submit" size="sm" variant="secondary">
                              Save
                            </Button>
                          </div>
                        </form>
                        <form action={deletePort} className="mt-2">
                          <Button type="submit" size="sm" variant="ghost" aria-label={`Delete ${port.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>

          <Panel className="p-4">
            <form action={createPort} className="grid grid-cols-[1fr_1.2fr_1.4fr_1fr_1fr_80px_auto] gap-3">
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
              <Button type="submit">Add Port</Button>
            </form>
          </Panel>
        </div>
      </div>
    </main>
  );
}
