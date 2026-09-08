export type Room = {
  id: string;
  name: string;
  /** feet */
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
};

export type Opening = {
  id: string;
  type: "door" | "window";
  x: number;
  y: number;
  /** feet */
  len: number;
  /** 0 = horizontal, 90 = vertical */
  rot: 0 | 90;
};

export type Wall = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Label = {
  id: string;
  x: number;
  y: number;
  text: string;
};

export type Dim = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FloorPlan = {
  rooms: Room[];
  openings: Opening[];
  walls: Wall[];
  labels: Label[];
  dims: Dim[];
};

export const emptyPlan: FloorPlan = { rooms: [], openings: [], walls: [], labels: [], dims: [] };

export const PX_PER_FT = 14;


export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function roomArea(r: Room) {
  return Math.round(r.w * r.h);
}

export function planArea(plan: FloorPlan) {
  return plan.rooms.reduce((sum, r) => sum + roomArea(r), 0);
}

export function normalizePlan(value: unknown): FloorPlan {
  const raw = (value ?? {}) as Partial<FloorPlan>;
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  const openings = Array.isArray(raw.openings) ? raw.openings : [];
  return {
    rooms: rooms
      .filter((r): r is Room => !!r && typeof r === "object")
      .map((r, i) => ({
        id: String(r.id ?? uid()),
        name: String(r.name ?? `Room ${i + 1}`),
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        w: Math.max(3, Number(r.w) || 10),
        h: Math.max(3, Number(r.h) || 10),
        tone: Number.isFinite(Number(r.tone)) ? Number(r.tone) : i % 6,
      })),
    openings: openings
      .filter((o): o is Opening => !!o && typeof o === "object")
      .map((o) => ({
        id: String(o.id ?? uid()),
        type: o.type === "window" ? "window" : "door",
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        len: Math.max(1, Number(o.len) || 3),
        rot: Number(o.rot) === 90 ? 90 : 0,
      })),
    walls: (Array.isArray(raw.walls) ? raw.walls : [])
      .filter((w): w is Wall => !!w && typeof w === "object")
      .map((w) => ({
        id: String(w.id ?? uid()),
        x1: Number(w.x1) || 0,
        y1: Number(w.y1) || 0,
        x2: Number(w.x2) || 0,
        y2: Number(w.y2) || 0,
      })),
    labels: (Array.isArray(raw.labels) ? raw.labels : [])
      .filter((l): l is Label => !!l && typeof l === "object")
      .map((l) => ({
        id: String(l.id ?? uid()),
        x: Number(l.x) || 0,
        y: Number(l.y) || 0,
        text: String(l.text ?? "Note"),
      })),
    dims: (Array.isArray(raw.dims) ? raw.dims : [])
      .filter((d): d is Dim => !!d && typeof d === "object")
      .map((d) => ({
        id: String(d.id ?? uid()),
        x1: Number(d.x1) || 0,
        y1: Number(d.y1) || 0,
        x2: Number(d.x2) || 0,
        y2: Number(d.y2) || 0,
      })),
  };
}


export const ROOM_TONES = [
  "oklch(0.62 0.13 195)",
  "oklch(0.68 0.14 150)",
  "oklch(0.72 0.14 75)",
  "oklch(0.64 0.13 250)",
  "oklch(0.66 0.15 20)",
  "oklch(0.6 0.1 300)",
];

export function toneColor(tone: number) {
  return ROOM_TONES[((tone % ROOM_TONES.length) + ROOM_TONES.length) % ROOM_TONES.length];
}

const MM_PER_FT = 304.8;

/** Build a plan (feet) from a CAD document so the 3D and elevation views can extrude it. */
export function planFromCad(cad: unknown): FloorPlan {
  const doc = (cad ?? {}) as { entities?: unknown };
  const ents = Array.isArray(doc.entities) ? (doc.entities as Record<string, unknown>[]) : [];
  const n = (v: unknown) => Number(v) || 0;
  const cadRooms = ents.filter((e) => e["type"] === "room");
  const cadWalls = ents.filter((e) => e["type"] === "wall");
  const cadOpen = ents.filter((e) => e["type"] === "door" || e["type"] === "window");
  if (!cadRooms.length && !cadWalls.length) return emptyPlan;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of cadRooms) {
    xs.push(n(r["x"]));
    ys.push(n(r["y"]));
  }
  for (const w of cadWalls) {
    const a = (w["a"] ?? {}) as Record<string, unknown>;
    const b = (w["b"] ?? {}) as Record<string, unknown>;
    xs.push(n(a["x"]), n(b["x"]));
    ys.push(n(a["y"]), n(b["y"]));
  }
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const fx = (v: number) => (v - minX) / MM_PER_FT;
  const fy = (v: number) => (v - minY) / MM_PER_FT;

  return {
    ...emptyPlan,
    rooms: cadRooms.map((r, i) => ({
      id: String(r["id"] ?? uid()),
      name: String(r["name"] ?? `Room ${i + 1}`),
      x: fx(n(r["x"])),
      y: fy(n(r["y"])),
      w: Math.max(1, n(r["w"]) / MM_PER_FT),
      h: Math.max(1, n(r["h"]) / MM_PER_FT),
      tone: i % 6,
    })),
    walls: cadWalls.map((w) => {
      const a = (w["a"] ?? {}) as Record<string, unknown>;
      const b = (w["b"] ?? {}) as Record<string, unknown>;
      return {
        id: String(w["id"] ?? uid()),
        x1: fx(n(a["x"])),
        y1: fy(n(a["y"])),
        x2: fx(n(b["x"])),
        y2: fy(n(b["y"])),
      };
    }),
    openings: cadOpen.map((o) => {
      const c = (o["c"] ?? {}) as Record<string, unknown>;
      const rot = Math.abs(((n(o["rot"]) % 180) + 180) % 180 - 90) < 45 ? 90 : 0;
      return {
        id: String(o["id"] ?? uid()),
        type: o["type"] === "window" ? ("window" as const) : ("door" as const),
        x: fx(n(c["x"])),
        y: fy(n(c["y"])),
        len: Math.max(1, n(o["width"]) / MM_PER_FT),
        rot: rot as 0 | 90,
      };
    }),
  };
}
