"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { cableStatuses } from "@/lib/enums";

export type CableScheduleRow = {
  id: string;
  cableNumber: string;
  sourceDevice: string;
  sourcePort: string;
  destinationDevice: string;
  destinationPort: string;
  cableTypeId: string | null;
  cableType: string | null;
  connectorA: string | null;
  connectorB: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  estimatedLength: number | null;
  status: string;
  notes: string | null;
};

type CableTypeOption = {
  id: string;
  name: string;
};

export function CableScheduleTable({
  initialRows,
  cableTypes
}: {
  initialRows: CableScheduleRow[];
  cableTypes: CableTypeOption[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateRow(row: CableScheduleRow) {
    setSavingId(row.id);
    const response = await fetch(`/api/cables/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cableTypeId: row.cableTypeId,
        estimatedLength: row.estimatedLength,
        status: row.status,
        notes: row.notes
      })
    });

    setSavingId(null);
    if (!response.ok) {
      alert("Unable to save cable edits.");
    }
  }

  function patchRow(id: string, patch: Partial<CableScheduleRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const columns = useMemo<ColumnDef<CableScheduleRow>[]>(
    () => [
      { accessorKey: "cableNumber", header: "Cable Number" },
      { accessorKey: "sourceDevice", header: "Source Device" },
      { accessorKey: "sourcePort", header: "Source Port" },
      { accessorKey: "destinationDevice", header: "Destination Device" },
      { accessorKey: "destinationPort", header: "Destination Port" },
      {
        accessorKey: "cableTypeId",
        header: "Cable Type",
        cell: ({ row }) => (
          <Select
            value={row.original.cableTypeId ?? ""}
            onChange={(event) =>
              patchRow(row.original.id, {
                cableTypeId: event.target.value || null,
                cableType: cableTypes.find((type) => type.id === event.target.value)?.name ?? null
              })
            }
            aria-label={`Cable type for ${row.original.cableNumber}`}
          >
            <option value="">Unspecified</option>
            {cableTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        )
      },
      { accessorKey: "connectorA", header: "Connector A" },
      { accessorKey: "connectorB", header: "Connector B" },
      { accessorKey: "fromLocation", header: "From Location" },
      { accessorKey: "toLocation", header: "To Location" },
      {
        accessorKey: "estimatedLength",
        header: "Est. Length",
        cell: ({ row }) => (
          <Input
            type="number"
            min="0"
            value={row.original.estimatedLength ?? ""}
            onChange={(event) => patchRow(row.original.id, { estimatedLength: event.target.value ? Number(event.target.value) : null })}
            aria-label={`Estimated length for ${row.original.cableNumber}`}
          />
        )
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onChange={(event) => patchRow(row.original.id, { status: event.target.value })}
            aria-label={`Status for ${row.original.cableNumber}`}
          >
            {cableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        )
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <Input
            value={row.original.notes ?? ""}
            onChange={(event) => patchRow(row.original.id, { notes: event.target.value || null })}
            aria-label={`Notes for ${row.original.cableNumber}`}
          />
        )
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="secondary" onClick={() => updateRow(row.original)} disabled={savingId === row.original.id}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        )
      }
    ],
    [cableTypes, savingId]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1500px]">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</Th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <Td colSpan={15} className="py-8 text-center text-neutral-500">
                No cables yet. Valid schematic connections will appear here automatically.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
