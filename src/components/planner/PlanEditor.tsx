import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  DoorOpen,
  Grid3x3,
  Hand,
  Maximize,
  Minus,
  MousePointer2,
  PanelTop,
  Plus,
  Redo2,
  Rotate3d,
  Ruler,
  Slash,
  Square,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  PX_PER_FT,
  roomArea,
  toneColor,
  uid,
  type Dim,
  type FloorPlan,
  type Label,
  type Opening,
  type Room,
  type Wall,
} from "@/lib/plan";
import { cn } from "@/lib/utils";

type Tool = "select" | "pan" | "room" | "wall" | "door" | "window" | "dim" | "label";

const tools: { id: Tool; label: string; icon: typeof Square }[] = [
  { id: "select", label: "Select / move", icon: MousePointer2 },
  { id: "pan", label: "Pan canvas", icon: Hand },
  { id: "room", label: "Draw room", icon: Square },
  { id: "wall", label: "Draw wall", icon: Slash },
  { id: "door", label: "Place door", icon: DoorOpen },
  { id: "window", label: "Place window", icon: PanelTop },
  { id: "dim", label: "Dimension line", icon: Ruler },
  { id: "label", label: "Text note", icon: Tag },
];

export function PlanEditor({
  plan,
  onChange,
  plot,
}: {
  plan: FloorPlan;
  onChange: (next: FloorPlan) => void;
  plot: { w: number; h: number };
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snapOn, setSnapOn] = useState(true);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const past = useRef<FloorPlan[]>([]);
  const future = useRef<FloorPlan[]>([]);
  const [, force] = useState(0);

  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    room: Room;
  } | null>(null);
  const panDrag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const commit = useCallback(
    (next: FloorPlan, checkpoint = true) => {
      if (checkpoint) {
        past.current = [...past.current.slice(-49), plan];
        future.current = [];
        force((n) => n + 1);
      }
      onChange(next);
    },
    [plan, onChange],
  );

  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [plan, ...future.current];
    onChange(prev);
    force((n) => n + 1);
  }

  function redo() {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, plan];
    onChange(next);
    force((n) => n + 1);
  }

  const snap = useCallback(
    (v: number) => (snapOn ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100),
    [snapOn],
  );

  const pointToFt = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const scale = PX_PER_FT * zoom;
      return {
        x: snap((e.clientX - rect.left) / scale),
        y: snap((e.clientY - rect.top) / scale),
      };
    },
    [snap, zoom],
  );

  function handleCanvasClick(e: React.MouseEvent) {
    if (tool === "select" || tool === "pan") {
      setSelected(null);
      return;
    }
    const p = pointToFt(e);

    if (tool === "room") {
      const room: Room = {
        id: uid(),
        name: `Room ${plan.rooms.length + 1}`,
        x: Math.max(0, Math.min(p.x, plot.w - 10)),
        y: Math.max(0, Math.min(p.y, plot.h - 10)),
        w: 12,
        h: 10,
        tone: plan.rooms.length % 6,
      };
      commit({ ...plan, rooms: [...plan.rooms, room] });
      setSelected(room.id);
      setTool("select");
      return;
    }

    if (tool === "door" || tool === "window") {
      const opening: Opening = {
        id: uid(),
        type: tool === "door" ? "door" : "window",
        x: p.x,
        y: p.y,
        len: tool === "door" ? 3 : 4,
        rot: 0,
      };
      commit({ ...plan, openings: [...plan.openings, opening] });
      setSelected(opening.id);
      setTool("select");
      return;
    }

    if (tool === "label") {
      const text = window.prompt("Note text", "Note");
      if (!text) return;
      const label: Label = { id: uid(), x: p.x, y: p.y, text };
      commit({ ...plan, labels: [...plan.labels, label] });
      setSelected(label.id);
      setTool("select");
      return;
    }

    // two-click tools: wall + dimension
    if (!pending) {
      setPending(p);
      return;
    }
    if (tool === "wall") {
      const wall: Wall = { id: uid(), x1: pending.x, y1: pending.y, x2: p.x, y2: p.y };
      commit({ ...plan, walls: [...plan.walls, wall] });
      setSelected(wall.id);
    } else {
      const dim: Dim = { id: uid(), x1: pending.x, y1: pending.y, x2: p.x, y2: p.y };
      commit({ ...plan, dims: [...plan.dims, dim] });
      setSelected(dim.id);
    }
    setPending(null);
  }

  function startDrag(e: React.PointerEvent, room: Room, mode: "move" | "resize") {
    if (tool !== "select") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    past.current = [...past.current.slice(-49), plan];
    future.current = [];
    drag.current = { id: room.id, mode, startX: e.clientX, startY: e.clientY, room };
    setSelected(room.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panDrag.current) {
      setPan({
        x: panDrag.current.ox + (e.clientX - panDrag.current.x),
        y: panDrag.current.oy + (e.clientY - panDrag.current.y),
      });
      return;
    }
    const d = drag.current;
    if (!d) return;
    const scale = PX_PER_FT * zoom;
    const dx = snap((e.clientX - d.startX) / scale);
    const dy = snap((e.clientY - d.startY) / scale);
    commit(
      {
        ...plan,
        rooms: plan.rooms.map((r) => {
          if (r.id !== d.id) return r;
          if (d.mode === "move") {
            return {
              ...r,
              x: Math.max(0, Math.min(d.room.x + dx, plot.w - r.w)),
              y: Math.max(0, Math.min(d.room.y + dy, plot.h - r.h)),
            };
          }
          return {
            ...r,
            w: Math.max(4, Math.min(d.room.w + dx, plot.w - r.x)),
            h: Math.max(4, Math.min(d.room.h + dy, plot.h - r.y)),
          };
        }),
      },
      false,
    );
  }

  function endDrag() {
    drag.current = null;
    panDrag.current = null;
  }

  function startPan(e: React.PointerEvent) {
    if (tool !== "pan") return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    panDrag.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
  }

  function moveOpening(e: React.PointerEvent, op: Opening) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelected(op.id);
    past.current = [...past.current.slice(-49), plan];
    const move = (ev: PointerEvent) => {
      const p = pointToFt(ev);
      onChange({
        ...plan,
        openings: plan.openings.map((o) => (o.id === op.id ? { ...o, x: p.x, y: p.y } : o)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function deleteSelected() {
    if (!selected) return;
    commit({
      rooms: plan.rooms.filter((r) => r.id !== selected),
      openings: plan.openings.filter((o) => o.id !== selected),
      walls: plan.walls.filter((w) => w.id !== selected),
      labels: plan.labels.filter((l) => l.id !== selected),
      dims: plan.dims.filter((d) => d.id !== selected),
    });
    setSelected(null);
  }

  const selectedRoom = plan.rooms.find((r) => r.id === selected) ?? null;
  const selectedOpening = plan.openings.find((o) => o.id === selected) ?? null;
  const selectedLabel = plan.labels.find((l) => l.id === selected) ?? null;

  function duplicateSelected() {
    if (selectedRoom) {
      const copy: Room = {
        ...selectedRoom,
        id: uid(),
        name: `${selectedRoom.name} copy`,
        x: Math.min(selectedRoom.x + 2, plot.w - selectedRoom.w),
        y: Math.min(selectedRoom.y + 2, plot.h - selectedRoom.h),
      };
      commit({ ...plan, rooms: [...plan.rooms, copy] });
      setSelected(copy.id);
    } else if (selectedOpening) {
      const copy: Opening = { ...selectedOpening, id: uid(), x: selectedOpening.x + 2 };
      commit({ ...plan, openings: [...plan.openings, copy] });
      setSelected(copy.id);
    }
  }

  function rotateSelected() {
    if (!selectedOpening) return;
    commit({
      ...plan,
      openings: plan.openings.map((o) =>
        o.id === selectedOpening.id ? { ...o, rot: o.rot === 0 ? 90 : 0 } : o,
      ),
    });
  }

  function updateRoom(patch: Partial<Room>) {
    if (!selectedRoom) return;
    commit({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, ...patch } : r)),
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") {
        setPending(null);
        setTool("select");
      }
      if (e.key === "v") setTool("select");
      if (e.key === "r") setTool("room");
      if (e.key === "w") setTool("wall");
      if (e.key === "d") setTool("door");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scale = PX_PER_FT * zoom;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Toolbar */}
      <div className="studio-panel flex flex-wrap gap-1.5 p-2 lg:w-14 lg:flex-col">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              setPending(null);
            }}
            title={t.label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
              tool === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-transparent text-studio-ink/60 hover:bg-studio-line/40 hover:text-studio-ink",
            )}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-1 hidden h-px w-8 bg-studio-line lg:block" />
        {[
          { icon: Undo2, label: "Undo", fn: undo, disabled: past.current.length === 0 },
          { icon: Redo2, label: "Redo", fn: redo, disabled: future.current.length === 0 },
          { icon: Copy, label: "Duplicate", fn: duplicateSelected, disabled: !selected },
          { icon: Rotate3d, label: "Rotate opening", fn: rotateSelected, disabled: !selectedOpening },
          { icon: Trash2, label: "Delete", fn: deleteSelected, disabled: !selected },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.fn}
            disabled={b.disabled}
            title={b.label}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-studio-ink/60 transition-colors hover:bg-studio-line/40 hover:text-studio-ink disabled:opacity-30"
          >
            <b.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="studio-panel min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-studio-line px-3 py-2 text-xs text-studio-ink/70">
          <span>
            {tool === "wall" || tool === "dim"
              ? pending
                ? "Click the end point"
                : "Click the start point"
              : `Plot ${plot.w} × ${plot.h} ft`}
          </span>
          <span className="hidden font-mono text-[11px] tabular-nums text-studio-ink/50 sm:block">
            X {cursor.x.toFixed(1)} ft · Y {cursor.y.toFixed(1)} ft · 1 ft grid / 5 ft major
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSnapOn((s) => !s)}
              title="Snap to 6 in grid"
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1",
                snapOn ? "bg-primary/15 text-primary" : "hover:bg-studio-line/40",
              )}
            >
              <Grid3x3 className="h-3.5 w-3.5" /> Snap
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              className="rounded-md p-1 hover:bg-studio-line/40"
              title="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
              className="rounded-md p-1 hover:bg-studio-line/40"
              title="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="rounded-md p-1 hover:bg-studio-line/40"
              title="Reset view"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          className="studio-paper relative h-[560px] overflow-auto"
          onPointerDown={startPan}
          onPointerMove={(e) => {
            onPointerMove(e);
            setCursor(pointToFt(e));
          }}
          onPointerUp={endDrag}
          style={{ cursor: tool === "pan" ? "grab" : "default" }}
        >
          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, width: "fit-content" }}
            className="p-6 pl-10 pt-10"
          >
            {/* rulers */}
            <div
              className="pointer-events-none absolute left-10 top-6 h-4 border-b border-studio-line-major"
              style={{
                width: plot.w * scale,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                backgroundImage: `repeating-linear-gradient(to right, var(--studio-line-major) 0 1px, transparent 1px ${scale * 5}px)`,
              }}
            />
            <div
              className="pointer-events-none absolute left-6 top-10 w-4 border-r border-studio-line-major"
              style={{
                height: plot.h * scale,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--studio-line-major) 0 1px, transparent 1px ${scale * 5}px)`,
              }}
            />
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative border border-studio-line-major shadow-[0_1px_0_0_var(--studio-line)]"
              style={{
                width: plot.w * scale,
                height: plot.h * scale,
                backgroundColor: "var(--studio-paper)",
                backgroundImage: [
                  "linear-gradient(to right, var(--studio-line-major) 1px, transparent 1px)",
                  "linear-gradient(to bottom, var(--studio-line-major) 1px, transparent 1px)",
                  "linear-gradient(to right, var(--studio-line) 1px, transparent 1px)",
                  "linear-gradient(to bottom, var(--studio-line) 1px, transparent 1px)",
                ].join(", "),
                backgroundSize: `${scale * 5}px ${scale * 5}px, ${scale * 5}px ${scale * 5}px, ${scale}px ${scale}px, ${scale}px ${scale}px`,
                cursor: tool === "select" || tool === "pan" ? "inherit" : "crosshair",
              }}
            >

              {/* walls */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {plan.walls.map((w) => (
                  <line
                    key={w.id}
                    x1={w.x1 * scale}
                    y1={w.y1 * scale}
                    x2={w.x2 * scale}
                    y2={w.y2 * scale}
                    stroke={selected === w.id ? "var(--primary)" : "var(--studio-ink)"}
                    strokeWidth={6}
                    strokeLinecap="square"
                  />
                ))}
                {plan.dims.map((d) => {
                  const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
                  return (
                    <g key={d.id}>
                      <line
                        x1={d.x1 * scale}
                        y1={d.y1 * scale}
                        x2={d.x2 * scale}
                        y2={d.y2 * scale}
                        stroke="var(--studio-accent)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={((d.x1 + d.x2) / 2) * scale}
                        y={((d.y1 + d.y2) / 2) * scale - 4}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--studio-accent)"
                      >
                        {len.toFixed(1)} ft
                      </text>
                    </g>
                  );
                })}
              </svg>

              {plan.rooms.map((r) => (
                <div
                  key={r.id}
                  onPointerDown={(e) => startDrag(e, r, "move")}
                  className={cn(
                    "absolute select-none rounded-[2px] border-2 text-[10px]",
                    selected === r.id ? "z-10 ring-2 ring-primary ring-offset-1" : "",
                  )}
                  style={{
                    left: r.x * scale,
                    top: r.y * scale,
                    width: r.w * scale,
                    height: r.h * scale,
                    borderColor: toneColor(r.tone),
                    background: `color-mix(in oklab, ${toneColor(r.tone)} 14%, white)`,
                    cursor: tool === "select" ? "move" : "crosshair",
                  }}
                >
                  <div className="pointer-events-none p-1 font-medium text-studio-ink">
                    {r.name}
                    <div className="text-studio-ink/55">
                      {r.w}×{r.h} ft · {roomArea(r)} sq ft
                    </div>
                  </div>
                  {selected === r.id && (
                    <span
                      onPointerDown={(e) => startDrag(e, r, "resize")}
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border border-white bg-primary"
                    />
                  )}
                </div>
              ))}

              {plan.openings.map((o) => (
                <div
                  key={o.id}
                  onPointerDown={(e) => moveOpening(e, o)}
                  className={cn(
                    "absolute rounded-full",
                    selected === o.id ? "ring-2 ring-primary" : "",
                  )}
                  style={{
                    left: o.x * scale,
                    top: o.y * scale,
                    width: o.rot === 0 ? o.len * scale : 6,
                    height: o.rot === 0 ? 6 : o.len * scale,
                    background: o.type === "door" ? "var(--studio-accent)" : "var(--primary)",
                    cursor: "grab",
                  }}
                  title={`${o.type} · ${o.len} ft`}
                />
              ))}

              {plan.labels.map((l) => (
                <button
                  key={l.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(l.id);
                  }}
                  className={cn(
                    "absolute rounded-md border border-studio-line bg-white/90 px-1.5 py-0.5 text-[10px] text-studio-ink",
                    selected === l.id ? "ring-2 ring-primary" : "",
                  )}
                  style={{ left: l.x * scale, top: l.y * scale }}
                >
                  {l.text}
                </button>
              ))}

              {pending && (
                <span
                  className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                  style={{ left: pending.x * scale, top: pending.y * scale }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector */}
      <aside className="studio-panel w-full shrink-0 space-y-4 p-5 lg:w-64">
        <h3 className="text-xs uppercase tracking-[0.25em] text-studio-ink/50">Inspector</h3>
        {selectedRoom ? (
          <div className="space-y-3 text-sm text-studio-ink">
            <label className="block">
              <span className="text-xs text-studio-ink/60">Name</span>
              <input
                value={selectedRoom.name}
                onChange={(e) => updateRoom({ name: e.target.value })}
                className="studio-input mt-1"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["w", "h"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-xs text-studio-ink/60">
                    {k === "w" ? "Width" : "Depth"} (ft)
                  </span>
                  <input
                    type="number"
                    min={4}
                    value={selectedRoom[k]}
                    onChange={(e) => updateRoom({ [k]: Math.max(4, Number(e.target.value) || 4) })}
                    className="studio-input mt-1"
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-xs text-studio-ink/60">{k.toUpperCase()} (ft)</span>
                  <input
                    type="number"
                    value={selectedRoom[k]}
                    onChange={(e) => updateRoom({ [k]: Math.max(0, Number(e.target.value) || 0) })}
                    className="studio-input mt-1"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => updateRoom({ tone: (selectedRoom.tone + 1) % 6 })}
              className="w-full rounded-lg border border-studio-line py-2 text-xs text-studio-ink hover:bg-studio-line/40"
            >
              Change colour
            </button>
            <p className="text-xs text-studio-ink/60">Area: {roomArea(selectedRoom)} sq ft</p>
          </div>
        ) : selectedOpening ? (
          <div className="space-y-3 text-sm text-studio-ink">
            <p className="capitalize">{selectedOpening.type}</p>
            <label className="block">
              <span className="text-xs text-studio-ink/60">Width (ft)</span>
              <input
                type="number"
                min={1}
                value={selectedOpening.len}
                onChange={(e) =>
                  commit({
                    ...plan,
                    openings: plan.openings.map((o) =>
                      o.id === selectedOpening.id
                        ? { ...o, len: Math.max(1, Number(e.target.value) || 1) }
                        : o,
                    ),
                  })
                }
                className="studio-input mt-1"
              />
            </label>
            <button
              onClick={rotateSelected}
              className="w-full rounded-lg border border-studio-line py-2 text-xs hover:bg-studio-line/40"
            >
              Rotate
            </button>
          </div>
        ) : selectedLabel ? (
          <label className="block text-sm text-studio-ink">
            <span className="text-xs text-studio-ink/60">Note</span>
            <input
              value={selectedLabel.text}
              onChange={(e) =>
                commit({
                  ...plan,
                  labels: plan.labels.map((l) =>
                    l.id === selectedLabel.id ? { ...l, text: e.target.value } : l,
                  ),
                })
              }
              className="studio-input mt-1"
            />
          </label>
        ) : (
          <div className="space-y-2 text-xs leading-relaxed text-studio-ink/60">
            <p>Pick a tool, then click the sheet. Walls and dimensions take two clicks.</p>
            <p>
              Shortcuts: <b>V</b> select · <b>R</b> room · <b>W</b> wall · <b>D</b> door ·{" "}
              <b>Ctrl+Z</b> undo · <b>Del</b> delete.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
