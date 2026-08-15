import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Box,
  Circle as CircleIcon,
  Columns3,
  Copy,
  DoorOpen,
  Download,
  FlipHorizontal,
  Grid3x3,
  Hand,
  Layers,
  Lock,
  Maximize,
  Minus,
  MousePointer2,
  Move,
  PanelRight,
  Pencil,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Ruler,
  Save,
  Search,
  Slash,
  Sofa,
  Spline,
  Square,
  Stamp,
  Trash2,
  Triangle,
  Type as TypeIcon,
  Undo2,
  Unlock,
  Upload,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import type { CadDoc, Entity, Pt, Tool, Units } from "@/lib/cad/types";
import { LAYER_FOR, cadUid, emptyDoc } from "@/lib/cad/types";
import {
  angleDeg,
  closestOnSegment,
  computeSnap,
  detectRooms,
  dist,
  entityCenter,
  hitTest,
  joinWalls,
  mirrorEntity,
  polar,
  rotateEntity,
  translateEntity,
  type SnapSettings,
} from "@/lib/cad/geometry";
import { fmtArea, fmtCoord, fmtLen, parseLen } from "@/lib/cad/units";
import { parseCommand } from "@/lib/cad/command";
import {
  docBounds,
  exportDXF,
  exportJSON,
  exportRaster,
  exportSVG,
  importDXF,
  importJSONFile,
  printSheet,
  type SheetSize,
} from "@/lib/cad/io";
import { EntityView, SelectionHandles } from "./EntityView";
import { LIBRARY, LIB_GROUPS, libItem } from "./library";

type View = { k: number; tx: number; ty: number };

const TOOL_LIST: { tool: Tool; label: string; icon: typeof Square; key: string }[] = [
  { tool: "select", label: "Select", icon: MousePointer2, key: "V" },
  { tool: "pan", label: "Pan", icon: Hand, key: "H" },
  { tool: "wall", label: "Wall", icon: Columns3, key: "W" },
  { tool: "line", label: "Line", icon: Slash, key: "L" },
  { tool: "polyline", label: "Polyline", icon: Spline, key: "P" },
  { tool: "rect", label: "Rectangle", icon: Square, key: "R" },
  { tool: "circle", label: "Circle", icon: CircleIcon, key: "C" },
  { tool: "arc", label: "Arc", icon: ArrowUpRight, key: "A" },
  { tool: "polygon", label: "Polygon", icon: Triangle, key: "G" },
  { tool: "room", label: "Room", icon: Box, key: "O" },
  { tool: "door", label: "Door", icon: DoorOpen, key: "D" },
  { tool: "window", label: "Window", icon: PanelRight, key: "N" },
  { tool: "stair", label: "Staircase", icon: Layers, key: "S" },
  { tool: "column", label: "Column", icon: Stamp, key: "K" },
  { tool: "text", label: "Text", icon: TypeIcon, key: "T" },
  { tool: "dim", label: "Dimension", icon: Ruler, key: "M" },
  { tool: "measure", label: "Measure area", icon: Pencil, key: "Q" },
];

const DEFAULTS = {
  wallThickness: 230,
  wallHeight: 3000,
  doorWidth: 900,
  windowWidth: 1200,
  columnSize: 300,
  textSize: 300,
  polygonSides: 6,
  stairSteps: 12,
};

export function CadEditor({
  initialDoc,
  onPersist,
  projectName,
}: {
  initialDoc: CadDoc;
  onPersist?: (doc: CadDoc) => Promise<void> | void;
  projectName?: string;
}) {
  const [doc, setDocState] = useState<CadDoc>(initialDoc);
  const [past, setPast] = useState<CadDoc[]>([]);
  const [future, setFuture] = useState<CadDoc[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [sel, setSel] = useState<string[]>([]);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt>({ x: 0, y: 0 });
  const [snapPt, setSnapPt] = useState<{ p: Pt; kind: string } | null>(null);
  const [view, setView] = useState<View>({ k: 0.05, tx: 0, ty: 0 });
  const [ortho, setOrtho] = useState(true);
  const [angleStep, setAngleStep] = useState(0);
  const [snaps, setSnaps] = useState<Omit<SnapSettings, "ortho" | "angleStep">>({
    grid: true,
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    perpendicular: true,
  });
  const [command, setCommand] = useState("");
  const [rightTab, setRightTab] = useState<"props" | "layers" | "library" | "rooms">("props");
  const [wallKind, setWallKind] = useState<"exterior" | "interior">("exterior");
  const [wallThickness, setWallThickness] = useState(DEFAULTS.wallThickness);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const [dragging, setDragging] = useState<{ start: Pt; orig: Entity[] } | null>(null);
  const [panning, setPanning] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [clipboard, setClipboard] = useState<Entity[]>([]);
  const [sheet, setSheet] = useState<SheetSize>("A3");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ------------------------------ doc helpers ------------------------------ */

  const commit = useCallback((updater: (d: CadDoc) => CadDoc) => {
    setDocState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      setPast((p) => [...p.slice(-99), prev]);
      setFuture([]);
      setDirty(true);
      return next;
    });
  }, []);

  const addEntities = useCallback(
    (items: Entity[]) => {
      if (!items.length) return;
      commit((d) => ({ ...d, entities: [...d.entities, ...items] }));
      setSel(items.map((i) => i.id));
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1]!;
      setDocState((cur) => {
        setFuture((f) => [cur, ...f].slice(0, 100));
        return prev;
      });
      setDirty(true);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0]!;
      setDocState((cur) => {
        setPast((p) => [...p, cur]);
        return next;
      });
      setDirty(true);
      return f.slice(1);
    });
  }, []);

  const layerOf = useCallback((id: string) => doc.layers.find((l) => l.id === id), [doc.layers]);

  const visibleEntities = useMemo(
    () => doc.entities.filter((e) => layerOf(e.layer)?.visible !== false),
    [doc.entities, layerOf],
  );
  const pickableEntities = useMemo(
    () => visibleEntities.filter((e) => !layerOf(e.layer)?.locked),
    [visibleEntities, layerOf],
  );

  const walls = useMemo(
    () => doc.entities.filter((e): e is Extract<Entity, { type: "wall" }> => e.type === "wall"),
    [doc.entities],
  );
  const rooms = useMemo(() => detectRooms(walls), [walls]);
  const totalArea = useMemo(
    () =>
      rooms.reduce((s, r) => s + r.area, 0) +
      doc.entities.reduce((s, e) => (e.type === "room" ? s + e.w * e.h : s), 0),
    [rooms, doc.entities],
  );

  /* -------------------------------- view ---------------------------------- */

  const toWorld = useCallback(
    (clientX: number, clientY: number): Pt => {
      const r = svgRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left - view.tx) / view.k, y: (clientY - r.top - view.ty) / view.k };
    },
    [view],
  );

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const b = docBounds(doc);
    const k = Math.min(el.clientWidth / b.w, el.clientHeight / b.h) * 0.9;
    setView({ k, tx: el.clientWidth / 2 - (b.x + b.w / 2) * k, ty: el.clientHeight / 2 - (b.y + b.h / 2) * k });
  }, [doc]);

  useEffect(() => {
    const t = setTimeout(fit, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const dy = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      const next = Math.min(2, Math.max(0.002, v.k * Math.exp(-dy * 0.0015)));
      const r = el.getBoundingClientRect();
      const px = ev.clientX - r.left;
      const py = ev.clientY - r.top;
      const ratio = next / v.k;
      setView({ k: next, tx: px - (px - v.tx) * ratio, ty: py - (py - v.ty) * ratio });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const px = el.clientWidth / 2;
    const py = el.clientHeight / 2;
    setView((v) => {
      const next = Math.min(2, Math.max(0.002, v.k * f));
      const ratio = next / v.k;
      return { k: next, tx: px - (px - v.tx) * ratio, ty: py - (py - v.ty) * ratio };
    });
  };

  /* ------------------------------- snapping -------------------------------- */

  const snapSettings: SnapSettings = { ...snaps, ortho, angleStep };
  const tolMm = 14 / view.k;

  const snapWorld = useCallback(
    (raw: Pt, from?: Pt | null) =>
      computeSnap(raw, visibleEntities, { ...snaps, ortho, angleStep }, doc.gridSize, tolMm, from),
    [visibleEntities, snaps, ortho, angleStep, doc.gridSize, tolMm],
  );

  /** Snap an opening onto the closest wall and align to it. */
  const hostOnWall = (p: Pt) => {
    let best: { c: Pt; rot: number; d: number } | null = null;
    for (const w of walls) {
      const f = closestOnSegment(p, w.a, w.b);
      const d = dist(p, f);
      if (!best || d < best.d) best = { c: f, rot: angleDeg(w.a, w.b), d };
    }
    if (best && best.d < 900) return { c: best.c, rot: best.rot };
    return { c: p, rot: 0 };
  };

  /* ------------------------------- creation -------------------------------- */

  const mk = (e: Record<string, unknown>): Entity =>
    ({
      id: cadUid(),
      layer: LAYER_FOR[e["type"] as keyof typeof LAYER_FOR],
      z: 0,
      ...e,
    }) as unknown as Entity;


  const finishDraft = useCallback(
    (pts: Pt[], t: Tool) => {
      if (t === "polyline" && pts.length > 1)
        addEntities([mk({ type: "polyline", pts, closed: false } as never)]);
      if (t === "measure" && pts.length > 1) addEntities([mk({ type: "measure", pts } as never)]);
      setDraft([]);
    },
    [addEntities],
  );

  const placeAt = useCallback(
    (p: Pt) => {
      switch (tool) {
        case "door":
        case "window": {
          const host = hostOnWall(p);
          addEntities([
            mk({
              type: tool,
              c: host.c,
              rot: host.rot,
              width: tool === "door" ? DEFAULTS.doorWidth : DEFAULTS.windowWidth,
              swing: 1,
              height: tool === "door" ? 2100 : 1200,
            } as never),
          ]);
          break;
        }
        case "column":
          addEntities([mk({ type: "column", c: p, size: DEFAULTS.columnSize, shape: "square" } as never)]);
          break;
        case "stair":
          addEntities([
            mk({ type: "stair", x: p.x, y: p.y, w: 1000, h: 3000, rot: 0, steps: DEFAULTS.stairSteps } as never),
          ]);
          break;
        case "text": {
          const t = window.prompt("Text", "Note");
          if (t) addEntities([mk({ type: "text", p, text: t, size: DEFAULTS.textSize, rot: 0 } as never)]);
          break;
        }
        default:
          break;
      }
    },
    [tool, addEntities, walls],
  );

  const commitTwoPoint = useCallback(
    (a: Pt, b: Pt, t: Tool) => {
      switch (t) {
        case "wall":
          if (dist(a, b) < 1) return;
          addEntities([
            mk({
              type: "wall",
              a,
              b,
              thickness: wallThickness,
              kind: wallKind,
              height: DEFAULTS.wallHeight,
            } as never),
          ]);
          break;
        case "line":
          addEntities([mk({ type: "line", a, b } as never)]);
          break;
        case "rect":
        case "room": {
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          const w = Math.abs(b.x - a.x);
          const h = Math.abs(b.y - a.y);
          if (w < 1 || h < 1) return;
          addEntities([
            t === "room"
              ? mk({ type: "room", x, y, w, h, rot: 0, name: `Room ${doc.entities.filter((e) => e.type === "room").length + 1}` } as never)
              : mk({ type: "rect", x, y, w, h, rot: 0 } as never),
          ]);
          break;
        }
        case "circle":
          addEntities([mk({ type: "circle", c: a, r: dist(a, b) } as never)]);
          break;
        case "polygon":
          addEntities([
            mk({ type: "polygon", c: a, r: dist(a, b), sides: DEFAULTS.polygonSides, rot: angleDeg(a, b) } as never),
          ]);
          break;
        case "dim":
          addEntities([mk({ type: "dim", mode: "aligned", a, b, off: 600 } as never)]);
          break;
        default:
          break;
      }
    },
    [addEntities, wallKind, wallThickness, doc.entities],
  );

  /* ------------------------------ interaction ------------------------------ */

  function onPointerDown(ev: React.PointerEvent) {
    if (ev.button === 1 || (ev.button === 0 && tool === "pan") || ev.altKey) {
      setPanning({ x: ev.clientX, y: ev.clientY, tx: view.tx, ty: view.ty });
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
      return;
    }
    if (ev.button !== 0) return;
    const raw = toWorld(ev.clientX, ev.clientY);
    const from = draft.length ? draft[draft.length - 1]! : null;
    const p = snapWorld(raw, from).p;

    if (tool === "select") {
      const hit = [...pickableEntities].reverse().find((e) => hitTest(e, raw, tolMm));
      if (hit) {
        const next = ev.shiftKey
          ? sel.includes(hit.id)
            ? sel.filter((i) => i !== hit.id)
            : [...sel, hit.id]
          : sel.includes(hit.id)
            ? sel
            : [hit.id];
        setSel(next);
        setDragging({ start: p, orig: doc.entities.filter((e) => next.includes(e.id)) });
      } else {
        if (!ev.shiftKey) setSel([]);
        setMarquee({ a: raw, b: raw });
      }
      return;
    }

    if (["door", "window", "column", "stair", "text"].includes(tool)) {
      placeAt(p);
      return;
    }

    if (tool === "polyline" || tool === "measure") {
      setDraft((d) => [...d, p]);
      return;
    }

    if (tool === "arc") {
      const d = [...draft, p];
      if (d.length === 3) {
        const [c, s, e2] = d as [Pt, Pt, Pt];
        addEntities([mk({ type: "arc", c, r: dist(c, s), a0: angleDeg(c, s), a1: angleDeg(c, e2) } as never)]);
        setDraft([]);
      } else setDraft(d);
      return;
    }

    // two-point tools
    if (draft.length === 0) setDraft([p]);
    else {
      commitTwoPoint(draft[0]!, p, tool);
      setDraft(tool === "wall" ? [p] : []);
    }
  }

  function onPointerMove(ev: React.PointerEvent) {
    const raw = toWorld(ev.clientX, ev.clientY);
    if (panning) {
      setView((v) => ({ ...v, tx: panning.tx + (ev.clientX - panning.x), ty: panning.ty + (ev.clientY - panning.y) }));
      return;
    }
    const from = draft.length ? draft[draft.length - 1]! : null;
    const s = snapWorld(raw, from);
    setCursor(s.p);
    setSnapPt(s.kind === "grid" || s.kind === "none" ? null : { p: s.p, kind: s.kind });

    if (marquee) setMarquee({ ...marquee, b: raw });

    if (dragging) {
      const d = { x: s.p.x - dragging.start.x, y: s.p.y - dragging.start.y };
      setDocState((doc0) => ({
        ...doc0,
        entities: doc0.entities.map((e) => {
          const o = dragging.orig.find((q) => q.id === e.id);
          return o ? translateEntity(o, d) : e;
        }),
      }));
    }
  }

  function onPointerUp() {
    if (panning) setPanning(null);
    if (dragging) {
      setPast((p) => [...p, { ...doc, entities: dragging.orig.concat(doc.entities.filter((e) => !dragging.orig.some((o) => o.id === e.id))) }]);
      setDirty(true);
      setDragging(null);
    }
    if (marquee) {
      const x1 = Math.min(marquee.a.x, marquee.b.x);
      const x2 = Math.max(marquee.a.x, marquee.b.x);
      const y1 = Math.min(marquee.a.y, marquee.b.y);
      const y2 = Math.max(marquee.a.y, marquee.b.y);
      if (Math.abs(x2 - x1) > tolMm && Math.abs(y2 - y1) > tolMm) {
        const inside = pickableEntities.filter((e) => {
          const c = entityCenter(e);
          return c.x >= x1 && c.x <= x2 && c.y >= y1 && c.y <= y2;
        });
        setSel(inside.map((e) => e.id));
      }
      setMarquee(null);
    }
  }

  function onDoubleClick() {
    if (draft.length) finishDraft(draft, tool);
  }

  /* ------------------------------- commands -------------------------------- */

  const selected = doc.entities.filter((e) => sel.includes(e.id));

  const deleteSel = useCallback(() => {
    if (!sel.length) return;
    commit((d) => ({ ...d, entities: d.entities.filter((e) => !sel.includes(e.id)) }));
    setSel([]);
  }, [sel, commit]);

  const duplicateSel = useCallback(() => {
    const copies = doc.entities
      .filter((e) => sel.includes(e.id))
      .map((e) => ({ ...translateEntity(e, { x: 500, y: 500 }), id: cadUid() }));
    addEntities(copies);
  }, [doc.entities, sel, addEntities]);

  const rotateSel = useCallback(
    (deg: number) => {
      if (!sel.length) return;
      const items = doc.entities.filter((e) => sel.includes(e.id));
      const c = entityCenter(items[0]!);
      commit((d) => ({
        ...d,
        entities: d.entities.map((e) => (sel.includes(e.id) ? rotateEntity(e, c, deg) : e)),
      }));
    },
    [doc.entities, sel, commit],
  );

  const mirrorSel = useCallback(() => {
    if (!sel.length) return;
    const items = doc.entities.filter((e) => sel.includes(e.id));
    const axis = entityCenter(items[0]!).x;
    commit((d) => ({ ...d, entities: d.entities.map((e) => (sel.includes(e.id) ? mirrorEntity(e, axis) : e)) }));
  }, [doc.entities, sel, commit]);

  const autoJoin = useCallback(() => {
    commit((d) => {
      const joined = joinWalls(d.entities.filter((e): e is Extract<Entity, { type: "wall" }> => e.type === "wall"));
      let i = 0;
      return { ...d, entities: d.entities.map((e) => (e.type === "wall" ? joined[i++]! : e)) };
    });
    toast.success("Wall corners joined");
  }, [commit]);

  const save = useCallback(async () => {
    if (!onPersist) return;
    setSaving(true);
    try {
      await onPersist(doc);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [doc, onPersist]);

  // autosave
  useEffect(() => {
    if (!dirty || !onPersist) return;
    const t = setTimeout(() => void save(), 4000);
    return () => clearTimeout(t);
  }, [dirty, doc, onPersist, save]);

  function runAction(action: string) {
    switch (action) {
      case "undo":
        return undo();
      case "redo":
        return redo();
      case "delete":
        return deleteSel();
      case "duplicate":
      case "copy":
        return setClipboard(selected.map((e) => ({ ...e })));
      case "paste":
        return addEntities(clipboard.map((e) => ({ ...translateEntity(e, { x: 600, y: 600 }), id: cadUid() })));
      case "mirror":
        return mirrorSel();
      case "rotate":
        return rotateSel(90);
      case "move":
        return setTool("select");
      case "save":
        return void save();
      case "fit":
      case "zoomfit":
        return fit();
      case "ortho":
        return setOrtho((o) => !o);
      case "grid":
        return setSnaps((s) => ({ ...s, grid: !s.grid }));
      case "export png":
        return void exportRaster(svgRef.current!, doc, "png");
      case "export svg":
        return exportSVG(svgRef.current!, doc);
      case "export pdf":
        return printSheet(svgRef.current!, doc, sheet, `1:${Math.round(1 / (view.k * 10))}`);
      case "export dxf":
        return exportDXF(doc);
      default:
        toast.message(`No handler for "${action}"`);
    }
  }

  function submitCommand(e: React.FormEvent) {
    e.preventDefault();
    const res = parseCommand(command, doc.units);
    const from = draft.length ? draft[draft.length - 1]! : cursor;
    switch (res.kind) {
      case "tool":
        setTool(res.tool);
        setDraft([]);
        break;
      case "length": {
        const ang = draft.length ? angleDeg(from, cursor) : 0;
        applyPoint(polar(from, res.length, ortho ? Math.round(ang / 90) * 90 : ang));
        break;
      }
      case "polar":
        applyPoint(polar(from, res.length, res.angle));
        break;
      case "relative":
        applyPoint({ x: from.x + res.dx, y: from.y - res.dy });
        break;
      case "absolute":
        applyPoint({ x: res.x, y: res.y });
        break;
      case "room": {
        const a = draft.length ? draft[0]! : cursor;
        commitTwoPoint(a, { x: a.x + res.w, y: a.y + res.h }, "room");
        setDraft([]);
        break;
      }
      case "wall": {
        const a = draft.length ? draft[0]! : cursor;
        commitTwoPoint(a, polar(a, res.length, res.angle), "wall");
        setDraft([]);
        break;
      }
      case "door":
      case "window": {
        const host = hostOnWall(cursor);
        addEntities([
          mk({
            type: res.kind,
            c: host.c,
            rot: host.rot,
            width: res.kind === "door" ? res.width : res.width,
            swing: 1,
            height: res.kind === "door" ? 2100 : 1200,
          } as never),
        ]);
        break;
      }
      case "action":
        runAction(res.action);
        break;
      default:
        toast.error(res.message ?? "Unknown command");
    }
    setCommand("");
  }

  /** Feed an exact point into the active drawing operation. */
  function applyPoint(p: Pt) {
    if (tool === "polyline" || tool === "measure") return setDraft((d) => [...d, p]);
    if (tool === "arc") {
      const d = [...draft, p];
      if (d.length === 3) {
        const [c, s, e2] = d as [Pt, Pt, Pt];
        addEntities([mk({ type: "arc", c, r: dist(c, s), a0: angleDeg(c, s), a1: angleDeg(c, e2) } as never)]);
        setDraft([]);
      } else setDraft(d);
      return;
    }
    if (["door", "window", "column", "stair", "text"].includes(tool)) return placeAt(p);
    if (!draft.length) setDraft([p]);
    else {
      commitTwoPoint(draft[0]!, p, tool);
      setDraft(tool === "wall" ? [p] : []);
    }
  }

  /* ------------------------------- shortcuts ------------------------------- */

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        if (ev.key === "Escape") (t as HTMLInputElement).blur();
        return;
      }
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        return ev.shiftKey ? redo() : undo();
      }
      if (mod && ev.key.toLowerCase() === "y") return redo();
      if (mod && ev.key.toLowerCase() === "c") return setClipboard(selected.map((e) => ({ ...e })));
      if (mod && ev.key.toLowerCase() === "v")
        return addEntities(clipboard.map((e) => ({ ...translateEntity(e, { x: 600, y: 600 }), id: cadUid() })));
      if (mod && ev.key.toLowerCase() === "d") {
        ev.preventDefault();
        return duplicateSel();
      }
      if (mod && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        return void save();
      }
      if (mod && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        return setSel(pickableEntities.map((e) => e.id));
      }
      if (ev.key === "Escape") {
        setDraft([]);
        setSel([]);
        setTool("select");
        return;
      }
      if (ev.key === "Enter") {
        if (draft.length) finishDraft(draft, tool);
        else cmdRef.current?.focus();
        return;
      }
      if (ev.key === "Delete" || ev.key === "Backspace") return deleteSel();
      if (ev.key === " ") {
        ev.preventDefault();
        return setOrtho((o) => !o);
      }
      if (ev.key === "F8") return setOrtho((o) => !o);
      const found = TOOL_LIST.find((x) => x.key.toLowerCase() === ev.key.toLowerCase());
      if (found) {
        setTool(found.tool);
        setDraft([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteSel, duplicateSel, draft, tool, finishDraft, selected, clipboard, addEntities, pickableEntities, save]);

  /* --------------------------------- files --------------------------------- */

  async function onFile(f: File): Promise<void> {
    try {
      if (f.name.toLowerCase().endsWith(".dxf")) {
        const ents = await importDXF(f);
        if (!ents.length) {
          toast.error("No supported DXF entities found");
          return;
        }
        addEntities(ents);
        toast.success(`Imported ${ents.length} DXF entities`);
      } else {
        const d = await importJSONFile(f);
        setPast((p) => [...p, doc]);
        setDocState(d);
        setSel([]);
        setDirty(true);
        toast.success("Project loaded");
      }
      setTimeout(fit, 50);
    } catch {
      toast.error("Could not read that file");
    }
  }

  /* -------------------------------- render --------------------------------- */

  const gridStep = doc.gridSize;
  const majorStep = gridStep * 10;
  const preview = renderPreview();

  function renderPreview() {
    if (!draft.length) return null;
    const a = draft[0]!;
    const last = draft[draft.length - 1]!;
    const c = "#2563eb";
    const common = { stroke: c, strokeWidth: 25 / 1, fill: "none", strokeDasharray: "180 120" } as const;
    if (tool === "polyline" || tool === "measure")
      return <polyline points={[...draft, cursor].map((p) => `${p.x},${p.y}`).join(" ")} {...common} />;
    if (tool === "rect" || tool === "room")
      return (
        <rect
          x={Math.min(a.x, cursor.x)}
          y={Math.min(a.y, cursor.y)}
          width={Math.abs(cursor.x - a.x)}
          height={Math.abs(cursor.y - a.y)}
          {...common}
        />
      );
    if (tool === "circle" || tool === "polygon" || tool === "arc")
      return <circle cx={a.x} cy={a.y} r={Math.max(1, dist(a, cursor))} {...common} />;
    return <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} {...common} />;
  }

  const liveLen = draft.length ? dist(draft[draft.length - 1]!, cursor) : 0;
  const liveAng = draft.length ? angleDeg(draft[draft.length - 1]!, cursor) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-studio text-studio-ink">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-studio-line bg-studio-paper px-3 py-2 text-[11px]">
        <span className="mr-2 font-display text-xs font-bold tracking-widest">{projectName ?? doc.name}</span>
        <TBtn onClick={() => { setDocState(emptyDoc(doc.name)); setSel([]); setDirty(true); }} icon={Plus} label="New" />
        <TBtn onClick={() => fileRef.current?.click()} icon={Upload} label="Open" />
        <TBtn onClick={() => void save()} icon={Save} label={saving ? "Saving…" : dirty ? "Save*" : "Saved"} />
        <TBtn onClick={() => exportJSON(doc)} icon={Download} label="Save as JSON" />
        <Divider />
        <TBtn onClick={undo} icon={Undo2} label="Undo" disabled={!past.length} />
        <TBtn onClick={redo} icon={Redo2} label="Redo" disabled={!future.length} />
        <TBtn onClick={duplicateSel} icon={Copy} label="Duplicate" disabled={!sel.length} />
        <TBtn onClick={() => rotateSel(90)} icon={RotateCw} label="Rotate" disabled={!sel.length} />
        <TBtn onClick={mirrorSel} icon={FlipHorizontal} label="Mirror" disabled={!sel.length} />
        <TBtn onClick={deleteSel} icon={Trash2} label="Delete" disabled={!sel.length} />
        <Divider />
        <TBtn onClick={autoJoin} icon={Move} label="Join walls" />
        <TBtn onClick={fit} icon={Maximize} label="Fit" />
        <TBtn onClick={() => zoomBy(1.25)} icon={ZoomIn} label="Zoom in" />
        <TBtn onClick={() => zoomBy(0.8)} icon={ZoomOut} label="Zoom out" />
        <Divider />
        <TBtn onClick={() => void exportRaster(svgRef.current!, doc, "png")} icon={Download} label="PNG" />
        <TBtn onClick={() => void exportRaster(svgRef.current!, doc, "jpg")} icon={Download} label="JPG" />
        <TBtn onClick={() => exportSVG(svgRef.current!, doc)} icon={Download} label="SVG" />
        <TBtn onClick={() => exportDXF(doc)} icon={Download} label="DXF" />
        <select
          value={sheet}
          onChange={(e) => setSheet(e.target.value as SheetSize)}
          className="rounded border border-studio-line bg-studio-paper px-1.5 py-1"
        >
          {(["A4", "A3", "A2", "A1"] as SheetSize[]).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <TBtn
          onClick={() => printSheet(svgRef.current!, doc, sheet, `1:${Math.max(1, Math.round(1 / (view.k * 10)))}`)}
          icon={Printer}
          label="Print / PDF"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={doc.units}
            onChange={(e) => commit((d) => ({ ...d, units: e.target.value as Units }))}
            className="rounded border border-studio-line bg-studio-paper px-1.5 py-1"
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.dxf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left tool rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-studio-line bg-studio-paper py-2">
          {TOOL_LIST.map((t) => (
            <button
              key={t.tool}
              title={`${t.label} (${t.key})`}
              onClick={() => {
                setTool(t.tool);
                setDraft([]);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded ${
                tool === t.tool ? "bg-[#2563eb] text-white" : "text-studio-ink/70 hover:bg-black/5"
              }`}
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <button
            title="Furniture library"
            onClick={() => {
              setTool("furniture");
              setRightTab("library");
            }}
            className={`flex h-8 w-8 items-center justify-center rounded ${
              tool === "furniture" ? "bg-[#2563eb] text-white" : "text-studio-ink/70 hover:bg-black/5"
            }`}
          >
            <Sofa className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden bg-studio">
          <svg
            ref={svgRef}
            className="h-full w-full touch-none"
            style={{ cursor: tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            <defs>
              <marker id="dimArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#2563eb" />
              </marker>
              <pattern
                id="cadGrid"
                width={gridStep * view.k}
                height={gridStep * view.k}
                patternUnits="userSpaceOnUse"
                x={view.tx}
                y={view.ty}
              >
                <path
                  d={`M ${gridStep * view.k} 0 L 0 0 0 ${gridStep * view.k}`}
                  fill="none"
                  stroke="currentColor"
                  className="text-studio-line"
                  strokeWidth="1"
                />
              </pattern>
              <pattern
                id="cadGridMajor"
                width={majorStep * view.k}
                height={majorStep * view.k}
                patternUnits="userSpaceOnUse"
                x={view.tx}
                y={view.ty}
              >
                <path
                  d={`M ${majorStep * view.k} 0 L 0 0 0 ${majorStep * view.k}`}
                  fill="none"
                  stroke="currentColor"
                  className="text-studio-line-major"
                  strokeWidth="1.4"
                />
              </pattern>
            </defs>
            {layerOf("grid")?.visible !== false && (
              <>
                <rect data-ui="1" width="100%" height="100%" fill="url(#cadGrid)" />
                <rect data-ui="1" width="100%" height="100%" fill="url(#cadGridMajor)" />
                <line data-ui="1" x1={view.tx} y1={0} x2={view.tx} y2="100%" stroke="#94a3b8" strokeWidth="1" />
                <line data-ui="1" x1={0} y1={view.ty} x2="100%" y2={view.ty} stroke="#94a3b8" strokeWidth="1" />
              </>
            )}

            <g data-world="1" transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
              {/* detected rooms */}
              {rooms.map((r, i) => (
                <g key={`r${i}`}>
                  <polygon points={r.pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(37,99,235,0.05)" />
                  <text x={r.center.x} y={r.center.y - 120} fontSize={280} textAnchor="middle" fill="#334155">
                    Room {i + 1}
                  </text>
                  <text x={r.center.x} y={r.center.y + 220} fontSize={230} textAnchor="middle" fill="#64748b">
                    {fmtArea(r.area, doc.units)}
                  </text>
                </g>
              ))}
              {visibleEntities.map((e) => (
                <EntityView
                  key={e.id}
                  e={e}
                  layer={layerOf(e.layer)}
                  selected={sel.includes(e.id)}
                  units={doc.units}
                />
              ))}
              {selected.map((e) => (
                <SelectionHandles key={`h${e.id}`} e={e} />
              ))}
              <g data-ui="1">
                {preview}
                {draft.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={80 / view.k / 10} fill="#2563eb" />
                ))}
                {snapPt && (
                  <rect
                    x={snapPt.p.x - 10 / view.k}
                    y={snapPt.p.y - 10 / view.k}
                    width={20 / view.k}
                    height={20 / view.k}
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth={2 / view.k}
                  />
                )}
                {marquee && (
                  <rect
                    x={Math.min(marquee.a.x, marquee.b.x)}
                    y={Math.min(marquee.a.y, marquee.b.y)}
                    width={Math.abs(marquee.b.x - marquee.a.x)}
                    height={Math.abs(marquee.b.y - marquee.a.y)}
                    fill="rgba(37,99,235,0.08)"
                    stroke="#2563eb"
                    strokeWidth={1 / view.k}
                    strokeDasharray={`${6 / view.k} ${4 / view.k}`}
                  />
                )}
              </g>
            </g>
          </svg>

          {draft.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-3 rounded bg-[#111827] px-2 py-1 text-[11px] text-white">
              L {fmtLen(liveLen, doc.units)} · ∠ {liveAng.toFixed(1)}°
            </div>
          )}
          {snapPt && (
            <div className="pointer-events-none absolute right-3 top-3 rounded bg-[#16a34a] px-2 py-1 text-[11px] text-white">
              {snapPt.kind}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="hidden w-72 shrink-0 flex-col border-l border-studio-line bg-studio-paper lg:flex">
          <div className="flex border-b border-studio-line text-[11px]">
            {(["props", "layers", "library", "rooms"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 px-2 py-2 capitalize ${
                  rightTab === t ? "border-b-2 border-[#2563eb] font-semibold" : "text-studio-ink/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[11px]">
            {rightTab === "props" && (
              <Properties
                selected={selected}
                units={doc.units}
                layers={doc.layers}
                onChange={(id, patch) =>
                  commit((d) => ({
                    ...d,
                    entities: d.entities.map((e) => (e.id === id ? ({ ...e, ...patch } as Entity) : e)),
                  }))
                }
                defaults={{ wallKind, wallThickness, setWallKind, setWallThickness }}
                gridSize={doc.gridSize}
                onGrid={(v) => commit((d) => ({ ...d, gridSize: v }))}
              />
            )}
            {rightTab === "layers" && (
              <LayersPanel
                doc={doc}
                onChange={(layers) => commit((d) => ({ ...d, layers }))}
                counts={doc.entities.reduce<Record<string, number>>((m, e) => {
                  m[e.layer] = (m[e.layer] ?? 0) + 1;
                  return m;
                }, {})}
              />
            )}
            {rightTab === "library" && (
              <LibraryPanel
                onPlace={(kind) => {
                  const it = libItem(kind)!;
                  addEntities([
                    mk({
                      type: "furniture",
                      kind,
                      x: cursor.x,
                      y: cursor.y,
                      w: it.w,
                      h: it.h,
                      rot: 0,
                      layer: it.layer,
                    } as never),
                  ]);
                  setTool("select");
                  toast.success(`${it.label} placed — drag to position`);
                }}
              />
            )}
            {rightTab === "rooms" && (
              <div className="space-y-2">
                <p className="text-studio-ink/60">Detected from closed wall loops.</p>
                {rooms.length === 0 && <p className="text-studio-ink/50">Draw closed walls to detect rooms.</p>}
                {rooms.map((r, i) => (
                  <div key={i} className="rounded border border-studio-line p-2">
                    <div className="font-semibold">Room {i + 1}</div>
                    <div>Area {fmtArea(r.area, doc.units)}</div>
                    <div>Perimeter {fmtLen(r.perimeter, doc.units)}</div>
                  </div>
                ))}
                {doc.entities
                  .filter((e): e is Extract<Entity, { type: "room" }> => e.type === "room")
                  .map((r) => (
                    <div key={r.id} className="rounded border border-studio-line p-2">
                      <div className="font-semibold">{r.name}</div>
                      <div>
                        {fmtLen(r.w, doc.units)} × {fmtLen(r.h, doc.units)}
                      </div>
                      <div>Area {fmtArea(r.w * r.h, doc.units)}</div>
                      <div>Perimeter {fmtLen(2 * (r.w + r.h), doc.units)}</div>
                    </div>
                  ))}
                <div className="mt-2 rounded bg-[#2563eb]/10 p-2 font-semibold">
                  Total floor area {fmtArea(totalArea, doc.units)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command bar + status bar */}
      <form onSubmit={submitCommand} className="flex items-center gap-2 border-t border-studio-line bg-studio-paper px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-studio-ink/50" />
        <input
          ref={cmdRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Command: wall · 4500 · 4500 < 90 · @4500,0 · @4500<45 · "create a 4m x 5m room"'
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-studio-ink/40"
        />
        <button type="submit" className="rounded bg-[#2563eb] px-3 py-1 text-[11px] font-semibold text-white">
          Run
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 border-t border-studio-line bg-studio-paper px-3 py-1.5 text-[11px] text-studio-ink/70">
        <span>
          X {fmtCoord(cursor.x, doc.units)} · Y {fmtCoord(-cursor.y, doc.units)}
        </span>
        <span>Zoom {(view.k * 1000).toFixed(1)}</span>
        <span>Grid {fmtLen(doc.gridSize, doc.units)}</span>
        <Toggle on={snaps.grid} onClick={() => setSnaps((s) => ({ ...s, grid: !s.grid }))} label="SNAP" icon={Grid3x3} />
        <Toggle on={ortho} onClick={() => setOrtho((o) => !o)} label="ORTHO" icon={Minus} />
        <Toggle
          on={snaps.endpoint}
          onClick={() => setSnaps((s) => ({ ...s, endpoint: !s.endpoint }))}
          label="END"
        />
        <Toggle on={snaps.midpoint} onClick={() => setSnaps((s) => ({ ...s, midpoint: !s.midpoint }))} label="MID" />
        <Toggle on={snaps.center} onClick={() => setSnaps((s) => ({ ...s, center: !s.center }))} label="CEN" />
        <Toggle
          on={snaps.intersection}
          onClick={() => setSnaps((s) => ({ ...s, intersection: !s.intersection }))}
          label="INT"
        />
        <Toggle
          on={snaps.perpendicular}
          onClick={() => setSnaps((s) => ({ ...s, perpendicular: !s.perpendicular }))}
          label="PERP"
        />
        <label className="flex items-center gap-1">
          Angle
          <select
            value={angleStep}
            onChange={(e) => setAngleStep(Number(e.target.value))}
            className="rounded border border-studio-line bg-studio-paper px-1"
          >
            {[0, 15, 30, 45, 90].map((a) => (
              <option key={a} value={a}>
                {a === 0 ? "free" : `${a}°`}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto">
          {sel.length ? `${sel.length} selected` : `${doc.entities.length} objects`} · Total{" "}
          {fmtArea(totalArea, doc.units)} · {dirty ? "unsaved" : "saved"}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ sub components ----------------------------- */

function Divider() {
  return <span className="mx-1 h-5 w-px bg-studio-line" />;
}

function TBtn({
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: typeof Square;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1 rounded border border-transparent px-1.5 py-1 hover:border-studio-line hover:bg-black/5 disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" /> <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function Toggle({
  on,
  onClick,
  label,
  icon: Icon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon?: typeof Square;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
        on ? "bg-[#2563eb] text-white" : "border border-studio-line"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />} {label}
    </button>
  );
}

function Field({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}) {
  const [v, setV] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setV(String(Math.round(value * 100) / 100)), [value]);
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-studio-ink/60">{label}</span>
      <input
        value={v}
        step={step}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = parseFloat(v);
          if (Number.isFinite(n)) onCommit(n);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1 text-right"
      />
    </label>
  );
}

function Properties({
  selected,
  units,
  layers,
  onChange,
  defaults,
  gridSize,
  onGrid,
}: {
  selected: Entity[];
  units: Units;
  layers: CadDoc["layers"];
  onChange: (id: string, patch: Partial<Entity>) => void;
  defaults: {
    wallKind: "exterior" | "interior";
    wallThickness: number;
    setWallKind: (k: "exterior" | "interior") => void;
    setWallThickness: (n: number) => void;
  };
  gridSize: number;
  onGrid: (v: number) => void;
}) {
  if (selected.length !== 1) {
    return (
      <div className="space-y-3">
        <p className="text-studio-ink/60">
          {selected.length ? `${selected.length} objects selected.` : "Nothing selected."}
        </p>
        <div className="space-y-2 rounded border border-studio-line p-2">
          <div className="font-semibold">Drawing defaults</div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-studio-ink/60">Wall type</span>
            <select
              value={defaults.wallKind}
              onChange={(e) => defaults.setWallKind(e.target.value as "exterior" | "interior")}
              className="rounded border border-studio-line bg-studio-paper px-1.5 py-1"
            >
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
            </select>
          </label>
          <Field label="Wall thickness (mm)" value={defaults.wallThickness} onCommit={defaults.setWallThickness} />
          <Field label="Grid spacing (mm)" value={gridSize} onCommit={(v) => onGrid(Math.max(10, v))} />
        </div>
      </div>
    );
  }
  const e = selected[0]!;
  const set = (patch: Partial<Entity>) => onChange(e.id, patch);
  const num = (k: string, v: number, cb: (n: number) => void) => <Field key={k} label={k} value={v} onCommit={cb} />;

  return (
    <div className="space-y-2">
      <div className="font-semibold capitalize">{e.type}</div>
      <label className="flex items-center justify-between gap-2">
        <span className="text-studio-ink/60">Layer</span>
        <select
          value={e.layer}
          onChange={(ev) => set({ layer: ev.target.value } as Partial<Entity>)}
          className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1"
        >
          {layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {num("Z (mm)", e.z, (v) => set({ z: v } as Partial<Entity>))}

      {(e.type === "wall" || e.type === "line" || e.type === "dim") && (
        <>
          {num("X1", e.a.x, (v) => set({ a: { ...e.a, x: v } } as Partial<Entity>))}
          {num("Y1", -e.a.y, (v) => set({ a: { ...e.a, y: -v } } as Partial<Entity>))}
          {num("X2", e.b.x, (v) => set({ b: { ...e.b, x: v } } as Partial<Entity>))}
          {num("Y2", -e.b.y, (v) => set({ b: { ...e.b, y: -v } } as Partial<Entity>))}
          {num("Length", dist(e.a, e.b), (v) =>
            set({ b: polar(e.a, v, angleDeg(e.a, e.b)) } as Partial<Entity>),
          )}
          {num("Angle °", angleDeg(e.a, e.b), (v) =>
            set({ b: polar(e.a, dist(e.a, e.b), v) } as Partial<Entity>),
          )}
        </>
      )}
      {e.type === "wall" && (
        <>
          {num("Thickness", e.thickness, (v) => set({ thickness: Math.max(20, v) } as Partial<Entity>))}
          {num("Height", e.height, (v) => set({ height: Math.max(100, v) } as Partial<Entity>))}
          <label className="flex items-center justify-between gap-2">
            <span className="text-studio-ink/60">Type</span>
            <select
              value={e.kind}
              onChange={(ev) => set({ kind: ev.target.value as "exterior" | "interior" } as Partial<Entity>)}
              className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1"
            >
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
            </select>
          </label>
        </>
      )}
      {e.type === "dim" && (
        <label className="flex items-center justify-between gap-2">
          <span className="text-studio-ink/60">Mode</span>
          <select
            value={e.mode}
            onChange={(ev) => set({ mode: ev.target.value } as Partial<Entity>)}
            className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1"
          >
            {["h", "v", "aligned", "angular", "radius", "diameter"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}
      {(e.type === "rect" || e.type === "room" || e.type === "stair" || e.type === "furniture") && (
        <>
          {num("X", e.x, (v) => set({ x: v } as Partial<Entity>))}
          {num("Y", -e.y, (v) => set({ y: -v } as Partial<Entity>))}
          {num("Width", e.w, (v) => set({ w: Math.max(1, v) } as Partial<Entity>))}
          {num("Height / depth", e.h, (v) => set({ h: Math.max(1, v) } as Partial<Entity>))}
          {num("Angle °", e.rot, (v) => set({ rot: v } as Partial<Entity>))}
          <div className="text-studio-ink/60">
            Area {fmtArea(e.w * e.h, units)} · Perimeter {fmtLen(2 * (e.w + e.h), units)}
          </div>
        </>
      )}
      {e.type === "room" && (
        <label className="flex items-center justify-between gap-2">
          <span className="text-studio-ink/60">Name</span>
          <input
            value={e.name}
            onChange={(ev) => set({ name: ev.target.value } as Partial<Entity>)}
            className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1"
          />
        </label>
      )}
      {e.type === "stair" && num("Steps", e.steps, (v) => set({ steps: Math.max(2, Math.round(v)) } as Partial<Entity>))}
      {(e.type === "circle" || e.type === "arc" || e.type === "polygon") && (
        <>
          {num("Center X", e.c.x, (v) => set({ c: { ...e.c, x: v } } as Partial<Entity>))}
          {num("Center Y", -e.c.y, (v) => set({ c: { ...e.c, y: -v } } as Partial<Entity>))}
          {num("Radius", e.r, (v) => set({ r: Math.max(1, v) } as Partial<Entity>))}
        </>
      )}
      {e.type === "polygon" && num("Sides", e.sides, (v) => set({ sides: Math.max(3, Math.round(v)) } as Partial<Entity>))}
      {e.type === "arc" && (
        <>
          {num("Start °", e.a0, (v) => set({ a0: v } as Partial<Entity>))}
          {num("End °", e.a1, (v) => set({ a1: v } as Partial<Entity>))}
        </>
      )}
      {(e.type === "door" || e.type === "window") && (
        <>
          {num("X", e.c.x, (v) => set({ c: { ...e.c, x: v } } as Partial<Entity>))}
          {num("Y", -e.c.y, (v) => set({ c: { ...e.c, y: -v } } as Partial<Entity>))}
          {num("Width", e.width, (v) => set({ width: Math.max(100, v) } as Partial<Entity>))}
          {num("Height", e.height, (v) => set({ height: Math.max(100, v) } as Partial<Entity>))}
          {num("Angle °", e.rot, (v) => set({ rot: v } as Partial<Entity>))}
          {e.type === "door" && (
            <button
              onClick={() => set({ swing: (e.swing === 1 ? -1 : 1) as 1 | -1 } as Partial<Entity>)}
              className="w-full rounded border border-studio-line py-1"
            >
              Flip swing
            </button>
          )}
        </>
      )}
      {e.type === "column" && (
        <>
          {num("X", e.c.x, (v) => set({ c: { ...e.c, x: v } } as Partial<Entity>))}
          {num("Y", -e.c.y, (v) => set({ c: { ...e.c, y: -v } } as Partial<Entity>))}
          {num("Size", e.size, (v) => set({ size: Math.max(50, v) } as Partial<Entity>))}
          <button
            onClick={() => set({ shape: e.shape === "square" ? "round" : "square" } as Partial<Entity>)}
            className="w-full rounded border border-studio-line py-1"
          >
            Toggle shape ({e.shape})
          </button>
        </>
      )}
      {e.type === "text" && (
        <>
          <label className="flex items-center justify-between gap-2">
            <span className="text-studio-ink/60">Text</span>
            <input
              value={e.text}
              onChange={(ev) => set({ text: ev.target.value } as Partial<Entity>)}
              className="w-28 rounded border border-studio-line bg-studio-paper px-1.5 py-1"
            />
          </label>
          {num("Size", e.size, (v) => set({ size: Math.max(20, v) } as Partial<Entity>))}
          {num("Angle °", e.rot, (v) => set({ rot: v } as Partial<Entity>))}
        </>
      )}
      {e.type === "furniture" && <div className="text-studio-ink/60">Type: {libItem(e.kind)?.label ?? e.kind}</div>}
    </div>
  );
}

function LayersPanel({
  doc,
  onChange,
  counts,
}: {
  doc: CadDoc;
  onChange: (layers: CadDoc["layers"]) => void;
  counts: Record<string, number>;
}) {
  const upd = (id: string, patch: Partial<CadDoc["layers"][number]>) =>
    onChange(doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-1">
      {doc.layers.map((l) => (
        <div key={l.id} className="flex items-center gap-1.5 rounded border border-studio-line px-1.5 py-1">
          <button onClick={() => upd(l.id, { visible: !l.visible })} title="Toggle visibility">
            {l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-40" />}
          </button>
          <button onClick={() => upd(l.id, { locked: !l.locked })} title="Toggle lock">
            {l.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-40" />}
          </button>
          <input
            type="color"
            value={l.color}
            onChange={(e) => upd(l.id, { color: e.target.value })}
            className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            value={l.name}
            onChange={(e) => upd(l.id, { name: e.target.value })}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="text-studio-ink/40">{counts[l.id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function LibraryPanel({ onPlace }: { onPlace: (kind: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search objects…"
        className="w-full rounded border border-studio-line bg-studio-paper px-2 py-1"
      />
      {LIB_GROUPS.map((g) => {
        const items = LIBRARY.filter(
          (i) => i.group === g && i.label.toLowerCase().includes(q.toLowerCase()),
        );
        if (!items.length) return null;
        return (
          <div key={g}>
            <div className="mb-1 font-semibold">{g}</div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((i) => (
                <button
                  key={i.kind}
                  onClick={() => onPlace(i.kind)}
                  className="rounded border border-studio-line px-1.5 py-1 text-left hover:bg-black/5"
                >
                  {i.label}
                  <div className="text-[10px] text-studio-ink/50">
                    {i.w}×{i.h}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-studio-ink/50">Click an item to drop it at the last cursor position, then drag to place.</p>
    </div>
  );
}
