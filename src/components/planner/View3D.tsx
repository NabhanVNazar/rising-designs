import { useState } from "react";
import { PX_PER_FT, toneColor, type FloorPlan } from "@/lib/plan";

const WALL_H = 9; // feet

export function View3D({ plan, plot }: { plan: FloorPlan; plot: { w: number; h: number } }) {
  const [rot, setRot] = useState(-28);
  const [tilt, setTilt] = useState(58);
  const [zoom, setZoom] = useState(0.75);

  const W = plot.w * PX_PER_FT;
  const H = plot.h * PX_PER_FT;
  const wallPx = WALL_H * PX_PER_FT;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_50%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_65%)]"
        style={{ height: 520, perspective: 1600 }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transformStyle: "preserve-3d",
            transform: `translate(-50%,-50%) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
            width: W,
            height: H,
          }}
        >
          {/* ground slab */}
          <div
            className="absolute inset-0 rounded-sm border border-primary/40"
            style={{
              background:
                "repeating-linear-gradient(0deg, color-mix(in oklab, var(--primary) 8%, transparent) 0 13px, transparent 13px 14px), repeating-linear-gradient(90deg, color-mix(in oklab, var(--primary) 8%, transparent) 0 13px, transparent 13px 14px)",
            }}
          />

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
                    background: `color-mix(in oklab, ${c} 30%, transparent)`,
                    border: `1px solid ${c}`,
                  }}
                />
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
                      background: `linear-gradient(180deg, color-mix(in oklab, ${c} 70%, white 10%), color-mix(in oklab, ${c} 45%, black 25%))`,
                      border: "1px solid color-mix(in oklab, black 25%, transparent)",
                      opacity: 0.92,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {plan.rooms.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Draw rooms in the 2D editor to see them rise in 3D.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Rotate", value: rot, min: -180, max: 180, set: setRot },
          { label: "Tilt", value: tilt, min: 10, max: 85, set: setTilt },
        ].map((s) => (
          <label key={s.label} className="text-xs text-muted-foreground">
            {s.label}
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
        <label className="text-xs text-muted-foreground">
          Zoom
          <input
            type="range"
            min={30}
            max={140}
            value={zoom * 100}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="mt-2 w-full accent-[var(--primary)]"
          />
        </label>
      </div>
    </div>
  );
}
