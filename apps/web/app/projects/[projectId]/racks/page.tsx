import Link from "next/link";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { createRack, deleteRack } from "@/features/racks/actions";
import { RackCanvas, type MountedItemData, type SidebarDeviceData } from "@/features/racks/rack-canvas";

export const dynamic = "force-dynamic";

export default async function ProjectRacksPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ rack?: string }>;
}) {
  const { projectId } = await params;
  const { rack: selectedRackId } = await searchParams;

  const [racks, devices] = await Promise.all([
    prisma.rack.findMany({
      where: { projectId },
      orderBy: { name: "asc" }
    }),
    prisma.deviceInstance.findMany({
      where: { projectId },
      orderBy: { tag: "asc" },
      include: { productTemplate: true }
    })
  ]);

  const currentRackId = selectedRackId ?? racks[0]?.id;
  const currentRack = currentRackId
    ? await prisma.rack.findUnique({
        where: { id: currentRackId },
        include: {
          mountedItems: {
            include: {
              deviceInstance: { include: { productTemplate: true } }
            }
          }
        }
      })
    : null;

  const createRackAction = createRack.bind(null, projectId);

  const initialItems: MountedItemData[] = (currentRack?.mountedItems ?? []).map((item) => ({
    id: item.id,
    deviceInstanceId: item.deviceInstanceId,
    startRu: item.startRu,
    heightRu: item.heightRu,
    side: item.side,
    deviceTag: item.deviceInstance.tag,
    deviceDisplayName: item.deviceInstance.displayName,
    productName: item.deviceInstance.productTemplate.name,
    productRackUnits: item.deviceInstance.productTemplate.rackUnits
  }));

  const projectDevices: SidebarDeviceData[] = devices.map((d) => ({
    id: d.id,
    tag: d.tag,
    displayName: d.displayName,
    productName: d.productTemplate.name,
    productModel: d.productTemplate.model,
    productRackUnits: d.productTemplate.rackUnits
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Racks</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Drag project devices into rack unit positions. Front and rear views are independent.
          </p>
        </div>
      </div>

      <div className="mb-3 grid shrink-0 grid-cols-[minmax(0,1fr)_420px] gap-3">
        <Panel className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {racks.map((rack) => {
              const deleteRackAction = deleteRack.bind(null, projectId, rack.id);
              return (
                <div key={rack.id} className="flex items-center gap-1">
                  <Link
                    href={`/projects/${projectId}/racks?rack=${rack.id}`}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      rack.id === currentRackId
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {rack.name}
                    <span className="ml-1.5 text-xs opacity-60">{rack.heightRu}U</span>
                  </Link>
                  <form action={deleteRackAction}>
                    <button
                      type="submit"
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={`Delete ${rack.name}`}
                      title={`Delete ${rack.name}`}
                    >
                      ×
                    </button>
                  </form>
                </div>
              );
            })}
            {!racks.length && <span className="text-sm text-neutral-500">No racks yet.</span>}
          </div>
        </Panel>
        <Panel className="p-3">
          <form action={createRackAction} className="grid grid-cols-[1fr_80px_120px_auto] gap-2">
            <div>
              <Label htmlFor="rack-name" className="sr-only">Rack name</Label>
              <Input id="rack-name" name="name" required placeholder="Rack A" aria-label="Rack name" />
            </div>
            <div>
              <Label htmlFor="rack-height" className="sr-only">Height (RU)</Label>
              <Input
                id="rack-height"
                name="heightRu"
                type="number"
                min={1}
                max={100}
                defaultValue={42}
                aria-label="Rack height in RU"
              />
            </div>
            <Select name="numberingDirection" defaultValue="BOTTOM_UP" aria-label="Numbering direction">
              <option value="BOTTOM_UP">Bottom Up</option>
              <option value="TOP_DOWN">Top Down</option>
            </Select>
            <Button type="submit">Create</Button>
          </form>
        </Panel>
      </div>

      {currentRack ? (
        <div className="relative min-h-0 flex-1">
          <RackCanvas
            rackId={currentRack.id}
            rackName={currentRack.name}
            heightRu={currentRack.heightRu}
            numberingDirection={currentRack.numberingDirection}
            initialItems={initialItems}
            projectDevices={projectDevices}
          />
        </div>
      ) : (
        <Panel className="flex min-h-0 flex-1 items-center justify-center px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-neutral-950">Create a rack to open the elevation editor.</h3>
        </Panel>
      )}
    </div>
  );
}
