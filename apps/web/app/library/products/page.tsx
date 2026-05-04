import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Prisma, VerificationStatus, prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProductTemplate } from "@/features/products/actions";
import { getCurrentContext } from "@/lib/context";
import { verificationStatuses } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function ProductLibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; manufacturerId?: string; category?: string; verificationStatus?: string }>;
}) {
  await getCurrentContext();
  const filters = await searchParams;
  const q = filters.q?.trim();
  const selectedManufacturerId = filters.manufacturerId?.trim();
  const selectedCategory = filters.category?.trim();
  const selectedVerificationStatus = filters.verificationStatus?.trim();
  const where: Prisma.ProductTemplateWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { manufacturer: { name: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {},
      selectedManufacturerId ? { manufacturerId: selectedManufacturerId } : {},
      selectedCategory ? { category: selectedCategory } : {},
      selectedVerificationStatus ? { verificationStatus: selectedVerificationStatus as VerificationStatus } : {}
    ]
  };

  const [products, manufacturers, categoryRows] = await Promise.all([
    prisma.productTemplate.findMany({
      where,
      orderBy: [{ manufacturer: { name: "asc" } }, { model: "asc" }],
      include: {
        manufacturer: true,
        _count: { select: { ports: true, deviceInstances: true } }
      }
    }),
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
    prisma.productTemplate.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" }
    })
  ]);
  const categories = categoryRows.map((row) => row.category).filter((category): category is string => Boolean(category));

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[1fr_380px] gap-6 px-6 py-8">
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-950">Product Library</h1>
            <p className="mt-1 text-sm text-neutral-500">Reusable manufacturer templates. Project devices snapshot their ports on creation.</p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div className="font-medium text-neutral-700">{products.length} visible templates</div>
            <div>{manufacturers.length} manufacturers</div>
          </div>
        </div>
        <Panel className="mb-4 p-3">
          <form className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2" action="/library/products">
            <Input name="q" defaultValue={q ?? ""} placeholder="Search manufacturer, model, name" aria-label="Search products" />
            <Select name="manufacturerId" defaultValue={selectedManufacturerId ?? ""} aria-label="Filter by manufacturer">
              <option value="">All manufacturers</option>
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
            </Select>
            <Select name="category" defaultValue={selectedCategory ?? ""} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select name="verificationStatus" defaultValue={selectedVerificationStatus ?? ""} aria-label="Filter by verification status">
              <option value="">All verification</option>
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </Panel>
        <div className="space-y-3">
          {products.map((product) => (
            <Link
              href={`/library/products/${product.id}`}
              key={product.id}
              className="block rounded-md border border-neutral-200 bg-white px-4 py-4 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-neutral-950">
                    {[product.manufacturer?.name, product.model].filter(Boolean).join(" ")}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{product.name}</p>
                  <div className="mt-3 flex gap-4 text-xs text-neutral-500">
                    <span>{product.category ?? "Uncategorized"}</span>
                    <span>{product.verificationStatus.replaceAll("_", " ")}</span>
                    <span>{product._count.ports} ports</span>
                    <span>{product._count.deviceInstances} project devices</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </div>
            </Link>
          ))}
          {!products.length && (
            <Panel className="px-5 py-10 text-center">
              <h2 className="text-sm font-semibold text-neutral-950">No product templates yet</h2>
              <p className="mt-1 text-sm text-neutral-500">Create reusable equipment stencils before adding devices to projects.</p>
            </Panel>
          )}
        </div>
      </section>

      <Panel className="h-fit p-4">
        <form action={createProductTemplate} className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
            <Plus className="h-4 w-4" />
            Create Product Template
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" name="manufacturer" placeholder="Generic" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" required placeholder="DSP-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationStatus">Verification</Label>
            <Select id="verificationStatus" name="verificationStatus" defaultValue="MANUAL">
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Generic DSP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="DSP" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rackUnits">Rack Units</Label>
              <Input id="rackUnits" name="rackUnits" type="number" min="0" placeholder="1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <Button className="w-full" type="submit">
            Create Template
          </Button>
        </form>
      </Panel>
    </main>
  );
}
