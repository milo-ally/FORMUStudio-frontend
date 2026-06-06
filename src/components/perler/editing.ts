import type { MappedPixel } from "../../types";

export const TRANSPARENT_KEY = "ERASE";
const transparent: MappedPixel = { key: TRANSPARENT_KEY, color: "#FFFFFF", isExternal: true };

export function floodFillErase(
  pixelData: MappedPixel[][],
  dims: { N: number; M: number },
  startRow: number,
  startCol: number,
): MappedPixel[][] {
  const { N, M } = dims;
  const result = pixelData.map((row) => row.map((cell) => ({ ...cell })));
  const visited: boolean[][] = Array.from({ length: M }, () => Array(N).fill(false));
  const targetKey = result[startRow]?.[startCol]?.key;
  if (!targetKey || targetKey === TRANSPARENT_KEY) return result;

  const stack = [{ row: startRow, col: startCol }];
  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) continue;
    const cell = result[row][col];
    if (!cell || cell.isExternal || cell.key !== targetKey) continue;
    visited[row][col] = true;
    result[row][col] = { ...transparent };
    stack.push(
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    );
  }
  return result;
}

export function replaceColor(
  pixelData: MappedPixel[][],
  _dims: { N: number; M: number },
  sourceHex: string,
  target: MappedPixel,
): { newPixelData: MappedPixel[][]; replaceCount: number } {
  const src = sourceHex.toUpperCase();
  let count = 0;
  const result = pixelData.map((row) =>
    row.map((cell) => {
      if (cell && !cell.isExternal && cell.color.toUpperCase() === src) {
        count++;
        return { ...target, isExternal: false };
      }
      return { ...cell };
    }),
  );
  return { newPixelData: result, replaceCount: count };
}

export function paintSinglePixel(
  pixelData: MappedPixel[][],
  row: number,
  col: number,
  newColor: MappedPixel,
): { newPixelData: MappedPixel[][]; previousCell: MappedPixel | null; hasChange: boolean } {
  const cell = pixelData[row]?.[col];
  if (!cell) return { newPixelData: pixelData, previousCell: null, hasChange: false };

  const target = newColor.key === TRANSPARENT_KEY ? { ...transparent } : { ...newColor, isExternal: false };
  if (cell.key === target.key && cell.isExternal === target.isExternal) {
    return { newPixelData: pixelData, previousCell: cell, hasChange: false };
  }

  const result = pixelData.map((r, ri) =>
    ri === row
      ? r.map((c, ci) => (ci === col ? target : { ...c }))
      : r.map((c) => ({ ...c })),
  );
  return { newPixelData: result, previousCell: cell, hasChange: true };
}

export function recalculateColorStats(pixelData: MappedPixel[][]): {
  colorCounts: Record<string, { count: number; color: string }>;
  totalCount: number;
} {
  const colorCounts: Record<string, { count: number; color: string }> = {};
  let totalCount = 0;
  for (const cell of pixelData.flat()) {
    if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      const hex = cell.color.toUpperCase();
      if (!colorCounts[hex]) colorCounts[hex] = { count: 0, color: hex };
      colorCounts[hex].count++;
      totalCount++;
    }
  }
  return { colorCounts, totalCount };
}
