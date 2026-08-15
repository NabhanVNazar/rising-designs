import { parseLen } from "./units";
import type { Tool, Units } from "./types";

export type CommandResult =
  | { kind: "tool"; tool: Tool }
  | { kind: "length"; length: number }
  | { kind: "polar"; length: number; angle: number }
  | { kind: "relative"; dx: number; dy: number }
  | { kind: "absolute"; x: number; y: number }
  | { kind: "room"; w: number; h: number }
  | { kind: "wall"; length: number; angle: number }
  | { kind: "door"; width: number }
  | { kind: "window"; width: number }
  | { kind: "action"; action: string }
  | { kind: "unknown"; message: string };

const TOOLS: Tool[] = [
  "select",
  "pan",
  "wall",
  "line",
  "polyline",
  "rect",
  "circle",
  "arc",
  "polygon",
  "room",
  "door",
  "window",
  "stair",
  "column",
  "text",
  "dim",
  "measure",
];

const ACTIONS = [
  "move",
  "rotate",
  "copy",
  "paste",
  "delete",
  "mirror",
  "duplicate",
  "undo",
  "redo",
  "save",
  "zoomfit",
  "fit",
  "ortho",
  "grid",
  "export png",
  "export svg",
  "export pdf",
  "export dxf",
];

export function parseCommand(input: string, units: Units): CommandResult {
  const raw = input.trim();
  if (!raw) return { kind: "unknown", message: "Empty command" };
  const s = raw.toLowerCase();

  // relative polar: @4500<45
  let m = s.match(/^@\s*([^<,]+)\s*<\s*(-?[\d.]+)$/);
  if (m) {
    const len = parseLen(m[1]!, units);
    if (len !== null) return { kind: "polar", length: len, angle: parseFloat(m[2]!) };
  }
  // relative cartesian: @4500,0
  m = s.match(/^@\s*(-?[^,]+)\s*,\s*(-?.+)$/);
  if (m) {
    const dx = parseLen(m[1]!, units);
    const dy = parseLen(m[2]!, units);
    if (dx !== null && dy !== null) return { kind: "relative", dx, dy };
  }
  // absolute cartesian: 1000,2000
  m = s.match(/^(-?[\d.]+(?:mm|cm|m|ft|in)?)\s*,\s*(-?[\d.]+(?:mm|cm|m|ft|in)?)$/);
  if (m) {
    const x = parseLen(m[1]!, units);
    const y = parseLen(m[2]!, units);
    if (x !== null && y !== null) return { kind: "absolute", x, y };
  }
  // length < angle
  m = s.match(/^([^<]+)\s*<\s*(-?[\d.]+)$/);
  if (m) {
    const len = parseLen(m[1]!, units);
    if (len !== null) return { kind: "polar", length: len, angle: parseFloat(m[2]!) };
  }
  // plain length
  const plain = parseLen(s, units);
  if (plain !== null) return { kind: "length", length: plain };

  // natural language: room
  m = s.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|ft|meter|meters|metre|metres|foot|feet)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|ft|meter|meters|metre|metres|foot|feet)?/);
  if (m && /room|space|bedroom|kitchen|hall|bath/.test(s)) {
    const unit = (u?: string) => (u ? u.replace(/^(meter|metre)s?$/, "m").replace(/^(foot|feet)$/, "ft") : "");
    const w = parseLen(`${m[1]}${unit(m[2]) || unit(m[4])}`, units);
    const h = parseLen(`${m[3]}${unit(m[4]) || unit(m[2])}`, units);
    if (w && h) return { kind: "room", w, h };
  }

  const num = s.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|ft|meter|meters|metre|metres|foot|feet)?/);
  const unitOf = (u?: string) =>
    u ? u.replace(/^(meter|metre)s?$/, "m").replace(/^(foot|feet)$/, "ft") : "";
  const value = num ? parseLen(`${num[1]}${unitOf(num[2])}`, units) : null;
  const angleM = s.match(/(-?\d+(?:\.\d+)?)\s*(?:deg|°|degrees)/);

  if (/wall/.test(s) && value) return { kind: "wall", length: value, angle: angleM ? parseFloat(angleM[1]!) : 0 };
  if (/door/.test(s) && value) return { kind: "door", width: value };
  if (/window/.test(s) && value) return { kind: "window", width: value };

  for (const t of TOOLS) if (s === t || s.startsWith(`${t} `) || s === `${t} tool`) return { kind: "tool", tool: t };
  if (/^dimension/.test(s)) return { kind: "tool", tool: "dim" };
  if (/^rectangle/.test(s)) return { kind: "tool", tool: "rect" };
  if (/^text/.test(s)) return { kind: "tool", tool: "text" };

  for (const a of ACTIONS) if (s === a || s.startsWith(a)) return { kind: "action", action: a };

  return { kind: "unknown", message: `Unknown command: ${raw}` };
}
