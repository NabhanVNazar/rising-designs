import { useMemo } from "react";
import type { FloorPlan, Wall } from "@/lib/plan";

export type Side = "front" | "back" | "left" | "right";

const SIDE_LABEL: Record<Side, string> = {
  front: "Front (South) elevation",
  back: "Rear (North) elevation",
  left: "Left (West) elevation",
  right: "Right (East) elevation",
};

type Band = { id: string; start: number; len: number; depth: number; h: number };

/** Projects the real CAD walls and openings onto a vertical facade. */
export function Elevation({
  plan,
  plot,
  side,
  floors,
  wallH,
  roof,
}: {
  plan: FloorPlan;
  plot: { w: number; h: number };
  side: Side;
  floors: number;
  wallH: number;
  roof: "flat" | "gable" | "parapet";
}) {
  const horizontal = side === "front" || side === "back";
  const flip = side === "back" || side === "right";

  // Walls: use the drawn walls, falling back to the four sides of each room.
  const walls: Wall[] = useMemo(() => {
    if (plan.walls.length) return plan.walls;
    return plan.rooms.flatMap((r) =>
      [
        [r.x, r.y, r.x + r.w, r.y],
        [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
        [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
        [r.x, r.y + r.h, r.x, r.y],
      ].map((s, i) => ({
        id: `${r.id}-w${i}`,
        x1: s[0]!,
        y1: s[1]!,
        x2: s[2]!,
        y2: s[3]!,
        t: 0.6,
        hgt: wallH,
      })),
    );
  }, [plan.walls, plan.rooms, wallH]);

  const spanFt = useMemo(() => {
    const vals = walls.flatMap((w) => (horizontal ? [w.x1, w.x2] : [w.y1, w.y2]));
    const max = vals.length ? Math.max(...vals) : 0;
    return Math.max(horizontal ? plot.w : plot.h, max + 2, 12);
  }, [walls, horizontal, plot]);

  const bands = useMemo<Band[]>(() => {
    const out: Band[] = [];
    for (const w of walls) {
      const a = horizontal ? w.x1 : w.y1;
      const b = horizontal ? w.x2 : w.y2;
      const d1 = horizontal ? w.y1 : w.x1;
      const d2 = horizontal ? w.y2 : w.x2;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const len = Math.max(hi - lo, Math.max(0.4, w.t)); // perpendicular walls show as a thin pier
      out.push({
        id: w.id,
        start: flip ? spanFt - lo - len : lo,
        len,
        depth: (d1 + d2) / 2,
        h: w.hgt || wallH,
      });
    }
    // paint far walls first so near walls overlap them
    const far = (d: number) => (side === "front" || side === "left" ? -d : d);
    return out.sort((p, q) => far(q.depth) - far(p.depth));
  }, [walls, horizontal, flip, spanFt, side, wallH]);

  const openings = useMemo(() => {
    return plan.openings
      .map((o) => {
        const alongAxisIsX = horizontal;
        // only openings hosted in walls that face this side read as a true opening
        const facing = alongAxisIsX ? o.rot === 0 : o.rot === 90;
        const a = alongAxisIsX ? o.x : o.y;
        const depth = alongAxisIsX ? o.y : o.x;
        const start = flip ? spanFt - a - o.len / 2 : a - o.len / 2;
        return { ...o, start, depth, facing };
      })
      .filter((o) => o.facing)
      .sort((p, q) => (side === "front" || side === "left" ? q.depth - p.depth : p.depth - q.depth));
  }, [plan.openings, horizontal, flip, spanFt, side]);

  const SCALE = 11; // px per ft
  const width = spanFt * SCALE;
  const storey = wallH;
  const totalH = floors * storey;
  const roofH = roof === "flat" ? 0.6 : roof === "parapet" ? 3 : 6.5;
  const height = (totalH + roofH) * SCALE + 46;
  const ground = height - 26;

  const depths = bands.map((b) => b.depth);
  const minD = depths.length ? Math.min(...depths) : 0;
  const maxD = depths.length ? Math.max(...depths) : 1;
  const shade = (d: number) => {
    const t = maxD === minD ? 0 : (d - minD) / (maxD - minD);
    const near = side === "front" || side === "left" ? 1 - t : t;
    return 20 + near * 45; // % of ink mixed into white
  };

  return (
    <figure className="studio-panel overflow-hidden">
      <figcaption className="border-b border-studio-line px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-studio-ink/60">
        {SIDE_LABEL[side]}
      </figcaption>
      <div className="studio-paper overflow-auto p-5">
        <svg width={width + 60} height={height} className="min-w-full">
          <defs>
            <linearGradient id={`sky-${side}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--studio-paper)" />
              <stop offset="100%" stopColor="var(--studio-bg)" />
            </linearGradient>
          </defs>
          <rect width={width + 60} height={height} fill={`url(#sky-${side})`} />

          <g transform="translate(30,0)">
            {Array.from({ length: floors }).map((_, f) => {
              const yTop = ground - (f + 1) * storey * SCALE;
              return (
                <g key={`s${f}`}>
                  {bands.map((b) => (
                    <rect
                      key={`${b.id}-${f}`}
                      x={b.start * SCALE}
                      y={yTop}
                      width={Math.max(1.5, b.len * SCALE)}
                      height={storey * SCALE}
                      fill={`color-mix(in oklab, var(--studio-ink) ${shade(b.depth).toFixed(0)}%, white)`}
                      stroke="var(--studio-ink)"
                      strokeWidth={0.9}
                    />
                  ))}
                  {openings.map((o) => {
                    const isWin = o.type === "window";
                    const oh = Math.min(o.h, storey - 0.5);
                    const sill = Math.min(o.sill, Math.max(0, storey - oh - 0.3));
                    const y = ground - f * storey * SCALE - (sill + oh) * SCALE;
                    // ground-floor doors only exist on the lowest storey
                    if (!isWin && f > 0) return null;
                    return (
                      <rect
                        key={`${o.id}-${f}`}
                        x={o.start * SCALE}
                        y={y}
                        width={o.len * SCALE}
                        height={oh * SCALE}
                        fill={
                          isWin
                            ? "color-mix(in oklab, var(--primary) 45%, white)"
                            : "color-mix(in oklab, var(--studio-accent) 45%, white)"
                        }
                        stroke="var(--studio-ink)"
                        strokeWidth={0.9}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* roof */}
            {roof === "gable" ? (
              <polygon
                points={`${-6},${ground - totalH * SCALE} ${width / 2},${ground - (totalH + roofH) * SCALE} ${width + 6},${ground - totalH * SCALE}`}
                fill="color-mix(in oklab, var(--studio-ink) 38%, white)"
                stroke="var(--studio-ink)"
              />
            ) : (
              <rect
                x={-8}
                y={ground - (totalH + roofH) * SCALE}
                width={width + 16}
                height={roofH * SCALE}
                fill="color-mix(in oklab, var(--studio-ink) 32%, white)"
                stroke="var(--studio-ink)"
              />
            )}

            {/* ground line + level marks */}
            <line x1={-24} y1={ground} x2={width + 24} y2={ground} stroke="var(--studio-ink)" strokeWidth={2.2} />
            {Array.from({ length: floors + 1 }).map((_, f) => (
              <g key={f}>
                <line
                  x1={-18}
                  y1={ground - f * storey * SCALE}
                  x2={width + 18}
                  y2={ground - f * storey * SCALE}
                  stroke="var(--studio-accent)"
                  strokeWidth={0.7}
                  strokeDasharray="5 4"
                />
                <text
                  x={-20}
                  y={ground - f * storey * SCALE - 3}
                  fontSize={9}
                  textAnchor="end"
                  fill="var(--studio-accent)"
                >
                  {(f * storey).toFixed(1)}'
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <figcaption className="border-t border-studio-line px-4 py-2 text-[11px] text-studio-ink/60">
        {walls.length} wall segments · {openings.length} openings facing this side · ridge{" "}
        {(totalH + roofH).toFixed(1)} ft
      </figcaption>
    </figure>
  );
}
