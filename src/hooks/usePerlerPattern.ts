import { useState, useCallback, useRef } from "react";
import type {
  MappedPixel,
  PaletteColor,
  PixelationMode,
  ColorSystem,
  PerlerExportOptions,
} from "../types";
import { hexToRgb, calculatePixelGrid } from "../lib/perler/pixelation";
import { getMardToHexMapping, convertPaletteToColorSystem } from "../lib/perler/colorSystem";
import { floodFillErase, replaceColor, paintSinglePixel, recalculateColorStats } from "../lib/perler/editing";
import { downloadPerlerImage } from "../lib/perler/download";

interface EditSnapshot {
  data: MappedPixel[][];
  counts: Record<string, { count: number; color: string }>;
  total: number;
}

export interface UsePerlerPatternReturn {
  imageSrc: string | null;
  setImage: (src: string | null) => void;
  gridN: number;
  setGridN: (n: number) => void;
  gridM: number;
  setGridM: (m: number) => void;
  pixelationMode: PixelationMode;
  setPixelationMode: (m: PixelationMode) => void;
  colorSystem: ColorSystem;
  setColorSystem: (s: ColorSystem) => void;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: Record<string, { count: number; color: string }> | null;
  totalBeadCount: number;
  palette: PaletteColor[];
  pixelate: () => void;
  paintPixel: (row: number, col: number, color: MappedPixel) => void;
  floodErase: (row: number, col: number) => void;
  replaceAllColor: (sourceHex: string, target: MappedPixel) => number;
  undo: () => void;
  canUndo: boolean;
  hasPattern: boolean;
  exportPattern: (options: PerlerExportOptions) => void;
  endStroke: () => void;
}

function loadImageData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function buildPalette(): PaletteColor[] {
  const mardToHex = getMardToHexMapping();
  return Object.entries(mardToHex)
    .map(([, hex]) => {
      const rgb = hexToRgb(hex);
      if (!rgb) return null;
      return { key: hex, hex, rgb };
    })
    .filter((c): c is PaletteColor => c !== null);
}

const fullPalette = buildPalette();

export function usePerlerPattern(): UsePerlerPatternReturn {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [gridN, setGridNState] = useState(50);
  const [gridM, setGridMState] = useState(50);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>("dominant");
  const [colorSystem, setColorSystem] = useState<ColorSystem>("MARD");

  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);
  const [colorCounts, setColorCounts] = useState<Record<string, { count: number; color: string }> | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState(0);

  const historyRef = useRef<EditSnapshot[]>([]);
  const isStrokingRef = useRef(false);
  const canUndo = historyRef.current.length > 0;

  // Refs for snapshot to avoid stale closure issues
  const dataRef = useRef<MappedPixel[][] | null>(null);
  const countsRef = useRef<Record<string, { count: number; color: string }> | null>(null);
  const totalRef = useRef(0);

  // Keep refs in sync
  dataRef.current = mappedPixelData;
  countsRef.current = colorCounts;
  totalRef.current = totalBeadCount;

  const palette = convertPaletteToColorSystem(fullPalette, colorSystem);

  const setGridN = useCallback((n: number) => {
    setGridNState(n);
  }, []);

  const setGridM = useCallback((m: number) => {
    setGridMState(m);
  }, []);

  const setImage = useCallback((src: string | null) => {
    setImageSrc(src);
    setMappedPixelData(null);
    setGridDimensions(null);
    setColorCounts(null);
    setTotalBeadCount(0);
    historyRef.current = [];
  }, []);

  const saveSnapshot = useCallback(() => {
    const data = dataRef.current;
    const counts = countsRef.current;
    if (!data || !counts) return;
    historyRef.current.push({
      data: data.map((r) => r.map((c) => ({ ...c }))),
      counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, { ...v }])),
      total: totalRef.current,
    });
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);

  const pixelate = useCallback(async () => {
    if (!imageSrc) return;

    // Validate and clamp grid dimensions
    const N = Math.max(10, Math.min(100, gridN || 50));
    const M = Math.max(10, Math.min(100, gridM || 50));
    if (N !== gridN) setGridNState(N);
    if (M !== gridM) setGridMState(M);

    try {
      const imageData = await loadImageData(imageSrc);

      const grid = calculatePixelGrid(imageData, N, M, fullPalette, pixelationMode);
      const stats = recalculateColorStats(grid);

      const displayGrid = grid.map((row) =>
        row.map((cell) => {
          if (cell.isExternal) return cell;
          const converted = convertPaletteToColorSystem(
            [{ key: cell.color, hex: cell.color, rgb: { r: 0, g: 0, b: 0 } }],
            colorSystem,
          );
          return { ...cell, key: converted[0]?.key ?? cell.key };
        }),
      );

      setMappedPixelData(displayGrid);
      setGridDimensions({ N, M });
      setColorCounts(stats.colorCounts);
      setTotalBeadCount(stats.totalCount);
      historyRef.current = [];
    } catch (err) {
      console.error("Pixelation failed:", err);
    }
  }, [imageSrc, gridN, gridM, pixelationMode, colorSystem]);

  const paintPixel = useCallback(
    (row: number, col: number, color: MappedPixel) => {
      const data = dataRef.current;
      const dims = gridDimensions;
      if (!data || !dims) return;
      if (row < 0 || row >= dims.M || col < 0 || col >= dims.N) return;

      try {
        const { newPixelData, hasChange } = paintSinglePixel(data, row, col, color);
        if (!hasChange) return;
        if (!isStrokingRef.current) {
          saveSnapshot();
          isStrokingRef.current = true;
        }
        setMappedPixelData(newPixelData);
        const stats = recalculateColorStats(newPixelData);
        setColorCounts(stats.colorCounts);
        setTotalBeadCount(stats.totalCount);
      } catch (err) {
        console.error("Paint pixel failed:", err);
      }
    },
    [gridDimensions, saveSnapshot],
  );

  const floodErase = useCallback(
    (row: number, col: number) => {
      const data = dataRef.current;
      const dims = gridDimensions;
      if (!data || !dims) return;
      if (row < 0 || row >= dims.M || col < 0 || col >= dims.N) return;

      try {
        saveSnapshot();
        const result = floodFillErase(data, dims, row, col);
        setMappedPixelData(result);
        const stats = recalculateColorStats(result);
        setColorCounts(stats.colorCounts);
        setTotalBeadCount(stats.totalCount);
      } catch (err) {
        console.error("Flood erase failed:", err);
      }
    },
    [gridDimensions, saveSnapshot],
  );

  const replaceAllColor = useCallback(
    (sourceHex: string, target: MappedPixel): number => {
      const data = dataRef.current;
      const dims = gridDimensions;
      if (!data || !dims) return 0;

      try {
        saveSnapshot();
        const { newPixelData, replaceCount } = replaceColor(data, dims, sourceHex, target);
        if (replaceCount > 0) {
          setMappedPixelData(newPixelData);
          const stats = recalculateColorStats(newPixelData);
          setColorCounts(stats.colorCounts);
          setTotalBeadCount(stats.totalCount);
        }
        return replaceCount;
      } catch (err) {
        console.error("Replace color failed:", err);
        return 0;
      }
    },
    [gridDimensions, saveSnapshot],
  );

  const endStroke = useCallback(() => {
    isStrokingRef.current = false;
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const snap = historyRef.current.pop()!;
    setMappedPixelData(snap.data);
    setColorCounts(snap.counts);
    setTotalBeadCount(snap.total);
  }, []);

  const exportPattern = useCallback(
    (options: PerlerExportOptions) => {
      const data = dataRef.current;
      const dims = gridDimensions;
      const counts = countsRef.current;
      if (!data || !dims || !counts) return;
      downloadPerlerImage(data, dims, counts, totalRef.current, colorSystem, options);
    },
    [colorSystem, gridDimensions],
  );

  return {
    imageSrc,
    setImage,
    gridN,
    setGridN,
    gridM,
    setGridM,
    pixelationMode,
    setPixelationMode,
    colorSystem,
    setColorSystem,
    mappedPixelData,
    gridDimensions,
    colorCounts,
    totalBeadCount,
    palette,
    pixelate,
    paintPixel,
    floodErase,
    replaceAllColor,
    undo,
    canUndo,
    hasPattern: mappedPixelData !== null,
    exportPattern,
    endStroke,
  };
}
