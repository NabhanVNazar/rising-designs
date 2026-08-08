import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { PX_PER_FT, toneColor, type FloorPlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

export function View3D({ plan, plot }: { plan: FloorPlan; plot: { w: number; h: number } }) {
  const [rot, setRot] = useState(-28);
  const [tilt, setTilt] = useState(58);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [wallH, setWallH] = useState(9);
  const [opacity, setOpacity] = useState(0.92);
  const [showLabels, setShowLabels] = useState(true);
  const [showFloor, setShowFloor] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; rot: number; tilt: number; pan: boolean; px: number; py: number } | null>(
    null,
  );

  const W = plot.w * PX_PER_FT;
  const H = plot.h * PX_PER_FT;
  const wallPx = wallH * PX_PER_FT;

  const handleWheel = useCallback((e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    setZoom((z) => Math.min(2.5, Math.max(0.2, z * Math.exp(-dy * 0.0015))));
  }, []);

  const wheelRef = useRef(handleWheel);
  wheelRef.current = handleWheel;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      rot,
      tilt,
      pan: e.shiftKey || e.button === 1 || e.button === 2,
      px: pan.x,
      py: pan.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.pan) {
      setPan({ x: d.px + dx, y: d.py + dy });
    } else {
      setRot(d.rot + dx * 0.4);
      setTilt(Math.min(88, Math.max(5, d.tilt - dy * 0.3)));
    }
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <div className="studio-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-studio-line px-3 py-2 text-xs text-studio-ink/70">
        <span>Drag to orbit · Shift+drag to pan · scroll to zoom</span>
        <div className="flex items-center gap-1">
          {[
            { label: "Floor", on: showFloor, fn: () => setShowFloor((v) => !v) },
            { label: "Labels", on: showLabels, fn: () => setShowLabels((v) => !v) },
          ].map((t) => (
            <button
              key={t.label}
              onClick={t.fn}
              className={cn(
                "rounded-md px-2 py-1",
                t.on ? "bg-primary/15 text-primary" : "hover:bg-studio-line/50",
              )}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
            className="rounded-md p-1 hover:bg-studio-line/50"
            title="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
            className="rounded-md p-1 hover:bg-studio-line/50"
            title="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setRot(-28);
              setTilt(58);
              setZoom(0.75);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded-md p-1 hover:bg-studio-line/50"
            title="Reset view"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onContextMenu={(e) => e.preventDefault()}
        className="studio-paper relative touch-none select-none overflow-hidden"
        style={{ height: 560, perspective: 1600, cursor: drag.current ? "grabbing" : "grab" }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transformStyle: "preserve-3d",
            transform: `translate(-50%,-50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
            width: W,
            height: H,
          }}
        >
          {showFloor && (
            <div
              className="absolute inset-0 rounded-sm border border-studio-line"
              style={{
                background: "var(--studio-paper)",
                backgroundImage:
                  "linear-gradient(to right, var(--studio-line) 1px, transparent 1px), linear-gradient(to bottom, var(--studio-line) 1px, transparent 1px)",
                backgroundSize: `${PX_PER_FT}px ${PX_PER_FT}px`,
                boxShadow: "0 30px 60px -30px rgb(15 23 42 / 0.5)",
              }}
            />
          )}

          {plan.rooms.map((r) => {
            const c = toneColor(r.tone);
            const x = r.x * PX_PER_FT;
            const y = r.y * PX_PER_FT;
            const w = r.w * PX_PER_FT;
            const h = r.h * PX_PER_FT;
            const walls: { left: number; top: number; len: number; angle: number }[] = [
              { left: x, top: y, len: w, angle: 0 },
              { left: x + w, top: y, len: h, angle: 90 },
              { left: x, top: y + h, len: w, angle: 0 },
              { left: x, top: y, len: h, angle: 90 },
            ];
            return (
              <div key={r.id} style={{ transformStyle: "preserve-3d" }}>
                <div
                  className="absolute"
                  style={{
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    background: `color-mix(in oklab, ${c} 22%, white)`,
                    border: `1px solid ${c}`,
                  }}
                />
                {showLabels && (
                  <div
                    className="absolute flex items-center justify-center text-[10px] font-medium text-studio-ink"
                    style={{
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      transform: `translateZ(${wallPx + 4}px) rotateZ(${-rot}deg)`,
                    }}
                  >
                    {r.name}
                  </div>
                )}
                {walls.map((wall, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: wall.left,
                      top: wall.top,
                      width: wall.len,
                      height: wallPx,
                      transformOrigin: "0 0",
                      transform: `rotateZ(${wall.angle}deg) rotateX(-90deg)`,
                      background: `linear-gradient(180deg, color-mix(in oklab, ${c} 45%, white), color-mix(in oklab, ${c} 65%, black 12%))`,
                      border: "1px solid color-mix(in oklab, black 18%, transparent)",
                      opacity,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {plan.rooms.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-studio-ink/60">
            Draw rooms in the 2D editor to see them rise in 3D.
          </p>
        )}
      </div>

      <div className="grid gap-4 border-t border-studio-line p-4 sm:grid-cols-4">
        {[
          { label: "Rotate", value: rot, min: -180, max: 180, set: setRot, suffix: "°" },
          { label: "Tilt", value: tilt, min: 5, max: 88, set: setTilt, suffix: "°" },
          { label: "Wall height", value: wallH, min: 7, max: 16, set: setWallH, suffix: " ft" },
          {
            label: "Wall opacity",
            value: Math.round(opacity * 100),
            min: 20,
            max: 100,
            set: (v: number) => setOpacity(v / 100),
            suffix: "%",
          },
        ].map((s) => (
          <label key={s.label} className="text-xs text-studio-ink/70">
            {s.label} · {Math.round(s.value)}
            {s.suffix}
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
