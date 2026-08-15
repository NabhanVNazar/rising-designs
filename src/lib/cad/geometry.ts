import type { Entity, Pt, WallE } from "./types";

export const TAU = Math.PI * 2;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
/** Angle in degrees, CCW from +X, using screen-down Y (so we negate). */
export const angleDeg = (a: Pt, b: Pt) => (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
export const polar = (o: Pt, lengthMm: number, deg: number): Pt => ({
  x: o.x + lengthMm * Math.cos((deg * Math.PI) / 180),
  y: o.y - lengthMm * Math.sin((deg * Math.PI) / 180),
});

export function rotatePt(p: Pt, origin: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
}

export function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return { ...a };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function segIntersection(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d;
  if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) return null;
  return { x: a1.x + t * (a2.x - a1.x), y: a1.y + t * (a2.y - a1.y) };
}

export function polygonArea(pts: Pt[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function polygonPerimeter(pts: Pt[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) s += dist(pts[i]!, pts[(i + 1) % pts.length]!);
  return s;
}

export function centroid(pts: Pt[]): Pt {
  const a = polygonArea(pts);
  if (Math.abs(a) < 1e-6) {
    const sx = pts.reduce((s, p) => s + p.x, 0);
    const sy = pts.reduce((s, p) => s + p.y, 0);
    return { x: sx / pts.length, y: sy / pts.length };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/* ---------- entity helpers ---------- */

export function entityPoints(e: Entity): Pt[] {
  switch (e.type) {
    case "wall":
    case "line":
    case "dim":
      return [e.a, e.b];
    case "polyline":
    case "measure":
      return e.pts;
    case "rect":
    case "room":
    case "stair":
    case "furniture": {
      const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
      return [
        { x: e.x, y: e.y },
        { x: e.x + e.w, y: e.y },
        { x: e.x + e.w, y: e.y + e.h },
        { x: e.x, y: e.y + e.h },
      ].map((p) => rotatePt(p, c, e.rot));
    }
    case "circle":
    case "arc":
    case "polygon":
      return [e.c];
    case "column":
      return [e.c];
    case "door":
    case "window":
      return [e.c];
    case "text":
      return [e.p];
    default:
      return [];
  }
}

export function entityCenter(e: Entity): Pt {
  const pts = entityPoints(e);
  if (!pts.length) return { x: 0, y: 0 };
  if (pts.length === 1) return { ...pts[0]! };
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

export function entityBBox(e: Entity) {
  let pts = entityPoints(e);
  if (e.type === "circle" || e.type === "arc" || e.type === "polygon") {
    const r = e.r;
    pts = [
      { x: e.c.x - r, y: e.c.y - r },
      { x: e.c.x + r, y: e.c.y + r },
    ];
  }
  if (e.type === "column") {
    const r = e.size / 2;
    pts = [
      { x: e.c.x - r, y: e.c.y - r },
      { x: e.c.x + r, y: e.c.y + r },
    ];
  }
  if (e.type === "door" || e.type === "window") {
    const r = e.width / 2;
    pts = [
      { x: e.c.x - r, y: e.c.y - r },
      { x: e.c.x + r, y: e.c.y + r },
    ];
  }
  if (e.type === "text") pts = [e.p, { x: e.p.x + e.size * e.text.length * 0.6, y: e.p.y - e.size }];
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function translateEntity<T extends Entity>(e: T, d: Pt): T {
  const t = (p: Pt) => add(p, d);
  const c = { ...e } as Entity;
  switch (c.type) {
    case "wall":
    case "line":
    case "dim":
      return { ...c, a: t(c.a), b: t(c.b) } as T;
    case "polyline":
    case "measure":
      return { ...c, pts: c.pts.map(t) } as T;
    case "rect":
    case "room":
    case "stair":
    case "furniture":
      return { ...c, x: c.x + d.x, y: c.y + d.y } as T;
    case "circle":
    case "arc":
    case "polygon":
    case "column":
    case "door":
    case "window":
      return { ...c, c: t(c.c) } as T;
    case "text":
      return { ...c, p: t(c.p) } as T;
    default:
      return e;
  }
}

export function rotateEntity<T extends Entity>(e: T, origin: Pt, deg: number): T {
  const r = (p: Pt) => rotatePt(p, origin, deg);
  const c = { ...e } as Entity;
  switch (c.type) {
    case "wall":
    case "line":
    case "dim":
      return { ...c, a: r(c.a), b: r(c.b) } as T;
    case "polyline":
    case "measure":
      return { ...c, pts: c.pts.map(r) } as T;
    case "rect":
    case "room":
    case "stair":
    case "furniture": {
      const cen = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
      const nc = r(cen);
      return { ...c, x: nc.x - c.w / 2, y: nc.y - c.h / 2, rot: c.rot + deg } as T;
    }
    case "circle":
    case "polygon":
    case "column":
      return { ...c, c: r(c.c) } as T;
    case "arc":
      return { ...c, c: r(c.c), a0: c.a0 - deg, a1: c.a1 - deg } as T;
    case "door":
    case "window":
      return { ...c, c: r(c.c), rot: c.rot + deg } as T;
    case "text":
      return { ...c, p: r(c.p), rot: c.rot + deg } as T;
    default:
      return e;
  }
}

export function mirrorEntity<T extends Entity>(e: T, axisX: number): T {
  const m = (p: Pt) => ({ x: 2 * axisX - p.x, y: p.y });
  const c = { ...e } as Entity;
  switch (c.type) {
    case "wall":
    case "line":
    case "dim":
      return { ...c, a: m(c.a), b: m(c.b) } as T;
    case "polyline":
    case "measure":
      return { ...c, pts: c.pts.map(m) } as T;
    case "rect":
    case "room":
    case "stair":
    case "furniture":
      return { ...c, x: 2 * axisX - c.x - c.w, rot: -c.rot } as T;
    case "circle":
    case "polygon":
    case "column":
      return { ...c, c: m(c.c) } as T;
    case "arc":
      return { ...c, c: m(c.c), a0: 180 - c.a1, a1: 180 - c.a0 } as T;
    case "door":
    case "window":
      return { ...c, c: m(c.c), rot: 180 - c.rot, swing: (c.swing === 1 ? -1 : 1) as 1 | -1 } as T;
    case "text":
      return { ...c, p: m(c.p) } as T;
    default:
      return e;
  }
}

/* ---------- hit testing ---------- */

function distToSeg(p: Pt, a: Pt, b: Pt) {
  return dist(p, closestOnSegment(p, a, b));
}

export function hitTest(e: Entity, p: Pt, tol: number): boolean {
  switch (e.type) {
    case "wall":
      return distToSeg(p, e.a, e.b) <= Math.max(tol, e.thickness / 2);
    case "line":
    case "dim":
      return distToSeg(p, e.a, e.b) <= tol;
    case "polyline":
    case "measure": {
      for (let i = 0; i < e.pts.length - 1; i++)
        if (distToSeg(p, e.pts[i]!, e.pts[i + 1]!) <= tol) return true;
      if ("closed" in e && e.closed && e.pts.length > 2)
        return distToSeg(p, e.pts[e.pts.length - 1]!, e.pts[0]!) <= tol;
      return false;
    }
    case "rect":
    case "room":
    case "stair":
    case "furniture": {
      const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
      const q = rotatePt(p, c, -e.rot);
      return q.x >= e.x - tol && q.x <= e.x + e.w + tol && q.y >= e.y - tol && q.y <= e.y + e.h + tol;
    }
    case "circle":
      return dist(p, e.c) <= e.r + tol;
    case "arc":
      return Math.abs(dist(p, e.c) - e.r) <= tol * 2;
    case "polygon":
      return dist(p, e.c) <= e.r + tol;
    case "column":
      return dist(p, e.c) <= e.size;
    case "door":
    case "window":
      return dist(p, e.c) <= Math.max(tol, e.width / 2);
    case "text":
      return dist(p, e.p) <= Math.max(tol, e.size);
    default:
      return false;
  }
}

/* ---------- snapping ---------- */

export type SnapKind =
  | "grid"
  | "endpoint"
  | "midpoint"
  | "center"
  | "intersection"
  | "perpendicular"
  | "parallel"
  | "none";

export type SnapResult = { p: Pt; kind: SnapKind };

export type SnapSettings = {
  grid: boolean;
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  intersection: boolean;
  perpendicular: boolean;
  ortho: boolean;
  angleStep: number; // 0 = free
};

function segmentsOf(e: Entity): [Pt, Pt][] {
  switch (e.type) {
    case "wall":
    case "line":
      return [[e.a, e.b]];
    case "polyline":
    case "measure": {
      const segs: [Pt, Pt][] = [];
      for (let i = 0; i < e.pts.length - 1; i++) segs.push([e.pts[i]!, e.pts[i + 1]!]);
      if ("closed" in e && e.closed && e.pts.length > 2) segs.push([e.pts[e.pts.length - 1]!, e.pts[0]!]);
      return segs;
    }
    case "rect":
    case "room":
    case "stair":
    case "furniture": {
      const c = entityPoints(e);
      return c.map((p, i) => [p, c[(i + 1) % c.length]!] as [Pt, Pt]);
    }
    default:
      return [];
  }
}

export function computeSnap(
  raw: Pt,
  entities: Entity[],
  s: SnapSettings,
  gridSize: number,
  tolMm: number,
  from?: Pt | null,
): SnapResult {
  const cands: SnapResult[] = [];
  const segs: [Pt, Pt][] = [];
  for (const e of entities) segs.push(...segmentsOf(e));

  if (s.endpoint)
    for (const [a, b] of segs) {
      cands.push({ p: a, kind: "endpoint" }, { p: b, kind: "endpoint" });
    }
  if (s.midpoint) for (const [a, b] of segs) cands.push({ p: mid(a, b), kind: "midpoint" });
  if (s.center)
    for (const e of entities) {
      if (e.type === "circle" || e.type === "arc" || e.type === "polygon" || e.type === "column")
        cands.push({ p: e.c, kind: "center" });
      if (e.type === "rect" || e.type === "room" || e.type === "furniture" || e.type === "stair")
        cands.push({ p: { x: e.x + e.w / 2, y: e.y + e.h / 2 }, kind: "center" });
    }
  if (s.intersection)
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const ip = segIntersection(segs[i]![0], segs[i]![1], segs[j]![0], segs[j]![1]);
        if (ip) cands.push({ p: ip, kind: "intersection" });
      }
  if (s.perpendicular && from)
    for (const [a, b] of segs) {
      const f = closestOnSegment(from, a, b);
      cands.push({ p: f, kind: "perpendicular" });
    }

  let best: SnapResult | null = null;
  let bestD = tolMm;
  for (const c of cands) {
    const d = dist(raw, c.p);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (best) return best;

  let p = { ...raw };
  if (from && (s.ortho || s.angleStep > 0)) {
    const len = dist(from, p);
    let ang = angleDeg(from, p);
    const step = s.ortho ? 90 : s.angleStep;
    if (step > 0) ang = Math.round(ang / step) * step;
    p = polar(from, len, ang);
  }
  if (s.grid && gridSize > 0) {
    p = { x: Math.round(p.x / gridSize) * gridSize, y: Math.round(p.y / gridSize) * gridSize };
    return { p, kind: "grid" };
  }
  return { p, kind: "none" };
}

/* ---------- wall joining & room detection ---------- */

const KEY = (p: Pt) => `${Math.round(p.x)}:${Math.round(p.y)}`;

/** Snap wall endpoints that are close together so corners connect cleanly. */
export function joinWalls(walls: WallE[], tol = 120): WallE[] {
  const nodes: Pt[] = [];
  const resolve = (p: Pt): Pt => {
    for (const n of nodes) if (dist(n, p) <= tol) return n;
    const n = { ...p };
    nodes.push(n);
    return n;
  };
  return walls.map((w) => ({ ...w, a: { ...resolve(w.a) }, b: { ...resolve(w.b) } }));
}

export type DetectedRoom = {
  pts: Pt[];
  area: number;
  perimeter: number;
  center: Pt;
};

/** Planar face traversal over the wall graph to find enclosed rooms. */
export function detectRooms(walls: WallE[]): DetectedRoom[] {
  if (walls.length < 3) return [];
  // 1. split walls at intersections
  const segs: [Pt, Pt][] = walls.map((w) => [w.a, w.b]);
  const split: [Pt, Pt][] = [];
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i]!;
    const cuts: Pt[] = [a, b];
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const ip = segIntersection(a, b, segs[j]![0], segs[j]![1]);
      if (ip) cuts.push(ip);
    }
    cuts.sort((p, q) => dist(a, p) - dist(a, q));
    for (let k = 0; k < cuts.length - 1; k++) {
      if (dist(cuts[k]!, cuts[k + 1]!) > 1) split.push([cuts[k]!, cuts[k + 1]!]);
    }
  }

  // 2. build graph
  const nodes = new Map<string, Pt>();
  const adj = new Map<string, string[]>();
  const addNode = (p: Pt) => {
    const k = KEY(p);
    if (!nodes.has(k)) {
      nodes.set(k, { x: Math.round(p.x), y: Math.round(p.y) });
      adj.set(k, []);
    }
    return k;
  };
  for (const [a, b] of split) {
    const ka = addNode(a);
    const kb = addNode(b);
    if (ka === kb) continue;
    if (!adj.get(ka)!.includes(kb)) adj.get(ka)!.push(kb);
    if (!adj.get(kb)!.includes(ka)) adj.get(kb)!.push(ka);
  }

  // 3. traverse faces (always take the most clockwise turn)
  const visited = new Set<string>();
  const faces: Pt[][] = [];
  for (const [k, nbrs] of adj)
    for (const n of nbrs) {
      const eKey = `${k}->${n}`;
      if (visited.has(eKey)) continue;
      const loop: string[] = [];
      let cur = k;
      let next = n;
      let guard = 0;
      while (guard++ < 500) {
        visited.add(`${cur}->${next}`);
        loop.push(cur);
        const cp = nodes.get(cur)!;
        const np = nodes.get(next)!;
        const back = Math.atan2(cp.y - np.y, cp.x - np.x);
        const options = adj.get(next)!.filter((o) => o !== next);
        let bestO: string | null = null;
        let bestA = Infinity;
        for (const o of options) {
          if (o === cur && options.length > 1) continue;
          const op = nodes.get(o)!;
          let da = Math.atan2(op.y - np.y, op.x - np.x) - back;
          while (da <= 0) da += TAU;
          while (da > TAU) da -= TAU;
          if (da < bestA) {
            bestA = da;
            bestO = o;
          }
        }
        if (!bestO) break;
        cur = next;
        next = bestO;
        if (cur === k && next === n) break;
      }
      if (loop.length >= 3) faces.push(loop.map((id) => nodes.get(id)!));
    }

  const rooms: DetectedRoom[] = [];
  const seen = new Set<string>();
  for (const f of faces) {
    const area = polygonArea(f);
    if (area <= 0) continue; // outer face / wrong orientation
    const a = Math.abs(area);
    if (a < 1e6) continue; // < 1 m²
    const key = f
      .map(KEY)
      .sort()
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    rooms.push({ pts: f, area: a, perimeter: polygonPerimeter(f), center: centroid(f) });
  }
  // drop the enclosing boundary if it equals the sum of the others
  rooms.sort((x, y) => y.area - x.area);
  if (rooms.length > 1) {
    const rest = rooms.slice(1).reduce((s, r) => s + r.area, 0);
    if (rooms[0]! && Math.abs(rooms[0]!.area - rest) / rooms[0]!.area < 0.08) rooms.shift();
  }
  return rooms;
}
