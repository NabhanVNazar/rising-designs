import type { Units } from "./types";

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;

/** Format a millimetre length for display. */
export function fmtLen(mm: number, units: Units): string {
  if (units === "imperial") {
    const totalIn = mm / MM_PER_INCH;
    const ft = Math.floor(Math.abs(totalIn) / 12);
    const inch = Math.abs(totalIn) - ft * 12;
    const sign = totalIn < 0 ? "-" : "";
    return `${sign}${ft}'-${inch.toFixed(1)}"`;
  }
  if (Math.abs(mm) >= 1000) return `${(mm / 1000).toFixed(2)} m`;
  return `${Math.round(mm)} mm`;
}

export function fmtArea(mm2: number, units: Units): string {
  if (units === "imperial") return `${(mm2 / (MM_PER_FOOT * MM_PER_FOOT)).toFixed(1)} sq ft`;
  return `${(mm2 / 1e6).toFixed(2)} m²`;
}

export function fmtCoord(mm: number, units: Units): string {
  if (units === "imperial") return `${(mm / MM_PER_FOOT).toFixed(2)}'`;
  return `${(mm / 1000).toFixed(3)}`;
}

/** Parse a user-typed length. Accepts "4500", "4.5m", "450cm", "12ft", "18in", "12'6"". */
export function parseLen(input: string, units: Units): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  let m = s.match(/^(-?[\d.]+)(mm|cm|m|ft|'|in|")?$/);
  if (m) {
    const v = parseFloat(m[1]!);
    if (!Number.isFinite(v)) return null;
    switch (m[2]) {
      case "mm":
        return v;
      case "cm":
        return v * 10;
      case "m":
        return v * 1000;
      case "ft":
      case "'":
        return v * MM_PER_FOOT;
      case "in":
      case '"':
        return v * MM_PER_INCH;
      default:
        return units === "imperial" ? v * MM_PER_FOOT : v;
    }
  }
  m = s.match(/^(-?[\d.]+)'([\d.]+)"?$/);
  if (m) return parseFloat(m[1]!) * MM_PER_FOOT + parseFloat(m[2]!) * MM_PER_INCH;
  return null;
}
