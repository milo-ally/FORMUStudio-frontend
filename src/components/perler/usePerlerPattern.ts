import { useState, useCallback, useRef, useEffect } from "react";
import type {
  MappedPixel,
  PaletteColor,
  PixelationMode,
  ColorSystem,
  PerlerExportOptions,
  PerlerPatternMeta,
} from "../../types";
import { hexToRgb, calculatePixelGrid } from "./pixelation";
import { getMardToHexMapping, convertPaletteToColorSystem } from "./colorSystem";
import { floodFillErase, replaceColor, paintSinglePixel, recalculateColorStats } from "./editing";
import { downloadPerlerImage } from "./download";

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
  loadPattern: (pattern: PerlerPatternMeta) => void;
  isLoadingPattern: React.RefObject<boolean>;
  getPatternSaveData: () => {
    image_base64: string;
    grid_data: MappedPixel[][];
    grid_n: number;
    grid_m: number;
    pixelation_mode: PixelationMode;
    color_system: ColorSystem;
    bead_count: number;
    color_counts: Record<string, { count: number; color: string }>;
  } | null;
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

const PERLER_STATE_KEY = "perler_draft_state";

interface PersistedPerlerState {
  imageSrc: string | null;
  gridN: number;
  gridM: number;
  pixelationMode: PixelationMode;
  colorSystem: ColorSystem;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: Record<string, { count: number; color: string }> | null;
  totalBeadCount: number;
}

function loadPersistedState(): PersistedPerlerState | null {
  try {
    const raw = localStorage.getItem(PERLER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as PersistedPerlerState;
  } catch {}
  return null;
}

function savePersistedState(state: PersistedPerlerState) {
  try {
    localStorage.setItem(PERLER_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function usePerlerPattern(): UsePerlerPatternReturn {
  const persisted = useRef(loadPersistedState()).current;

  const [imageSrc, setImageSrc] = useState<string | null>(persisted?.imageSrc ?? null);
  const [gridN, setGridNState] = useState(persisted?.gridN ?? 50);
  const [gridM, setGridMState] = useState(persisted?.gridM ?? 50);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(persisted?.pixelationMode ?? "dominant");
  const [colorSystem, setColorSystem] = useState<ColorSystem>(persisted?.colorSystem ?? "MARD");

  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(persisted?.mappedPixelData ?? null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(persisted?.gridDimensions ?? null);
  const [colorCounts, setColorCounts] = useState<Record<string, { count: number; color: string }> | null>(persisted?.colorCounts ?? null);
  const [totalBeadCount, setTotalBeadCount] = useState(persisted?.totalBeadCount ?? 0);

  const historyRef = useRef<EditSnapshot[]>([]);
  const isStrokingRef = useRef(false);
  const loadingPatternRef = useRef(persisted && persisted.mappedPixelData ? true : false);
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

  const loadPattern = useCallback((pattern: PerlerPatternMeta) => {
    loadingPatternRef.current = true;
    setImageSrc(`data:image/png;base64,${pattern.image_base64}`);
    setGridNState(pattern.grid_n);
    setGridMState(pattern.grid_m);
    setPixelationMode(pattern.pixelation_mode);
    setColorSystem(pattern.color_system);
    setMappedPixelData(pattern.grid_data);
    setGridDimensions({ N: pattern.grid_n, M: pattern.grid_m });
    setColorCounts(pattern.color_counts);
    setTotalBeadCount(pattern.bead_count);
    historyRef.current = [];
  }, []);

  const getPatternSaveData = useCallback(() => {
    const data = dataRef.current;
    const counts = countsRef.current;
    const dims = gridDimensions;
    if (!data || !counts || !dims) return null;
    const imageSrcVal = imageSrc;
    const b64 = imageSrcVal ? imageSrcVal.replace(/^data:image\/\w+;base64,/, "") : "";
    return {
      image_base64: b64,
      grid_data: data,
      grid_n: dims.N,
      grid_m: dims.M,
      pixelation_mode: pixelationMode,
      color_system: colorSystem,
      bead_count: totalRef.current,
      color_counts: counts,
    };
  }, [pixelationMode, colorSystem, imageSrc, gridDimensions]);

  // Debounced auto-save current pattern to localStorage so work survives refresh
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state: PersistedPerlerState = {
        imageSrc,
        gridN,
        gridM,
        pixelationMode,
        colorSystem,
        mappedPixelData,
        gridDimensions,
        colorCounts,
        totalBeadCount,
      };
      savePersistedState(state);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [imageSrc, gridN, gridM, pixelationMode, colorSystem, mappedPixelData, gridDimensions, colorCounts, totalBeadCount]);

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
    loadPattern,
    isLoadingPattern: loadingPatternRef,
    getPatternSaveData,
  };
}
