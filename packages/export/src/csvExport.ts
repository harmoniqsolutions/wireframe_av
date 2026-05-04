export type CableScheduleCsvRow = Record<string, string | number | null | undefined>;

const columns = [
  "Cable Number",
  "Source Device",
  "Source Port",
  "Destination Device",
  "Destination Port",
  "Cable Type",
  "Connector A",
  "Connector B",
  "From Location",
  "To Location",
  "Estimated Length",
  "Status",
  "Notes"
];

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

export function exportCableScheduleCsv(rows: CableScheduleCsvRow[]) {
  const header = columns.map(escapeCsvValue).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(","));
  return [header, ...body].join("\n");
}
