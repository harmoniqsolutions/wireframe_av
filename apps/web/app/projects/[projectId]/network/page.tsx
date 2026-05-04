import { Panel } from "@/components/ui/panel";

export default function ProjectNetworkPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-neutral-950">Network Diagrams</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Dedicated AV network views will filter project devices, switch ports, VLAN data, and AV-over-IP endpoints.
        </p>
      </div>
      <Panel className="px-5 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-sm font-semibold text-neutral-950">Network documentation workspace coming soon.</h3>
          <p className="mt-2 text-sm text-neutral-500">
            The foundation is already in place through device ports, signal types, and cable records. This section will become a focused network
            drawing and switch-port schedule view.
          </p>
        </div>
      </Panel>
    </div>
  );
}
