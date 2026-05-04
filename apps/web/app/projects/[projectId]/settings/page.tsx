import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createLocation, updateProject } from "@/features/projects/actions";
import { projectStatuses } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [project, locations] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.projectLocation.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } })
  ]);

  const saveProject = updateProject.bind(null, projectId);
  const addLocation = createLocation.bind(null, projectId);

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6">
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-neutral-950">Settings</h2>
          <p className="mt-1 text-sm text-neutral-500">Project metadata and locations used by devices and cable schedules.</p>
        </div>
        <Panel className="p-4">
          <form action={saveProject} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" required defaultValue={project.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={project.status}>
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client</Label>
                <Input id="clientName" name="clientName" defaultValue={project.clientName ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number</Label>
                <Input id="projectNumber" name="projectNumber" defaultValue={project.projectNumber ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={project.description ?? ""} />
            </div>
            <Button type="submit">Save Project</Button>
          </form>
        </Panel>
      </section>

      <aside className="space-y-4">
        <Panel className="overflow-hidden">
          <div className="border-b border-neutral-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-neutral-950">Locations</h3>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Sort</Th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <Td>{location.name}</Td>
                  <Td>{location.sortOrder}</Td>
                </tr>
              ))}
              {!locations.length && (
                <tr>
                  <Td colSpan={2} className="text-neutral-500">
                    No locations yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Panel>
        <Panel className="p-4">
          <form action={addLocation} className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-950">Add Location</h3>
            <div className="space-y-2">
              <Label htmlFor="locationName">Name</Label>
              <Input id="locationName" name="name" required placeholder="Rack Room" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationDescription">Description</Label>
              <Input id="locationDescription" name="description" placeholder="Level 2 IDF" />
            </div>
            <Button type="submit" className="w-full">
              Add Location
            </Button>
          </form>
        </Panel>
      </aside>
    </div>
  );
}
