import { useCallback, useRef, useState } from "react";
import {
  DoorOpen,
  MousePointer2,
  PanelTop,
  Square,
  Trash2,
} from "lucide-react";
import {
  PX_PER_FT,
  roomArea,
  toneColor,
  uid,
  type FloorPlan,
  type Opening,
  type Room,
} from "@/lib/plan";
import { cn } from "@/lib/utils";

type Tool = "select" | "room" | "door" | "window";

const tools: { id: Tool; label: string; icon: typeof Square }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "room", label: "Room", icon: Square },
  { id: "door", label: "Door", icon: DoorOpen },
  { id: "window", label: "Window", icon: PanelTop },
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    room: Room;
  } | null>(null);

  const snap = (v: number) => Math.round(v * 2) / 2;

  const pointToFt = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: snap((e.clientX - rect.left) / PX_PER_FT),
      y: snap((e.clientY - rect.top) / PX_PER_FT),
    };
  }, []);

  function handleCanvasClick(e: React.MouseEvent) {
    if (tool === "select") {
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
      onChange({ ...plan, rooms: [...plan.rooms, room] });
      setSelected(room.id);
    } else {
      const opening: Opening = {
        id: uid(),
        type: tool === "door" ? "door" : "window",
        x: p.x,
        y: p.y,
        len: tool === "door" ? 3 : 4,
        rot: 0,
      };
      onChange({ ...plan, openings: [...plan.openings, opening] });
      setSelected(opening.id);
    }
    setTool("select");
  }

  function startDrag(e: React.PointerEvent, room: Room, mode: "move" | "resize") {
    if (tool !== "select") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id: room.id, mode, startX: e.clientX, startY: e.clientY, room };
    setSelected(room.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = snap((e.clientX - d.startX) / PX_PER_FT);
    const dy = snap((e.clientY - d.startY) / PX_PER_FT);
    onChange({
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
    });
  }

  function endDrag() {
    drag.current = null;
  }

  function moveOpening(e: React.PointerEvent, op: Opening) {
    if (tool !== "select") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelected(op.id);
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
    onChange({
      rooms: plan.rooms.filter((r) => r.id !== selected),
      openings: plan.openings.filter((o) => o.id !== selected),
    });
    setSelected(null);
  }

  const selectedRoom = plan.rooms.find((r) => r.id === selected) ?? null;
  const selectedOpening = plan.openings.find((o) => o.id === selected) ?? null;

  function updateRoom(patch: Partial<Room>) {
    if (!selectedRoom) return;
    onChange({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === selectedRoom.id ? { ...r, ...patch } : r)),
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex gap-2 lg:flex-col">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border border-border transition-colors",
              tool === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          onClick={deleteSelected}
          disabled={!selected}
          title="Delete selection"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0 flex-1 overflow-auto rounded-2xl border border-border bg-surface/40 p-4">
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          className="relative grid-blueprint rounded-lg border border-primary/30 bg-background"
          style={{
            width: plot.w * PX_PER_FT,
            height: plot.h * PX_PER_FT,
            cursor: tool === "select" ? "default" : "crosshair",
          }}
        >
          {plan.rooms.map((r) => (
            <div
              key={r.id}
              onPointerDown={(e) => startDrag(e, r, "move")}
              className={cn(
                "absolute select-none rounded-sm border-2 text-[10px] transition-shadow",
                selected === r.id ? "z-10 shadow-lg" : "",
              )}
              style={{
                left: r.x * PX_PER_FT,
                top: r.y * PX_PER_FT,
                width: r.w * PX_PER_FT,
                height: r.h * PX_PER_FT,
                borderColor: toneColor(r.tone),
                background: `color-mix(in oklab, ${toneColor(r.tone)} 18%, transparent)`,
                cursor: tool === "select" ? "move" : "crosshair",
              }}
            >
              <div className="pointer-events-none p-1 font-medium text-foreground">
                {r.name}
                <div className="text-muted-foreground">
                  {r.w}×{r.h} ft · {roomArea(r)} sq ft
                </div>
              </div>
              {selected === r.id && (
                <span
                  onPointerDown={(e) => startDrag(e, r, "resize")}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border border-background bg-primary"
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
                o.type === "door" ? "bg-accent" : "bg-primary",
                selected === o.id ? "ring-2 ring-foreground" : "",
              )}
              style={{
                left: o.x * PX_PER_FT,
                top: o.y * PX_PER_FT,
                width: o.rot === 0 ? o.len * PX_PER_FT : 5,
                height: o.rot === 0 ? 5 : o.len * PX_PER_FT,
                cursor: "grab",
              }}
              title={o.type}
            />
          ))}
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-border bg-surface/40 p-5 lg:w-64">
        <h3 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Inspector</h3>
        {selectedRoom ? (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-xs text-muted-foreground">Name</span>
              <input
                value={selectedRoom.name}
                onChange={(e) => updateRoom({ name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["w", "h"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-xs text-muted-foreground">
                    {k === "w" ? "Width" : "Depth"} (ft)
                  </span>
                  <input
                    type="number"
                    min={4}
                    value={selectedRoom[k]}
                    onChange={(e) => updateRoom({ [k]: Math.max(4, Number(e.target.value) || 4) })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => updateRoom({ tone: (selectedRoom.tone + 1) % 6 })}
              className="w-full rounded-lg border border-border py-2 text-xs hover:bg-surface-2"
            >
              Change colour
            </button>
            <p className="text-xs text-muted-foreground">Area: {roomArea(selectedRoom)} sq ft</p>
          </div>
        ) : selectedOpening ? (
          <div className="space-y-3 text-sm">
            <p className="capitalize">{selectedOpening.type}</p>
            <button
              onClick={() =>
                onChange({
                  ...plan,
                  openings: plan.openings.map((o) =>
                    o.id === selectedOpening.id ? { ...o, rot: o.rot === 0 ? 90 : 0 } : o,
                  ),
                })
              }
              className="w-full rounded-lg border border-border py-2 text-xs hover:bg-surface-2"
            >
              Rotate
            </button>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pick the room tool and click the canvas to draw. Drag to move, use the corner handle to
            resize, and drop doors and windows on the walls.
          </p>
        )}
      </aside>
    </div>
  );
}
