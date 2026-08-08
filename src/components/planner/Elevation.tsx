import { useMemo } from "react";
import { toneColor, type FloorPlan, type Room } from "@/lib/plan";

export type Side = "front" | "back" | "left" | "right";

const SIDE_LABEL: Record<Side, string> = {
  front: "Front (South) elevation",
  back: "Rear (North) elevation",
  left: "Left (West) elevation",
  right: "Right (East) elevation",
};

/** Projects rooms onto a vertical facade for the chosen side. */
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
  const spanFt = horizontal ? plot.w : plot.h;

  const bands = useMemo(() => {
    const project = (r: Room) =>
      horizontal ? { a: r.x, len: r.w, depth: r.y } : { a: r.y, len: r.h, depth: r.x };
    const flip = side === "back" || side === "right";
    return plan.rooms
      .map((r) => {
        const p = project(r);
        return {
          id: r.id,
          name: r.name,
          tone: r.tone,
          start: flip ? spanFt - p.a - p.len : p.a,
          len: p.len,
          depth: p.depth,
        };
      })
      .sort((a, b) => (side === "front" || side === "left" ? a.depth - b.depth : b.depth - a.depth));
  }, [plan.rooms, horizontal, side, spanFt]);

  const SCALE = 11; // px per ft
  const width = spanFt * SCALE;
  const totalH = floors * wallH;
  const roofH = roof === "flat" ? 0 : roof === "parapet" ? 2 : 6;
  const height = (totalH + roofH) * SCALE + 40;
  const ground = height - 24;

  return (
    <figure className="studio-panel overflow-hidden">
      <figcaption className="border-b border-studio-line px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-studio-ink/60">
        {SIDE_LABEL[side]}
      </figcaption>
      <div className="studio-paper overflow-auto p-5">
        <svg width={width + 40} height={height} className="min-w-full">
          <defs>
            <linearGradient id={`sky-${side}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--studio-paper)" />
              <stop offset="100%" stopColor="var(--studio-bg)" />
            </linearGradient>
          </defs>
          <rect width={width + 40} height={height} fill={`url(#sky-${side})`} />

          <g transform="translate(20,0)">
            {/* facade bands per room */}
            {bands.map((b) =>
              Array.from({ length: floors }).map((_, f) => {
                const y = ground - (f + 1) * wallH * SCALE;
                return (
                  <g key={`${b.id}-${f}`}>
                    <rect
                      x={b.start * SCALE}
                      y={y}
                      width={b.len * SCALE}
                      height={wallH * SCALE}
                      fill={`color-mix(in oklab, ${toneColor(b.tone)} 22%, white)`}
                      stroke="var(--studio-ink)"
                      strokeWidth={1}
                    />
                    {/* window opening */}
                    <rect
                      x={(b.start + b.len / 2 - Math.min(3, b.len / 3)) * SCALE}
                      y={y + wallH * SCALE * 0.28}
                      width={Math.min(6, (b.len / 3) * 2) * SCALE}
                      height={wallH * SCALE * 0.38}
                      fill="color-mix(in oklab, var(--primary) 45%, white)"
                      stroke="var(--studio-ink)"
                      strokeWidth={0.8}
                    />
                    {f === 0 && b.len >= 8 && (
                      <rect
                        x={(b.start + 1) * SCALE}
                        y={ground - wallH * SCALE * 0.62}
                        width={3 * SCALE}
                        height={wallH * SCALE * 0.62}
                        fill="color-mix(in oklab, var(--studio-accent) 35%, white)"
                        stroke="var(--studio-ink)"
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              }),
            )}

            {/* roof */}
            {roof === "gable" ? (
              <polygon
                points={`0,${ground - totalH * SCALE} ${width / 2},${ground - (totalH + roofH) * SCALE} ${width},${ground - totalH * SCALE}`}
                fill="color-mix(in oklab, var(--studio-ink) 35%, white)"
                stroke="var(--studio-ink)"
              />
            ) : (
              <rect
                x={-6}
                y={ground - (totalH + roofH) * SCALE}
                width={width + 12}
                height={Math.max(6, roofH * SCALE)}
                fill="color-mix(in oklab, var(--studio-ink) 30%, white)"
                stroke="var(--studio-ink)"
              />
            )}

            {/* ground line + level marks */}
            <line x1={-20} y1={ground} x2={width + 20} y2={ground} stroke="var(--studio-ink)" strokeWidth={2} />
            {Array.from({ length: floors + 1 }).map((_, f) => (
              <g key={f}>
                <line
                  x1={-14}
                  y1={ground - f * wallH * SCALE}
                  x2={width + 14}
                  y2={ground - f * wallH * SCALE}
                  stroke="var(--studio-accent)"
                  strokeWidth={0.7}
                  strokeDasharray="5 4"
                />
                <text x={-16} y={ground - f * wallH * SCALE - 3} fontSize={9} textAnchor="end" fill="var(--studio-accent)">
                  {f * wallH}'
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </figure>
  );
}
