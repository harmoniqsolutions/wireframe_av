import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { createProductTemplate } from "@/features/products/actions";
import { getCurrentContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function ProductLibraryPage() {
  await getCurrentContext();
  const products = await prisma.productTemplate.findMany({
    orderBy: [{ manufacturer: { name: "asc" } }, { model: "asc" }],
    include: {
      manufacturer: true,
      _count: { select: { ports: true, deviceInstances: true } }
    }
  });

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[1fr_380px] gap-6 px-6 py-8">
      <section>
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-neutral-950">Product Library</h1>
          <p className="mt-1 text-sm text-neutral-500">Reusable manufacturer templates. Project devices snapshot their ports on creation.</p>
        </div>
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
                    <span>{product._count.ports} ports</span>
                    <span>{product._count.deviceInstances} project devices</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </div>
            </Link>
          ))}
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
