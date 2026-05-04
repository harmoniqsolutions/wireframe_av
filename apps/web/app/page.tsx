import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { prisma } from "@wireframe-av/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/features/projects/actions";
import { getCurrentContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getCurrentContext();
  const projects = await prisma.project.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { deviceInstances: true, cables: true, drawingPages: true } } }
  });

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[1fr_360px] gap-6 px-6 py-8">
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-950">Projects</h1>
            <p className="mt-1 text-sm text-neutral-500">Structured AV documentation starts here.</p>
          </div>
          <Link href="/library/products" className="text-sm font-medium text-neutral-700 hover:text-neutral-950">
            Product library
          </Link>
        </div>

        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-md border border-neutral-200 bg-white px-4 py-4 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-neutral-950">{project.name}</h2>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{project.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {[project.clientName, project.projectNumber].filter(Boolean).join(" / ") || "No client metadata yet"}
                  </p>
                  <div className="mt-3 flex gap-4 text-xs text-neutral-500">
                    <span>{project._count.deviceInstances} devices</span>
                    <span>{project._count.drawingPages} pages</span>
                    <span>{project._count.cables} cables</span>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-400" />
              </div>
            </Link>
          ))}

          {!projects.length && (
            <Panel className="px-5 py-10 text-center">
              <h2 className="text-sm font-semibold text-neutral-900">No projects yet</h2>
              <p className="mt-1 text-sm text-neutral-500">Create the first project to begin validating the MVP workflow.</p>
            </Panel>
          )}
        </div>
      </section>

      <Panel className="h-fit p-4">
        <form action={createProject} className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
              <Plus className="h-4 w-4" />
              Create Project
            </h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input id="name" name="name" required placeholder="Conference Center AV Refresh" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientName">Client</Label>
            <Input id="clientName" name="clientName" placeholder="Acme Corporation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectNumber">Project Number</Label>
            <Input id="projectNumber" name="projectNumber" placeholder="AV-2401" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Scope notes" />
          </div>
          <Button type="submit" className="w-full">
            Create Project
          </Button>
        </form>
      </Panel>
    </main>
  );
}
