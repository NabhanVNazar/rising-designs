import type { CadDoc, Entity, Pt } from "./types";
import { cadUid, LAYER_FOR, normalizeDoc } from "./types";
import { entityBBox } from "./geometry";

export function docBounds(doc: CadDoc) {
  if (!doc.entities.length) return { x: -5000, y: -5000, w: 20000, h: 15000 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of doc.entities) {
    const b = entityBBox(e);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const pad = 1000;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(doc: CadDoc) {
  download(`${doc.name || "plan"}.json`, new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
}

export async function importJSONFile(file: File): Promise<CadDoc> {
  return normalizeDoc(JSON.parse(await file.text()));
}

/** Serialize the live drawing SVG (without UI overlays) into a standalone string. */
export function serializeSvg(svg: SVGSVGElement, bounds: { x: number; y: number; w: number; h: number }) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-ui]").forEach((n) => n.remove());
  clone.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
  clone.setAttribute("width", String(Math.round(bounds.w / 10)));
  clone.setAttribute("height", String(Math.round(bounds.h / 10)));
  const g = clone.querySelector("[data-world]") as SVGGElement | null;
  if (g) g.removeAttribute("transform");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", String(bounds.x));
  bg.setAttribute("y", String(bounds.y));
  bg.setAttribute("width", String(bounds.w));
  bg.setAttribute("height", String(bounds.h));
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

export function exportSVG(svg: SVGSVGElement, doc: CadDoc) {
  const str = serializeSvg(svg, docBounds(doc));
  download(`${doc.name || "plan"}.svg`, new Blob([str], { type: "image/svg+xml" }));
}

export async function exportRaster(svg: SVGSVGElement, doc: CadDoc, type: "png" | "jpg") {
  const b = docBounds(doc);
  const str = serializeSvg(svg, b);
  const scale = Math.min(2400 / b.w, 2400 / b.h, 0.5);
  const w = Math.max(600, Math.round(b.w * scale));
  const h = Math.max(400, Math.round(b.h * scale));
  const img = new Image();
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const mime = type === "png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((res) => canvas.toBlob((b2) => res(b2!), mime, 0.92));
  download(`${doc.name || "plan"}.${type}`, blob);
}

export type SheetSize = "A4" | "A3" | "A2" | "A1";
const SHEETS: Record<SheetSize, { w: number; h: number }> = {
  A4: { w: 297, h: 210 },
  A3: { w: 420, h: 297 },
  A2: { w: 594, h: 420 },
  A1: { w: 841, h: 594 },
};

/** Opens a print-ready sheet with title block, scale bar and north arrow. */
export function printSheet(svg: SVGSVGElement, doc: CadDoc, size: SheetSize, scaleLabel: string) {
  const b = docBounds(doc);
  const body = serializeSvg(svg, b);
  const sheet = SHEETS[size];
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${doc.name}</title>
<style>
@page { size: ${size} landscape; margin: 8mm; }
body { font-family: ui-sans-serif, system-ui; margin:0; color:#111; }
.sheet { width:${sheet.w - 16}mm; height:${sheet.h - 16}mm; border:0.6mm solid #111; box-sizing:border-box; display:flex; flex-direction:column; }
.draw { flex:1; padding:6mm; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.draw svg { max-width:100%; max-height:100%; }
.title { border-top:0.4mm solid #111; display:flex; justify-content:space-between; padding:4mm 6mm; font-size:3.2mm; }
.title b { font-size:4.4mm; letter-spacing:.06em; }
.meta { text-align:right; line-height:1.6; }
.north { position:absolute; right:12mm; top:12mm; text-align:center; font-size:3mm; }
</style></head><body>
<div class="sheet"><div class="draw">${body}
<div class="north"><svg width="46" height="56" viewBox="0 0 46 56"><polygon points="23,4 33,44 23,36 13,44" fill="#111"/></svg><div>N</div></div>
</div>
<div class="title"><div><b>${doc.name || "Floor plan"}</b><div>EDIFICE — 2D CAD</div></div>
<div class="meta"><div>Sheet ${size} · Scale ${scaleLabel}</div><div>Units: ${doc.units}</div><div>${new Date().toLocaleDateString()}</div></div></div></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  win.document.close();
}

/* ---------------- DXF ---------------- */

function dxfLine(a: Pt, b: Pt, layer: string) {
  return `0\nLINE\n8\n${layer}\n10\n${a.x}\n20\n${-a.y}\n11\n${b.x}\n21\n${-b.y}\n`;
}

export function exportDXF(doc: CadDoc) {
  let out = "0\nSECTION\n2\nENTITIES\n";
  for (const e of doc.entities) {
    const layer = e.layer;
    if (e.type === "wall" || e.type === "line") out += dxfLine(e.a, e.b, layer);
    else if (e.type === "polyline" || e.type === "measure") {
      for (let i = 0; i < e.pts.length - 1; i++) out += dxfLine(e.pts[i]!, e.pts[i + 1]!, layer);
    } else if (e.type === "rect" || e.type === "room" || e.type === "furniture" || e.type === "stair") {
      const p = [
        { x: e.x, y: e.y },
        { x: e.x + e.w, y: e.y },
        { x: e.x + e.w, y: e.y + e.h },
        { x: e.x, y: e.y + e.h },
      ];
      for (let i = 0; i < 4; i++) out += dxfLine(p[i]!, p[(i + 1) % 4]!, layer);
    } else if (e.type === "circle") {
      out += `0\nCIRCLE\n8\n${layer}\n10\n${e.c.x}\n20\n${-e.c.y}\n40\n${e.r}\n`;
    } else if (e.type === "text") {
      out += `0\nTEXT\n8\n${layer}\n10\n${e.p.x}\n20\n${-e.p.y}\n40\n${e.size}\n1\n${e.text}\n`;
    }
  }
  out += "0\nENDSEC\n0\nEOF\n";
  download(`${doc.name || "plan"}.dxf`, new Blob([out], { type: "application/dxf" }));
}

/** Minimal DXF reader: LINE, LWPOLYLINE and CIRCLE entities. */
export async function importDXF(file: File): Promise<Entity[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out: Entity[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i] === "0") {
      const type = lines[i + 1];
      if (type === "LINE" || type === "CIRCLE" || type === "LWPOLYLINE") {
        const vals: Record<string, number[]> = {};
        let j = i + 2;
        while (j < lines.length && lines[j] !== "0") {
          const code = lines[j]!;
          const v = parseFloat(lines[j + 1] ?? "");
          if (Number.isFinite(v)) (vals[code] ??= []).push(v);
          j += 2;
        }
        if (type === "LINE" && vals["10"] && vals["11"]) {
          out.push({
            id: cadUid(),
            type: "line",
            layer: LAYER_FOR.line,
            z: 0,
            a: { x: vals["10"]![0]!, y: -(vals["20"]?.[0] ?? 0) },
            b: { x: vals["11"]![0]!, y: -(vals["21"]?.[0] ?? 0) },
          });
        } else if (type === "CIRCLE" && vals["10"]) {
          out.push({
            id: cadUid(),
            type: "circle",
            layer: LAYER_FOR.circle,
            z: 0,
            c: { x: vals["10"]![0]!, y: -(vals["20"]?.[0] ?? 0) },
            r: vals["40"]?.[0] ?? 500,
          });
        } else if (type === "LWPOLYLINE" && vals["10"]?.length) {
          const pts = vals["10"].map((x, k) => ({ x, y: -(vals["20"]?.[k] ?? 0) }));
          if (pts.length > 1)
            out.push({ id: cadUid(), type: "polyline", layer: LAYER_FOR.polyline, z: 0, pts, closed: false });
        }
        i = j;
        continue;
      }
    }
    i++;
  }
  return out;
}
