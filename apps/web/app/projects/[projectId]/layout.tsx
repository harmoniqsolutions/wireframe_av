import Link from "next/link";
import { notFound } from "next/navigation";
import { Cable, MonitorCog, Network, PackageSearch, Rows3, Settings, SquareStack, type LucideIcon } from "lucide-react";
import { prisma } from "@wireframe-av/db";

const links: Array<[string, string, LucideIcon]> = [
  ["Overview", "", SquareStack],
  ["Equipment", "equipment", PackageSearch],
  ["Schematics", "schematics", MonitorCog],
  ["Cable Schedule", "cables", Cable],
  ["Racks", "racks", Rows3],
  ["Network", "network", Network],
  ["Settings", "settings", Settings]
];

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: {
          deviceInstances: true,
          drawingPages: true,
          cables: true,
          locations: true
        }
      }
    }
  });
  if (!project) notFound();

  return (
    <main className="grid h-full min-h-0 w-full grid-cols-[260px_minmax(0,1fr)] gap-4 p-4">
      <aside className="min-h-0 overflow-auto rounded-md border border-neutral-200 bg-white p-3">
        <div className="border-b border-neutral-200 px-2 pb-3">
          <p className="text-xs font-medium uppercase text-neutral-500">Project Workspace</p>
          <h1 className="mt-1 text-sm font-semibold text-neutral-950">{project.name}</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {[project.clientName, project.projectNumber, project.status].filter(Boolean).join(" / ")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
            <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1">{project._count.deviceInstances} devices</span>
            <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1">{project._count.cables} cables</span>
            <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1">{project._count.drawingPages} pages</span>
            <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1">{project._count.locations} locations</span>
          </div>
        </div>
        <nav className="mt-3 space-y-1">
          {links.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={`/projects/${projectId}${href ? `/${href}` : ""}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
            >
              <Icon className="h-4 w-4 text-neutral-500" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-h-0 overflow-auto">{children}</section>
    </main>
  );
}
