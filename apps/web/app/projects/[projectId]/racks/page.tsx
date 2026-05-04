import { Panel } from "@/components/ui/panel";

export default function ProjectRacksPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-neutral-950">Racks</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Rack and mounted item data structures are ready for a future elevation editor.
        </p>
      </div>
      <Panel className="px-5 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-sm font-semibold text-neutral-950">Rack elevations coming soon.</h3>
          <p className="mt-2 text-sm text-neutral-500">
            This workspace will place project devices into RU positions, front/rear views, and rack-specific schedules without disconnecting from
            the structured equipment list.
          </p>
        </div>
      </Panel>
    </div>
  );
}
