import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@wireframe-av/db";
import { Panel } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { _count: { select: { deviceInstances: true, cables: true, drawingPages: true, locations: true } } }
  });

  const cards = [
    ["Equipment", `${project._count.deviceInstances} devices`, `/projects/${project.id}/equipment`],
    ["Schematics", `${project._count.drawingPages} pages`, `/projects/${project.id}/schematics`],
    ["Cable Schedule", `${project._count.cables} cables`, `/projects/${project.id}/cables`],
    ["Settings", `${project._count.locations} locations`, `/projects/${project.id}/settings`]
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-neutral-950">{project.name}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {[project.clientName, project.projectNumber, project.status].filter(Boolean).join(" / ")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(([title, value, href]) => (
          <Link key={title} href={href}>
            <Panel className="p-4 transition hover:border-neutral-300 hover:bg-neutral-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{value}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
