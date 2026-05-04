import { Panel } from "@/components/ui/panel";

export default function ProjectRacksPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-neutral-950">Racks</h2>
        <p className="mt-1 text-sm text-neutral-500">Rack elevation data structures are in the database for the next pass.</p>
      </div>
      <Panel className="px-5 py-10 text-center">
        <h3 className="text-sm font-semibold text-neutral-950">Rack elevations coming soon.</h3>
      </Panel>
    </div>
  );
}
