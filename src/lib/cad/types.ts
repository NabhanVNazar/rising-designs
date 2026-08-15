/** All internal coordinates and lengths are in millimetres. */
export type Pt = { x: number; y: number };

export type Layer = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
};

type Base = { id: string; layer: string; z: number };

export type WallE = Base & {
  type: "wall";
  a: Pt;
  b: Pt;
  thickness: number;
  kind: "exterior" | "interior";
  height: number;
};
export type LineE = Base & { type: "line"; a: Pt; b: Pt };
export type PolylineE = Base & { type: "polyline"; pts: Pt[]; closed: boolean };
export type RectE = Base & { type: "rect"; x: number; y: number; w: number; h: number; rot: number };
export type CircleE = Base & { type: "circle"; c: Pt; r: number };
export type ArcE = Base & { type: "arc"; c: Pt; r: number; a0: number; a1: number };
export type PolygonE = Base & { type: "polygon"; c: Pt; r: number; sides: number; rot: number };
export type RoomE = Base & {
  type: "room";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  name: string;
};
export type OpeningE = Base & {
  type: "door" | "window";
  c: Pt;
  width: number;
  rot: number;
  swing: 1 | -1;
  height: number;
};
export type StairE = Base & {
  type: "stair";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  steps: number;
};
export type ColumnE = Base & {
  type: "column";
  c: Pt;
  size: number;
  shape: "square" | "round";
};
export type TextE = Base & { type: "text"; p: Pt; text: string; size: number; rot: number };
export type DimMode = "h" | "v" | "aligned" | "angular" | "radius" | "diameter";
export type DimE = Base & { type: "dim"; mode: DimMode; a: Pt; b: Pt; off: number };
export type MeasureE = Base & { type: "measure"; pts: Pt[] };
export type FurnitureE = Base & {
  type: "furniture";
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
};

export type Entity =
  | WallE
  | LineE
  | PolylineE
  | RectE
  | CircleE
  | ArcE
  | PolygonE
  | RoomE
  | OpeningE
  | StairE
  | ColumnE
  | TextE
  | DimE
  | MeasureE
  | FurnitureE;

export type EntityType = Entity["type"];

export type Tool =
  | "select"
  | "pan"
  | "wall"
  | "line"
  | "polyline"
  | "rect"
  | "circle"
  | "arc"
  | "polygon"
  | "room"
  | "door"
  | "window"
  | "stair"
  | "column"
  | "text"
  | "dim"
  | "measure"
  | "furniture";

export type Units = "metric" | "imperial";

export type CadDoc = {
  name: string;
  units: Units;
  gridSize: number;
  layers: Layer[];
  entities: Entity[];
};

export const DEFAULT_LAYERS: Layer[] = [
  { id: "walls", name: "Walls", color: "#1f2937", visible: true, locked: false },
  { id: "doors", name: "Doors", color: "#b45309", visible: true, locked: false },
  { id: "windows", name: "Windows", color: "#0369a1", visible: true, locked: false },
  { id: "furniture", name: "Furniture", color: "#4b5563", visible: true, locked: false },
  { id: "dimensions", name: "Dimensions", color: "#2563eb", visible: true, locked: false },
  { id: "text", name: "Text", color: "#111827", visible: true, locked: false },
  { id: "electrical", name: "Electrical", color: "#ca8a04", visible: true, locked: false },
  { id: "plumbing", name: "Plumbing", color: "#0891b2", visible: true, locked: false },
  { id: "structural", name: "Structural", color: "#7c3aed", visible: true, locked: false },
  { id: "grid", name: "Grid", color: "#94a3b8", visible: true, locked: false },
];

export const LAYER_FOR: Record<EntityType, string> = {
  wall: "walls",
  line: "walls",
  polyline: "walls",
  rect: "walls",
  circle: "walls",
  arc: "walls",
  polygon: "walls",
  room: "walls",
  door: "doors",
  window: "windows",
  stair: "structural",
  column: "structural",
  text: "text",
  dim: "dimensions",
  measure: "dimensions",
  furniture: "furniture",
};

export function emptyDoc(name = "Untitled plan"): CadDoc {
  return {
    name,
    units: "metric",
    gridSize: 500,
    layers: DEFAULT_LAYERS.map((l) => ({ ...l })),
    entities: [],
  };
}

export function cadUid() {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeDoc(value: unknown): CadDoc {
  const raw = (value ?? {}) as Partial<CadDoc>;
  const base = emptyDoc(typeof raw.name === "string" ? raw.name : "Untitled plan");
  const layers = Array.isArray(raw.layers) && raw.layers.length ? (raw.layers as Layer[]) : base.layers;
  const entities = Array.isArray(raw.entities) ? (raw.entities as Entity[]) : [];
  return {
    name: base.name,
    units: raw.units === "imperial" ? "imperial" : "metric",
    gridSize: Number(raw.gridSize) > 0 ? Number(raw.gridSize) : 500,
    layers: layers.map((l) => ({
      id: String(l.id),
      name: String(l.name ?? l.id),
      color: String(l.color ?? "#334155"),
      visible: l.visible !== false,
      locked: !!l.locked,
    })),
    entities: entities.filter((e) => !!e && typeof e === "object" && typeof e.type === "string"),
  };
}
