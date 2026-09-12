import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { PX_PER_FT, toneColor, type FloorPlan, type Opening, type Wall } from "@/lib/plan";
import { cn } from "@/lib/utils";

type RoofKind = "flat" | "gable" | "parapet";

const SLOPE = 26; // degrees for the gable roof

/** One solid wall: two faces, a top cap and two end caps. */
function WallBox({
  w,
  base,
  height,
  opacity,
  tone,
}: {
  w: Wall;
  base: number;
  height: number;
  opacity: number;
  tone?: string;
}) {
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) * PX_PER_FT;
  if (len < 2) return null;
  const angle = (Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180) / Math.PI;
  const t = Math.max(2, w.t * PX_PER_FT);
  const face = tone ?? "#e2e8f0";
  const side = `linear-gradient(180deg, color-mix(in oklab, ${face} 92%, white), color-mix(in oklab, ${face} 70%, black 22%))`;

  return (
    <div
      className="absolute"
      style={{
        left: w.x1 * PX_PER_FT,
        top: w.y1 * PX_PER_FT,
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: `translateZ(${base}px) rotateZ(${angle}deg)`,
      }}
    >
      {[-t / 2, t / 2].map((off, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: len,
            height,
            transformOrigin: "0 0",
            transform: `translateY(${off}px) rotateX(90deg)`,
            background: side,
            border: "1px solid rgb(71 85 105 / 0.55)",
            opacity,
            backfaceVisibility: "visible",
          }}
        />
      ))}
      {/* top cap */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: -t / 2,
          width: len,
          height: t,
          transform: `translateZ(${height}px)`,
          background: `color-mix(in oklab, ${face} 60%, black 12%)`,
          border: "1px solid rgb(71 85 105 / 0.5)",
          opacity,
        }}
      />
      {/* end caps */}
      {[0, len].map((x, i) => (
        <div
          key={`c${i}`}
          className="absolute"
          style={{
            left: x,
            top: -t / 2,
            width: t,
            height,
            transformOrigin: "0 0",
            transform: `rotateY(-90deg) rotateX(90deg)`,
            background: `color-mix(in oklab, ${face} 75%, black 18%)`,
            opacity,
          }}
        />
      ))}
    </div>
  );
}

/** Door / window panel sunk into its host wall. */
function OpeningPanel({ o, base, thickness }: { o: Opening; base: number; thickness: number }) {
  const len = o.len * PX_PER_FT;
  const h = Math.max(6, o.h * PX_PER_FT);
  const isWin = o.type === "window";
  const t = Math.max(3, thickness * PX_PER_FT);
  return (
    <div
      className="absolute"
      style={{
        left: o.x * PX_PER_FT,
        top: o.y * PX_PER_FT,
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: `translateZ(${base + o.sill * PX_PER_FT}px) rotateZ(${o.rot}deg)`,
      }}
    >
      {[-(t / 2 + 0.6), t / 2 + 0.6].map((off, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: -len / 2,
            top: 0,
            width: len,
            height: h,
            transformOrigin: "0 0",
            transform: `translateY(${off}px) rotateX(90deg)`,
            background: isWin
              ? "linear-gradient(180deg, rgb(125 211 252 / 0.85), rgb(14 165 233 / 0.55))"
              : "linear-gradient(180deg, #b45309, #7c2d12)",
            border: "1.5px solid rgb(30 41 59 / 0.6)",
            boxShadow: isWin ? "inset 0 0 10px rgb(255 255 255 / 0.5)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export function View3D({ plan, plot, storeys = 1 }: { plan: FloorPlan; plot: { w: number; h: number }; storeys?: number }) {
  const [rot, setRot] = useState(-28);
  const [tilt, setTilt] = useState(58);
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [wallH, setWallH] = useState(9.5);
  const [opacity, setOpacity] = useState(1);
  const [floors, setFloors] = useState(Math.max(1, Math.min(4, storeys)));
  const [roof, setRoof] = useState<RoofKind>("gable");
  const [showLabels, setShowLabels] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [showSlab, setShowSlab] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; rot: number; tilt: number; pan: boolean; px: number; py: number } | null>(
    null,
  );

  const W = plot.w * PX_PER_FT;
  const H = plot.h * PX_PER_FT;
  const storeyPx = wallH * PX_PER_FT;
  const slabPx = 8;

  const handleWheel = useCallback((e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    setZoom((z) => Math.min(2.5, Math.max(0.15, z * Math.exp(-dy * 0.0015))));
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
    if (d.pan) setPan({ x: d.px + dx, y: d.py + dy });
    else {
      setRot(d.rot + dx * 0.4);
      setTilt(Math.min(88, Math.max(2, d.tilt - dy * 0.3)));
    }
  }

  const endDrag = () => {
    drag.current = null;
  };

  // Fall back to the four sides of each room when no explicit walls were drawn.
  const wallsForStorey: Wall[] = plan.walls.length
    ? plan.walls
    : plan.rooms.flatMap((r) => {
        const c = [
          [r.x, r.y, r.x + r.w, r.y],
          [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
          [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
          [r.x, r.y + r.h, r.x, r.y],
        ];
        return c.map((s, i) => ({
          id: `${r.id}-w${i}`,
          x1: s[0]!,
          y1: s[1]!,
          x2: s[2]!,
          y2: s[3]!,
          t: 0.6,
          hgt: wallH,
        }));
      });

  const avgT = wallsForStorey.length
    ? wallsForStorey.reduce((s, w) => s + w.t, 0) / wallsForStorey.length
    : 0.6;

  const totalH = floors * (storeyPx + slabPx);
  const empty = plan.rooms.length === 0 && plan.walls.length === 0;

  return (
    <div className="studio-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-studio-line px-3 py-2 text-xs text-studio-ink/70">
        <span>Drag to orbit · Shift+drag to pan · scroll to zoom</span>
        <div className="flex items-center gap-1">
          {(["flat", "gable", "parapet"] as RoofKind[]).map((r) => (
            <button
              key={r}
              onClick={() => setRoof(r)}
              className={cn(
                "rounded-md px-2 py-1 capitalize",
                roof === r ? "bg-primary/15 text-primary" : "hover:bg-studio-line/50",
              )}
            >
              {r}
            </button>
          ))}
          {[
            { label: "Slab", on: showSlab, fn: () => setShowSlab((v) => !v) },
            { label: "Ceiling", on: showCeiling, fn: () => setShowCeiling((v) => !v) },
            { label: "Labels", on: showLabels, fn: () => setShowLabels((v) => !v) },
          ].map((t) => (
            <button
              key={t.label}
              onClick={t.fn}
              className={cn("rounded-md px-2 py-1", t.on ? "bg-primary/15 text-primary" : "hover:bg-studio-line/50")}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setZoom((z) => Math.max(0.15, +(z - 0.1).toFixed(2)))}
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
              setZoom(0.7);
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
        style={{ height: 620, perspective: 1800, cursor: drag.current ? "grabbing" : "grab" }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transformStyle: "preserve-3d",
            transform: `translate(-50%,-50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${rot}deg) translateZ(${-totalH / 2}px)`,
            width: W,
            height: H,
          }}
        >
          {/* site ground */}
          <div
            className="absolute rounded-sm border border-studio-line"
            style={{
              left: -PX_PER_FT * 6,
              top: -PX_PER_FT * 6,
              width: W + PX_PER_FT * 12,
              height: H + PX_PER_FT * 12,
              background: "var(--studio-paper)",
              backgroundImage:
                "linear-gradient(to right, var(--studio-line) 1px, transparent 1px), linear-gradient(to bottom, var(--studio-line) 1px, transparent 1px)",
              backgroundSize: `${PX_PER_FT * 5}px ${PX_PER_FT * 5}px`,
              boxShadow: "0 40px 70px -30px rgb(15 23 42 / 0.5)",
            }}
          />

          {Array.from({ length: floors }).map((_, f) => {
            const base = f * (storeyPx + slabPx);
            return (
              <div key={`f${f}`} style={{ transformStyle: "preserve-3d" }}>
                {/* structural slab */}
                {showSlab && (
                  <div
                    className="absolute"
                    style={{
                      left: -4,
                      top: -4,
                      width: W + 8,
                      height: H + 8,
                      transform: `translateZ(${base}px)`,
                      background: "color-mix(in oklab, #94a3b8 35%, white)",
                      border: "1px solid rgb(100 116 139 / 0.6)",
                    }}
                  />
                )}

                {/* room floor finishes */}
                {plan.rooms.map((r) => {
                  const c = toneColor(r.tone);
                  return (
                    <div
                      key={`${r.id}-${f}`}
                      className="absolute"
                      style={{
                        left: r.x * PX_PER_FT,
                        top: r.y * PX_PER_FT,
                        width: r.w * PX_PER_FT,
                        height: r.h * PX_PER_FT,
                        transform: `translateZ(${base + 1}px)`,
                        background: `color-mix(in oklab, ${c} 24%, white)`,
                        border: `1px solid color-mix(in oklab, ${c} 60%, white)`,
                      }}
                    />
                  );
                })}

                {wallsForStorey.map((w) => (
                  <WallBox key={`${w.id}-${f}`} w={w} base={base} height={storeyPx} opacity={opacity} />
                ))}

                {plan.openings.map((o) => (
                  <OpeningPanel key={`${o.id}-${f}`} o={o} base={base} thickness={avgT} />
                ))}

                {/* ceiling plane */}
                {showCeiling && (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translateZ(${base + storeyPx}px)`,
                      background: "rgb(241 245 249 / 0.75)",
                      border: "1px solid rgb(148 163 184 / 0.6)",
                    }}
                  />
                )}

                {showLabels &&
                  f === floors - 1 &&
                  plan.rooms.map((r) => (
                    <div
                      key={`l${r.id}`}
                      className="absolute flex items-center justify-center text-[10px] font-medium text-studio-ink"
                      style={{
                        left: r.x * PX_PER_FT,
                        top: r.y * PX_PER_FT,
                        width: r.w * PX_PER_FT,
                        height: r.h * PX_PER_FT,
                        transform: `translateZ(${base + storeyPx + 14}px) rotateZ(${-rot}deg)`,
                      }}
                    >
                      {r.name}
                    </div>
                  ))}
              </div>
            );
          })}

          {/* roof */}
          {!empty && roof === "gable" ? (
            <div style={{ transformStyle: "preserve-3d" }}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: -6,
                    top: i === 0 ? -6 : H / 2,
                    width: W + 12,
                    height: H / 2 + 6,
                    transformOrigin: i === 0 ? "0 0" : "0 100%",
                    transform: `translateZ(${totalH}px) rotateX(${i === 0 ? -SLOPE : SLOPE}deg)`,
                    background:
                      i === 0
                        ? "linear-gradient(180deg, #64748b, #475569)"
                        : "linear-gradient(180deg, #475569, #334155)",
                    border: "1px solid rgb(30 41 59 / 0.7)",
                  }}
                />
              ))}
            </div>
          ) : !empty && roof === "parapet" ? (
            <div style={{ transformStyle: "preserve-3d" }}>
              <div
                className="absolute"
                style={{
                  left: -4,
                  top: -4,
                  width: W + 8,
                  height: H + 8,
                  transform: `translateZ(${totalH}px)`,
                  background: "color-mix(in oklab, #94a3b8 45%, white)",
                  border: "1px solid rgb(71 85 105 / 0.7)",
                }}
              />
              {[
                { id: "n", w: { id: "pn", x1: 0, y1: 0, x2: plot.w, y2: 0, t: 0.6, hgt: 3 } },
                { id: "s", w: { id: "ps", x1: 0, y1: plot.h, x2: plot.w, y2: plot.h, t: 0.6, hgt: 3 } },
                { id: "w", w: { id: "pw", x1: 0, y1: 0, x2: 0, y2: plot.h, t: 0.6, hgt: 3 } },
                { id: "e", w: { id: "pe", x1: plot.w, y1: 0, x2: plot.w, y2: plot.h, t: 0.6, hgt: 3 } },
              ].map((p) => (
                <WallBox key={p.id} w={p.w} base={totalH} height={3 * PX_PER_FT} opacity={1} tone="#cbd5e1" />
              ))}
            </div>
          ) : !empty ? (
            <div
              className="absolute"
              style={{
                left: -8,
                top: -8,
                width: W + 16,
                height: H + 16,
                transform: `translateZ(${totalH}px)`,
                background: "linear-gradient(140deg, #94a3b8, #64748b)",
                border: "1px solid rgb(51 65 85 / 0.8)",
              }}
            />
          ) : null}
        </div>

        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-studio-ink/60">
            Draw rooms and walls in the CAD editor to see them rise in 3D.
          </p>
        )}
      </div>

      <div className="grid gap-4 border-t border-studio-line p-4 sm:grid-cols-5">
        {[
          { label: "Rotate", value: rot, min: -180, max: 180, set: setRot, suffix: "°" },
          { label: "Tilt", value: tilt, min: 2, max: 88, set: setTilt, suffix: "°" },
          { label: "Storeys", value: floors, min: 1, max: 4, set: (v: number) => setFloors(v), suffix: "" },
          { label: "Floor height", value: wallH, min: 7, max: 16, set: setWallH, suffix: " ft" },
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
