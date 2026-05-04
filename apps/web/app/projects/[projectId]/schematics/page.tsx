import Link from "next/link";
import { prisma } from "@wireframe-av/db";
import { mapDrawingEdgeToReactFlow, mapDrawingNodeToReactFlow } from "@wireframe-av/diagram/src/diagramMapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { createDrawingPage } from "@/features/schematics/actions";
import { SchematicCanvas } from "@/features/schematics/schematic-canvas";
import { drawingPageTypes } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function ProjectSchematicsPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { projectId } = await params;
  const { page: selectedPageId } = await searchParams;
  const [pages, devices] = await Promise.all([
    prisma.drawingPage.findMany({ where: { projectId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.deviceInstance.findMany({
      where: { projectId },
      orderBy: { tag: "asc" },
      include: { productTemplate: true }
    })
  ]);

  const currentPageId = selectedPageId ?? pages[0]?.id;
  const drawingPage = currentPageId
    ? await prisma.drawingPage.findUnique({
        where: { id: currentPageId },
        include: {
          nodes: {
            include: {
              deviceInstance: {
                include: {
                  productTemplate: true,
                  ports: true
                }
              }
            }
          },
          edges: {
            include: {
              cable: true
            }
          }
        }
      })
    : null;

  const createPage = createDrawingPage.bind(null, projectId);
  const placedIds = new Set(drawingPage?.nodes.map((node) => node.deviceInstanceId) ?? []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Schematics</h2>
          <p className="mt-1 text-sm text-neutral-500">Canvas views render structured devices, ports, cables, and drawing edges.</p>
        </div>
      </div>

      <div className="mb-3 grid shrink-0 grid-cols-[minmax(0,1fr)_420px] gap-3">
        <Panel className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/projects/${projectId}/schematics?page=${page.id}`}
                className={`rounded-md border px-3 py-2 text-sm ${
                  page.id === currentPageId
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {page.sheetNumber ? `${page.sheetNumber} / ` : ""}
                {page.name}
              </Link>
            ))}
            {!pages.length && <span className="text-sm text-neutral-500">No drawing pages yet.</span>}
          </div>
        </Panel>
        <Panel className="p-3">
          <form action={createPage} className="grid grid-cols-[1fr_120px_95px_auto] gap-2">
            <Input name="name" required placeholder="Audio Schematic" aria-label="Drawing page name" />
            <Select name="type" defaultValue="AUDIO" aria-label="Drawing page type">
              {drawingPageTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input name="sheetNumber" placeholder="A-101" aria-label="Sheet number" />
            <Button type="submit">Create</Button>
          </form>
        </Panel>
      </div>

      {drawingPage ? (
        <div className="min-h-0 flex-1">
          <SchematicCanvas
            drawingPageId={drawingPage.id}
            initialNodes={drawingPage.nodes.map(mapDrawingNodeToReactFlow)}
            initialEdges={drawingPage.edges.map(mapDrawingEdgeToReactFlow)}
            devices={devices.map((device) => ({
              id: device.id,
              tag: device.tag,
              name: device.displayName ?? device.productTemplate.name,
              model: device.productTemplate.model,
              placed: placedIds.has(device.id)
            }))}
          />
        </div>
      ) : (
        <Panel className="flex min-h-0 flex-1 items-center justify-center px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-neutral-950">Create a drawing page to open the schematic canvas.</h3>
        </Panel>
      )}
    </div>
  );
}
