"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const RU_HEIGHT = 28;

export type MountedItemData = {
  id: string;
  deviceInstanceId: string;
  startRu: number;
  heightRu: number;
  side: "FRONT" | "REAR";
  deviceTag: string;
  deviceDisplayName: string | null;
  productName: string;
  productRackUnits: number | null;
};

export type SidebarDeviceData = {
  id: string;
  tag: string;
  displayName: string | null;
  productName: string;
  productModel: string;
  productRackUnits: number | null;
};

type DragPayload =
  | { type: "sidebar"; deviceId: string; heightRu: number }
  | { type: "reposition"; itemId: string; heightRu: number };

type RackCanvasProps = {
  rackId: string;
  rackName: string;
  heightRu: number;
  numberingDirection: "BOTTOM_UP" | "TOP_DOWN";
  initialItems: MountedItemData[];
  projectDevices: SidebarDeviceData[];
};

function ruDisplayIndex(ru: number, totalHeightRu: number, direction: "BOTTOM_UP" | "TOP_DOWN"): number {
  return direction === "BOTTOM_UP" ? totalHeightRu - ru : ru - 1;
}

function itemPixelTopIndex(item: MountedItemData, totalHeightRu: number, direction: "BOTTOM_UP" | "TOP_DOWN"): number {
  if (direction === "BOTTOM_UP") {
    // topmost occupied RU (highest number) determines the top pixel
    return ruDisplayIndex(item.startRu + item.heightRu - 1, totalHeightRu, direction);
  } else {
    return ruDisplayIndex(item.startRu, totalHeightRu, direction);
  }
}

function computeStartRu(targetRu: number, deviceHeightRu: number, direction: "BOTTOM_UP" | "TOP_DOWN"): number {
  // targetRu is the RU label of the row the user dropped on (the visual top of device)
  if (direction === "BOTTOM_UP") {
    // targetRu is the highest-numbered RU the device occupies
    return targetRu - deviceHeightRu + 1;
  } else {
    // targetRu is the lowest-numbered (topmost) RU the device occupies
    return targetRu;
  }
}

function hasOverlap(aStart: number, aHeight: number, bStart: number, bHeight: number): boolean {
  return aStart <= bStart + bHeight - 1 && bStart <= aStart + aHeight - 1;
}

export function RackCanvas({ rackId, heightRu, numberingDirection, initialItems, projectDevices }: RackCanvasProps) {
  const [items, setItems] = useState<MountedItemData[]>(initialItems);
  const [activeSide, setActiveSide] = useState<"FRONT" | "REAR">("FRONT");
  const [message, setMessage] = useState<string | null>(null);
  const [hoverRu, setHoverRu] = useState<number | null>(null);
  const [dragHeightRu, setDragHeightRu] = useState<number>(1);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  // Generate RU display order
  const ruDisplayOrder: number[] = [];
  if (numberingDirection === "BOTTOM_UP") {
    for (let ru = heightRu; ru >= 1; ru--) ruDisplayOrder.push(ru);
  } else {
    for (let ru = 1; ru <= heightRu; ru++) ruDisplayOrder.push(ru);
  }

  const visibleItems = items.filter((item) => item.side === activeSide);
  const placedDeviceIds = new Set(items.map((item) => item.deviceInstanceId));

  function checkConflict(startRu: number, itemHeightRu: number, excludeItemId?: string): boolean {
    return visibleItems.some((item) => {
      if (excludeItemId && item.id === excludeItemId) return false;
      return hasOverlap(startRu, itemHeightRu, item.startRu, item.heightRu);
    });
  }

  function checkBounds(startRu: number, itemHeightRu: number): boolean {
    return startRu >= 1 && startRu + itemHeightRu - 1 <= heightRu;
  }

  function handleDragOver(e: React.DragEvent, ru: number) {
    e.preventDefault();
    setHoverRu(ru);
  }

  function handleDragLeave() {
    setHoverRu(null);
  }

  async function handleDrop(e: React.DragEvent, targetRu: number) {
    e.preventDefault();
    setHoverRu(null);

    let payload: DragPayload;
    try {
      payload = JSON.parse(e.dataTransfer.getData("application/json")) as DragPayload;
    } catch {
      return;
    }

    const deviceHeightRu = payload.heightRu;
    const startRu = computeStartRu(targetRu, deviceHeightRu, numberingDirection);

    if (!checkBounds(startRu, deviceHeightRu)) {
      showMessage("Device does not fit at that position.");
      return;
    }

    if (payload.type === "sidebar") {
      const { deviceId } = payload;
      if (checkConflict(startRu, deviceHeightRu)) {
        showMessage("That position overlaps an existing device.");
        return;
      }

      const device = projectDevices.find((d) => d.id === deviceId);
      if (!device) return;

      const res = await fetch(`/api/racks/${rackId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceInstanceId: deviceId, startRu, heightRu: deviceHeightRu, side: activeSide })
      });

      if (res.status === 409) {
        showMessage("That position overlaps an existing device.");
        return;
      }
      if (!res.ok) {
        showMessage("Failed to place device.");
        return;
      }

      const { item } = (await res.json()) as {
        item: { id: string; deviceInstanceId: string; startRu: number; heightRu: number; side: string };
      };

      setItems((prev) => [
        ...prev,
        {
          id: item.id,
          deviceInstanceId: item.deviceInstanceId,
          startRu: item.startRu,
          heightRu: item.heightRu,
          side: item.side as "FRONT" | "REAR",
          deviceTag: device.tag,
          deviceDisplayName: device.displayName,
          productName: device.productName,
          productRackUnits: device.productRackUnits
        }
      ]);
    } else if (payload.type === "reposition") {
      const { itemId } = payload;
      if (checkConflict(startRu, deviceHeightRu, itemId)) {
        showMessage("That position overlaps an existing device.");
        return;
      }

      const prevItems = items;
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, startRu } : item)));

      const res = await fetch(`/api/rack-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startRu })
      });

      if (!res.ok) {
        setItems(prevItems);
        showMessage(res.status === 409 ? "That position overlaps an existing device." : "Failed to move device.");
      }
    }
  }

  async function removeItem(itemId: string) {
    const prevItems = items;
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    const res = await fetch(`/api/rack-items/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prevItems);
      showMessage("Failed to remove device.");
    }
  }

  function handleSidebarDragStart(e: React.DragEvent, device: SidebarDeviceData) {
    const h = device.productRackUnits ?? 1;
    setDragHeightRu(h);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "sidebar", deviceId: device.id, heightRu: h } satisfies DragPayload)
    );
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleItemDragStart(e: React.DragEvent, item: MountedItemData) {
    e.stopPropagation();
    setDragHeightRu(item.heightRu);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "reposition", itemId: item.id, heightRu: item.heightRu } satisfies DragPayload)
    );
    e.dataTransfer.effectAllowed = "move";
  }

  // Compute hover ghost position
  const hoverGhostTop =
    hoverRu !== null ? itemPixelTopIndex({ startRu: computeStartRu(hoverRu, dragHeightRu, numberingDirection), heightRu: dragHeightRu } as MountedItemData, heightRu, numberingDirection) * RU_HEIGHT : null;

  return (
    <div className="grid h-full min-h-[520px] grid-cols-[280px_minmax(0,1fr)] overflow-hidden rounded-md border border-neutral-200 bg-white">
      {/* Left sidebar */}
      <aside className="flex flex-col overflow-hidden border-r border-neutral-200">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-neutral-500">Project Devices</p>
          <p className="mt-0.5 text-[11px] text-neutral-400">Drag to place in rack</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projectDevices.map((device) => {
            const placed = placedDeviceIds.has(device.id);
            return (
              <div
                key={device.id}
                draggable={!placed}
                onDragStart={placed ? undefined : (e) => handleSidebarDragStart(e, device)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  placed
                    ? "cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-50"
                    : "cursor-grab border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 active:cursor-grabbing"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-950">{device.tag}</span>
                  {device.productRackUnits != null && (
                    <span className="text-[11px] text-neutral-400">{device.productRackUnits}U</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-neutral-500">
                  {device.displayName ?? device.productName}
                </div>
                {placed && <div className="mt-0.5 text-[10px] text-neutral-400">Placed</div>}
              </div>
            );
          })}
          {projectDevices.length === 0 && (
            <p className="p-3 text-xs text-neutral-400">No project devices yet.</p>
          )}
        </div>
      </aside>

      {/* Right: rack elevation */}
      <section className="flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2">
          <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5">
            {(["FRONT", "REAR"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setActiveSide(side)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  activeSide === side
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {side === "FRONT" ? "Front" : "Rear"}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-neutral-400">
            {visibleItems.length} / {heightRu} RU used
          </span>
        </div>

        {/* Rack grid */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="relative mx-auto"
            style={{ width: "100%", maxWidth: 600, height: heightRu * RU_HEIGHT }}
          >
            {/* Background RU rows */}
            {ruDisplayOrder.map((ru, visualIndex) => {
              const isHover =
                hoverRu !== null &&
                (() => {
                  const s = computeStartRu(hoverRu, dragHeightRu, numberingDirection);
                  return hasOverlap(s, dragHeightRu, ru, 1);
                })();
              return (
                <div
                  key={ru}
                  className={`absolute left-0 right-0 flex items-center border-b ${
                    isHover ? "border-blue-200 bg-blue-50" : "border-neutral-100 bg-white"
                  }`}
                  style={{ top: visualIndex * RU_HEIGHT, height: RU_HEIGHT }}
                  onDragOver={(e) => handleDragOver(e, ru)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, ru)}
                >
                  <span className="w-10 shrink-0 text-center text-[10px] text-neutral-300 select-none">{ru}</span>
                  <div className="ml-1 flex-1 border-l border-neutral-100" />
                </div>
              );
            })}

            {/* Placed device blocks */}
            {visibleItems.map((item) => {
              const topIndex = itemPixelTopIndex(item, heightRu, numberingDirection);
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  className="absolute left-11 right-0 flex cursor-grab items-center rounded border border-neutral-300 bg-neutral-50 px-2 hover:border-neutral-400 hover:bg-neutral-100 active:cursor-grabbing"
                  style={{
                    top: topIndex * RU_HEIGHT + 1,
                    height: item.heightRu * RU_HEIGHT - 2,
                    zIndex: 10
                  }}
                >
                  <div className="min-w-0 flex-1">
                    {item.heightRu === 1 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-950">{item.deviceTag}</span>
                        <span className="shrink-0 text-[11px] text-neutral-400">{item.heightRu}U</span>
                        <span className="truncate text-[11px] text-neutral-400">{item.deviceDisplayName ?? item.productName}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-950">{item.deviceTag}</span>
                          <span className="text-[11px] text-neutral-400">{item.heightRu}U</span>
                        </div>
                        <div className="truncate text-[11px] text-neutral-400">
                          {item.deviceDisplayName ?? item.productName}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-2 shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                    aria-label={`Remove ${item.deviceTag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {/* Hover ghost */}
            {hoverRu !== null && hoverGhostTop !== null && (
              <div
                className="pointer-events-none absolute left-11 right-0 rounded border-2 border-dashed border-blue-400 bg-blue-100 opacity-60"
                style={{
                  top: hoverGhostTop + 1,
                  height: dragHeightRu * RU_HEIGHT - 2,
                  zIndex: 5
                }}
              />
            )}
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-md">
            {message}
          </div>
        )}
      </section>
    </div>
  );
}
