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

export type FloorPlan = {
  rooms: Room[];
  openings: Opening[];
};

export const emptyPlan: FloorPlan = { rooms: [], openings: [] };

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
