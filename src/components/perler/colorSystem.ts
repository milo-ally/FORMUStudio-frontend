import type { PaletteColor, ColorSystem } from "../../types";
import colorSystemMapping from "./colorSystemMapping.json";

type ColorMapping = Record<string, Record<ColorSystem, string>>;
const mapping = colorSystemMapping as ColorMapping;

export const colorSystemOptions: { key: ColorSystem; name: string }[] = [
  { key: "MARD", name: "MARD" },
  { key: "COCO", name: "COCO" },
  { key: "漫漫", name: "漫漫" },
  { key: "盼盼", name: "盼盼" },
  { key: "咪小窝", name: "咪小窝" },
];

export function getMardToHexMapping(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [hex, data] of Object.entries(mapping)) {
    if (data.MARD) out[data.MARD] = hex;
  }
  return out;
}

export function convertPaletteToColorSystem(
  palette: PaletteColor[],
  system: ColorSystem,
): PaletteColor[] {
  return palette.map((c) => {
    const m = mapping[c.hex];
    if (m && m[system]) return { ...c, key: m[system] };
    return c;
  });
}

export function getColorKeyByHex(hex: string, system: ColorSystem): string {
  const normalized = hex.toUpperCase();
  const m = mapping[normalized];
  if (m && m[system]) return m[system];
  return "?";
}

export function getDisplayColorKey(hex: string, system: ColorSystem): string {
  if (hex === "ERASE" || hex.length === 0 || hex === "?") return hex;
  return getColorKeyByHex(hex, system);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function sortColorsByHue<T extends { color: string }>(colors: T[]): T[] {
  return colors.slice().sort((a, b) => {
    const ha = hexToHsl(a.color);
    const hb = hexToHsl(b.color);
    if (Math.abs(ha.h - hb.h) > 5) return ha.h - hb.h;
    if (Math.abs(ha.l - hb.l) > 3) return hb.l - ha.l;
    return hb.s - ha.s;
  });
}
