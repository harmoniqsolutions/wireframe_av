const SIGNAL_COLORS: Record<string, string> = {
  "AC Power": "#525252",
  "Analog Audio Balanced": "#0f766e",
  "AV-over-IP": "#2563eb",
  "Cresnet": "#7c3aed",
  "Dante/AES67": "#0891b2",
  "Digital Audio AES3": "#0d9488",
  "DigitalMedia (DM)": "#4338ca",
  "Fiber": "#ea580c",
  "GPIO": "#6d28d9",
  "HDMI Video": "#16a34a",
  "IR Control": "#9333ea",
  "Network Data": "#2563eb",
  "RS-232 Control": "#7c3aed",
  "RS-485 Control": "#7c3aed",
  "SDI Video": "#dc2626",
  "Speaker Level Audio": "#ca8a04",
  "USB": "#4f46e5"
};

export function colorForSignal(signalTypeName?: string | null) {
  if (!signalTypeName) return "#737373";
  return SIGNAL_COLORS[signalTypeName] ?? "#737373";
}
