import type { RgbColor, PaletteColor, MappedPixel, PixelationMode } from "../../types";

// ── Oklab color space conversion ──

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

interface OklabColor {
  l: number;
  a: number;
  b: number;
}

function rgbToOklab(rgb: RgbColor): OklabColor {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  };
}

/** Pack 8-bit RGB channels into a single 24-bit integer for fast Map keys. */
function rgbKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

const oklabCache = new Map<number, OklabColor>();

function getOklabColor(rgb: RgbColor): OklabColor {
  const key = rgbKey(rgb.r, rgb.g, rgb.b);
  const cached = oklabCache.get(key);
  if (cached) return cached;
  const oklab = rgbToOklab(rgb);
  oklabCache.set(key, oklab);
  return oklab;
}

// ── Public API ──

export function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/** Oklab color distance scaled to 0-100 range for threshold compatibility. */
export function colorDistance(rgb1: RgbColor, rgb2: RgbColor): number {
  const o1 = getOklabColor(rgb1);
  const o2 = getOklabColor(rgb2);
  const dl = o1.l - o2.l;
  const da = o1.a - o2.a;
  const db = o1.b - o2.b;
  return Math.sqrt(dl * dl + da * da + db * db) * 100;
}

// ── Palette acceleration ──

interface PaletteLookup {
  entries: PaletteColor[];
  l: Float64Array;
  a: Float64Array;
  b: Float64Array;
}

/** Precomputed Oklab coords for a palette, cached by array identity. */
const paletteLookupCache = new WeakMap<PaletteColor[], PaletteLookup>();

function buildPaletteLookup(palette: PaletteColor[]): PaletteLookup {
  const cached = paletteLookupCache.get(palette);
  if (cached) return cached;

  const n = palette.length;
  const l = new Float64Array(n);
  const a = new Float64Array(n);
  const b = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const ok = getOklabColor(palette[i].rgb);
    l[i] = ok.l;
    a[i] = ok.a;
    b[i] = ok.b;
  }

  const lookup: PaletteLookup = { entries: palette, l, a, b };
  paletteLookupCache.set(palette, lookup);
  return lookup;
}

/** Memoized target-RGB → closest palette entry. */
const closestCache = new Map<number, PaletteColor>();

// KNN (K=1) search in Oklab space for best palette match to a target RGB color.
export function findClosestPaletteColor(
  targetRgb: RgbColor,
  palette: PaletteColor[],
): PaletteColor {
  if (!palette || palette.length === 0) {
    return { key: "ERR", hex: "#000000", rgb: { r: 0, g: 0, b: 0 } };
  }

  const cacheKey = rgbKey(targetRgb.r, targetRgb.g, targetRgb.b);
  const cached = closestCache.get(cacheKey);
  if (cached) return cached;

  const lookup = buildPaletteLookup(palette);
  const t = getOklabColor(targetRgb);

  let minDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < lookup.entries.length; i++) {
    const dl = t.l - lookup.l[i];
    const da = t.a - lookup.a[i];
    const db = t.b - lookup.b[i];
    // Compare squared distances — sqrt is monotonic, skip it
    const dist = dl * dl + da * da + db * db;
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
      if (dist === 0) break;
    }
  }

  const best = lookup.entries[bestIdx];
  closestCache.set(cacheKey, best);
  return best;
}

// ── Core pixelation ──

export const TRANSPARENT_KEY = "ERASE";
const transparentPixel: MappedPixel = {
  key: TRANSPARENT_KEY,
  color: "#FFFFFF",
  isExternal: true,
};

function cellRepresentativeColor(
  imageData: ImageData,
  startX: number,
  startY: number,
  width: number,
  height: number,
  mode: PixelationMode,
): RgbColor | null {
  const data = imageData.data;
  const imgWidth = imageData.width;
  let rSum = 0,
    gSum = 0,
    bSum = 0;
  let pixelCount = 0;
  const counts: Record<number, number> = {};
  let dominantRgb: RgbColor | null = null;
  let maxCount = 0;

  const endX = startX + width;
  const endY = startY + height;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imgWidth + x) * 4;
      if (data[idx + 3] < 128) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      pixelCount++;

      if (mode === "average") {
        rSum += r;
        gSum += g;
        bSum += b;
      } else {
        const k = rgbKey(r, g, b);
        counts[k] = (counts[k] || 0) + 1;
        if (counts[k] > maxCount) {
          maxCount = counts[k];
          dominantRgb = { r, g, b };
        }
      }
    }
  }

  if (pixelCount === 0) return null;

  if (mode === "average") {
    return {
      r: Math.round(rSum / pixelCount),
      g: Math.round(gSum / pixelCount),
      b: Math.round(bSum / pixelCount),
    };
  }
  return dominantRgb;
}

export function calculatePixelGrid(
  imageData: ImageData,
  N: number,
  M: number,
  palette: PaletteColor[],
  mode: PixelationMode,
): MappedPixel[][] {
  const fallback = palette[0] ?? { key: "T1", hex: "#FFFFFF", rgb: { r: 255, g: 255, b: 255 } };
  const grid: MappedPixel[][] = Array.from({ length: M }, () =>
    Array.from({ length: N }, () => ({ key: fallback.key, color: fallback.hex })),
  );

  const imgWidth = imageData.width;
  const imgHeight = imageData.height;
  const cellW = imgWidth / N;
  const cellH = imgHeight / M;

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const sx = Math.floor(i * cellW);
      const sy = Math.floor(j * cellH);
      const ex = Math.min(imgWidth, Math.ceil((i + 1) * cellW));
      const ey = Math.min(imgHeight, Math.ceil((j + 1) * cellH));
      const cw = Math.max(1, ex - sx);
      const ch = Math.max(1, ey - sy);

      const rep = cellRepresentativeColor(imageData, sx, sy, cw, ch, mode);
      if (rep) {
        const match = findClosestPaletteColor(rep, palette);
        grid[j][i] = { key: match.key, color: match.hex };
      } else {
        grid[j][i] = { ...transparentPixel };
      }
    }
  }
  return grid;
}
