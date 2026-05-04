import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@wireframe-av/db";

const links = [
  ["Overview", ""],
  ["Equipment", "equipment"],
  ["Schematics", "schematics"],
  ["Cable Schedule", "cables"],
  ["Racks", "racks"],
  ["Settings", "settings"]
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
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[220px_1fr] gap-6 px-6 py-6">
      <aside className="h-fit rounded-md border border-neutral-200 bg-white p-3">
        <div className="border-b border-neutral-200 px-2 pb-3">
          <p className="text-xs font-medium uppercase text-neutral-500">Project</p>
          <h1 className="mt-1 text-sm font-semibold text-neutral-950">{project.name}</h1>
        </div>
        <nav className="mt-3 space-y-1">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={`/projects/${projectId}${href ? `/${href}` : ""}`}
              className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </main>
  );
}
