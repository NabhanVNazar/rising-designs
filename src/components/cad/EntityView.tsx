import { memo } from "react";
import type { Entity, Layer, Units } from "@/lib/cad/types";
import { angleDeg, dist, entityPoints, mid, polar } from "@/lib/cad/geometry";
import { fmtLen } from "@/lib/cad/units";
import { libItem } from "./library";

const SEL = "#2563eb";

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar({ x: cx, y: cy }, r, a0);
  const p1 = polar({ x: cx, y: cy }, r, a1);
  let sweep = a1 - a0;
  while (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 0 ${p1.x} ${p1.y}`;
}

function Furniture({ e, color }: { e: Extract<Entity, { type: "furniture" }>; color: string }) {
  const item = libItem(e.kind);
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const round = ["socket", "switch", "light", "water-tap", "drain", "plant", "armchair"].includes(e.kind);
  return (
    <g transform={`rotate(${e.rot} ${cx} ${cy})`}>
      {round ? (
        <circle cx={cx} cy={cy} r={Math.min(e.w, e.h) / 2} fill="none" stroke={color} strokeWidth={25} />
      ) : (
        <rect x={e.x} y={e.y} width={e.w} height={e.h} fill="none" stroke={color} strokeWidth={25} rx={40} />
      )}
      {e.kind.startsWith("bed") && (
        <>
          <line x1={e.x} y1={e.y + e.h * 0.28} x2={e.x + e.w} y2={e.y + e.h * 0.28} stroke={color} strokeWidth={20} />
          <rect
            x={e.x + e.w * 0.1}
            y={e.y + e.h * 0.05}
            width={e.w * 0.8}
            height={e.h * 0.16}
            fill="none"
            stroke={color}
            strokeWidth={18}
            rx={30}
          />
        </>
      )}
      {e.kind === "sofa" && (
        <rect x={e.x} y={e.y} width={e.w} height={e.h * 0.3} fill="none" stroke={color} strokeWidth={20} />
      )}
      {(e.kind === "sink" || e.kind === "washbasin") && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={e.w * 0.32}
          ry={e.h * 0.32}
          fill="none"
          stroke={color}
          strokeWidth={20}
        />
      )}
      {e.kind === "toilet" && (
        <ellipse cx={cx} cy={cy + e.h * 0.1} rx={e.w * 0.4} ry={e.h * 0.3} fill="none" stroke={color} strokeWidth={20} />
      )}
      {e.kind === "bathtub" && (
        <rect
          x={e.x + 120}
          y={e.y + 120}
          width={e.w - 240}
          height={e.h - 240}
          fill="none"
          stroke={color}
          strokeWidth={18}
          rx={200}
        />
      )}
      {e.kind === "shower" && (
        <>
          <line x1={e.x} y1={e.y} x2={e.x + e.w} y2={e.y + e.h} stroke={color} strokeWidth={16} />
          <line x1={e.x + e.w} y1={e.y} x2={e.x} y2={e.y + e.h} stroke={color} strokeWidth={16} />
        </>
      )}
      {e.kind === "car" && (
        <rect
          x={e.x + e.w * 0.12}
          y={e.y + e.h * 0.22}
          width={e.w * 0.76}
          height={e.h * 0.4}
          fill="none"
          stroke={color}
          strokeWidth={18}
          rx={80}
        />
      )}
      {(e.kind === "socket" || e.kind === "switch" || e.kind === "light") && (
        <text x={cx} y={cy + 60} fontSize={180} textAnchor="middle" fill={color}>
          {e.kind === "socket" ? "S" : e.kind === "switch" ? "K" : "L"}
        </text>
      )}
      {item && Math.min(e.w, e.h) > 600 && (
        <text x={cx} y={cy + 60} fontSize={150} textAnchor="middle" fill={color} opacity={0.55}>
          {item.label}
        </text>
      )}
    </g>
  );
}

function DimView({ e, units, color }: { e: Extract<Entity, { type: "dim" }>; units: Units; color: string }) {
  let a = e.a;
  let b = e.b;
  if (e.mode === "h") b = { x: e.b.x, y: e.a.y };
  if (e.mode === "v") b = { x: e.a.x, y: e.b.y };
  if (e.mode === "radius" || e.mode === "diameter") {
    const r = dist(a, b);
    const label = e.mode === "radius" ? `R ${fmtLen(r, units)}` : `Ø ${fmtLen(r * 2, units)}`;
    return (
      <g>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={20} />
        <text x={mid(a, b).x} y={mid(a, b).y - 80} fontSize={220} textAnchor="middle" fill={color}>
          {label}
        </text>
      </g>
    );
  }
  if (e.mode === "angular") {
    const ang = Math.abs(angleDeg(a, b));
    return (
      <g>
        <path d={arcPath(a.x, a.y, dist(a, b) * 0.5, 0, angleDeg(a, b))} fill="none" stroke={color} strokeWidth={18} />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={16} />
        <text x={a.x + 400} y={a.y - 200} fontSize={220} fill={color}>
          {ang.toFixed(1)}°
        </text>
      </g>
    );
  }
  const ang = angleDeg(a, b);
  const nx = Math.sin((ang * Math.PI) / 180);
  const ny = Math.cos((ang * Math.PI) / 180);
  const o = { x: nx * e.off, y: ny * e.off };
  const a2 = { x: a.x + o.x, y: a.y + o.y };
  const b2 = { x: b.x + o.x, y: b.y + o.y };
  const m = mid(a2, b2);
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={a2.x} y2={a2.y} stroke={color} strokeWidth={12} opacity={0.7} />
      <line x1={b.x} y1={b.y} x2={b2.x} y2={b2.y} stroke={color} strokeWidth={12} opacity={0.7} />
      <line x1={a2.x} y1={a2.y} x2={b2.x} y2={b2.y} stroke={color} strokeWidth={18} markerStart="url(#dimArrow)" markerEnd="url(#dimArrow)" />
      <text
        x={m.x}
        y={m.y - 90}
        fontSize={230}
        textAnchor="middle"
        fill={color}
        transform={`rotate(${-ang} ${m.x} ${m.y})`}
      >
        {fmtLen(dist(a2, b2), units)}
      </text>
    </g>
  );
}

export const EntityView = memo(function EntityView({
  e,
  layer,
  selected,
  units,
}: {
  e: Entity;
  layer?: Layer | undefined;
  selected: boolean;
  units: Units;
}) {
  const color = selected ? SEL : (layer?.color ?? "#334155");
  const sw = selected ? 45 : 30;

  switch (e.type) {
    case "wall": {
      const ang = angleDeg(e.a, e.b);
      const nx = Math.sin((ang * Math.PI) / 180) * (e.thickness / 2);
      const ny = Math.cos((ang * Math.PI) / 180) * (e.thickness / 2);
      const p = [
        { x: e.a.x + nx, y: e.a.y + ny },
        { x: e.b.x + nx, y: e.b.y + ny },
        { x: e.b.x - nx, y: e.b.y - ny },
        { x: e.a.x - nx, y: e.a.y - ny },
      ];
      return (
        <polygon
          points={p.map((q) => `${q.x},${q.y}`).join(" ")}
          fill={selected ? "rgba(37,99,235,0.22)" : e.kind === "exterior" ? "rgba(30,41,59,0.85)" : "rgba(71,85,105,0.5)"}
          stroke={color}
          strokeWidth={selected ? 40 : 20}
          strokeLinejoin="miter"
        />
      );
    }
    case "line":
      return <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={color} strokeWidth={sw} />;
    case "polyline":
      return (
        <polyline
          points={e.pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={e.closed ? "rgba(37,99,235,0.06)" : "none"}
          stroke={color}
          strokeWidth={sw}
        />
      );
    case "rect":
    case "room":
    case "stair": {
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      return (
        <g transform={`rotate(${e.rot} ${cx} ${cy})`}>
          <rect
            x={e.x}
            y={e.y}
            width={e.w}
            height={e.h}
            fill={e.type === "room" ? "rgba(37,99,235,0.07)" : selected ? "rgba(37,99,235,0.12)" : "none"}
            stroke={color}
            strokeWidth={sw}
          />
          {e.type === "stair" &&
            Array.from({ length: Math.max(2, e.steps) }).map((_, i) => {
              const y = e.y + ((i + 1) * e.h) / Math.max(2, e.steps);
              return <line key={i} x1={e.x} y1={y} x2={e.x + e.w} y2={y} stroke={color} strokeWidth={18} />;
            })}
          {e.type === "room" && (
            <>
              <text x={cx} y={cy - 60} fontSize={300} textAnchor="middle" fill={color} fontWeight={600}>
                {e.name}
              </text>
              <text x={cx} y={cy + 280} fontSize={230} textAnchor="middle" fill={color} opacity={0.7}>
                {fmtLen(e.w, units)} × {fmtLen(e.h, units)}
              </text>
            </>
          )}
        </g>
      );
    }
    case "circle":
      return <circle cx={e.c.x} cy={e.c.y} r={e.r} fill="none" stroke={color} strokeWidth={sw} />;
    case "arc":
      return <path d={arcPath(e.c.x, e.c.y, e.r, e.a0, e.a1)} fill="none" stroke={color} strokeWidth={sw} />;
    case "polygon": {
      const pts = Array.from({ length: e.sides }, (_, i) => polar(e.c, e.r, e.rot + (360 / e.sides) * i));
      return (
        <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={sw} />
      );
    }
    case "door": {
      const half = e.width / 2;
      const a = polar(e.c, half, e.rot + 180);
      const b = polar(e.c, half, e.rot);
      const swingEnd = polar(a, e.width, e.rot + 90 * e.swing);
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={130} />
          <line x1={a.x} y1={a.y} x2={swingEnd.x} y2={swingEnd.y} stroke={color} strokeWidth={30} />
          <path
            d={arcPath(a.x, a.y, e.width, e.rot, e.rot + 90 * e.swing)}
            fill="none"
            stroke={color}
            strokeWidth={22}
            strokeDasharray="120 90"
          />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={26} />
        </g>
      );
    }
    case "window": {
      const half = e.width / 2;
      const a = polar(e.c, half, e.rot + 180);
      const b = polar(e.c, half, e.rot);
      const n = { x: Math.sin((e.rot * Math.PI) / 180) * 90, y: Math.cos((e.rot * Math.PI) / 180) * 90 };
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={220} />
          <line x1={a.x + n.x} y1={a.y + n.y} x2={b.x + n.x} y2={b.y + n.y} stroke={color} strokeWidth={26} />
          <line x1={a.x - n.x} y1={a.y - n.y} x2={b.x - n.x} y2={b.y - n.y} stroke={color} strokeWidth={26} />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={18} opacity={0.6} />
        </g>
      );
    }
    case "column":
      return e.shape === "round" ? (
        <circle cx={e.c.x} cy={e.c.y} r={e.size / 2} fill="rgba(124,58,237,0.25)" stroke={color} strokeWidth={sw} />
      ) : (
        <rect
          x={e.c.x - e.size / 2}
          y={e.c.y - e.size / 2}
          width={e.size}
          height={e.size}
          fill="rgba(124,58,237,0.25)"
          stroke={color}
          strokeWidth={sw}
        />
      );
    case "text":
      return (
        <text
          x={e.p.x}
          y={e.p.y}
          fontSize={e.size}
          fill={color}
          transform={`rotate(${-e.rot} ${e.p.x} ${e.p.y})`}
        >
          {e.text}
        </text>
      );
    case "dim":
      return <DimView e={e} units={units} color={color} />;
    case "measure": {
      const total = e.pts.reduce((s, p, i) => (i ? s + dist(e.pts[i - 1]!, p) : 0), 0);
      const last = e.pts[e.pts.length - 1] ?? { x: 0, y: 0 };
      return (
        <g>
          <polyline
            points={e.pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={24}
            strokeDasharray="150 100"
          />
          <text x={last.x + 150} y={last.y - 120} fontSize={230} fill={color}>
            {fmtLen(total, units)}
          </text>
        </g>
      );
    }
    case "furniture":
      return <Furniture e={e} color={color} />;
    default:
      return null;
  }
});

export function SelectionHandles({ e }: { e: Entity }) {
  const pts = entityPoints(e);
  return (
    <g data-ui="1">
      {pts.map((p, i) => (
        <rect
          key={i}
          x={p.x - 70}
          y={p.y - 70}
          width={140}
          height={140}
          fill="#fff"
          stroke={SEL}
          strokeWidth={30}
        />
      ))}
    </g>
  );
}
