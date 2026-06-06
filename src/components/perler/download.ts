import type { MappedPixel, ColorSystem, PerlerExportOptions } from "../../types";
import { getColorKeyByHex, getDisplayColorKey } from "./colorSystem";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function contrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000";
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.5 ? "#000000" : "#FFFFFF";
}

function sortColorKeys(a: string, b: string): number {
  const re = /^([A-Z]+)(\d+)$/;
  const ma = a.match(re);
  const mb = b.match(re);
  if (ma && mb) {
    if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1]);
    return parseInt(ma[2], 10) - parseInt(mb[2], 10);
  }
  return a.localeCompare(b);
}

export function exportPerlerCsv(
  colorCounts: Record<string, { count: number; color: string }>,
  totalBeadCount: number,
  system: ColorSystem,
): void {
  const entries = Object.entries(colorCounts)
    .map(([, data]) => ({
      key: getColorKeyByHex(data.color, system),
      color: data.color,
      count: data.count,
      pct: ((data.count / totalBeadCount) * 100).toFixed(3),
    }))
    .sort((a, b) => b.count - a.count);

  const lines = [["色号", "颜色(HEX)", "数量", "占比(%)", "色号系统"].join(",")];
  for (const e of entries) {
    lines.push([e.key, e.color, String(e.count), e.pct, system].join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bead-stats-${system}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function downloadPerlerImage(
  mappedPixelData: MappedPixel[][],
  dims: { N: number; M: number },
  colorCounts: Record<string, { count: number; color: string }>,
  totalBeadCount: number,
  system: ColorSystem,
  options: PerlerExportOptions,
): void {
  const { N, M } = dims;
  const maxDim = Math.max(N, M);
  const cellSize = maxDim > 80 ? 22 : 30;
  const {
    showGrid,
    gridInterval,
    showCoordinates,
    showCellNumbers,
    gridLineColor,
    includeStats,
    exportCsv,
  } = options;

  const axisSize = showCoordinates ? Math.max(30, Math.floor(cellSize)) : 0;
  const extraMargin = showCoordinates ? 24 : 0;
  const gridW = N * cellSize;
  const gridH = M * cellSize;

  // Title bar
  const titleH = 60;
  const titleFontSize = 24;

  // Stats area
  let statsH = 0;
  if (includeStats && colorCounts) {
    const keys = Object.keys(colorCounts);
    const cols = Math.max(1, Math.min(4, Math.floor((gridW + axisSize) / 250)));
    const rows = Math.ceil(keys.length / cols);
    statsH = 60 + rows * 28 + 20;
  }

  const canvasW = gridW + axisSize * 2 + extraMargin * 2;
  const canvasH = titleH + gridH + axisSize * 2 + extraMargin * 2 + statsH + 40;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title bar
  ctx.fillStyle = "#1F2937";
  ctx.fillRect(0, 0, canvasW, titleH);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 ${titleFontSize}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("FORMU Studio · 拼豆图纸", extraMargin + axisSize, titleH * 0.4);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `400 ${Math.floor(titleFontSize * 0.55)}px system-ui, sans-serif`;
  ctx.fillText(`${N} × ${M}  |  ${system}  |  ${totalBeadCount} 颗`, extraMargin + axisSize, titleH * 0.7);

  // Coordinates
  if (showCoordinates) {
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(extraMargin + axisSize, titleH + extraMargin, gridW, axisSize);
    ctx.fillRect(extraMargin + axisSize, titleH + extraMargin + axisSize + gridH, gridW, axisSize);
    ctx.fillRect(extraMargin, titleH + extraMargin + axisSize, axisSize, gridH);
    ctx.fillRect(extraMargin + axisSize + gridW, titleH + extraMargin + axisSize, axisSize, gridH);

    ctx.fillStyle = "#333";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < N; i++) {
      if ((i + 1) % gridInterval === 0 || i === 0 || i === N - 1) {
        const x = extraMargin + axisSize + i * cellSize + cellSize / 2;
        ctx.fillText(`${i + 1}`, x, titleH + extraMargin + axisSize / 2);
        ctx.fillText(`${i + 1}`, x, titleH + extraMargin + axisSize + gridH + axisSize / 2);
      }
    }
    for (let j = 0; j < M; j++) {
      if ((j + 1) % gridInterval === 0 || j === 0 || j === M - 1) {
        const y = titleH + extraMargin + axisSize + j * cellSize + cellSize / 2;
        ctx.fillText(`${j + 1}`, extraMargin + axisSize / 2, y);
        ctx.fillText(`${j + 1}`, extraMargin + axisSize + gridW + axisSize / 2, y);
      }
    }
  }

  // Cells
  const fontSize = Math.max(10, Math.floor(cellSize * 0.55));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const cell = mappedPixelData[j][i];
      const dx = extraMargin + i * cellSize + axisSize;
      const dy = titleH + extraMargin + j * cellSize + axisSize;

      if (cell && !cell.isExternal) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(dx, dy, cellSize, cellSize);
        if (showCellNumbers) {
          const key = getDisplayColorKey(cell.color, system);
          ctx.fillStyle = contrastColor(cell.color);
          ctx.fillText(key, dx + cellSize / 2, dy + cellSize / 2);
        }
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(dx, dy, cellSize, cellSize);
      }

      ctx.strokeStyle = "#DDDDDD";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(dx + 0.5, dy + 0.5, cellSize, cellSize);
    }
  }

  // Grid lines
  if (showGrid) {
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1.5;
    for (let i = gridInterval; i < N; i += gridInterval) {
      const x = extraMargin + i * cellSize + axisSize;
      ctx.beginPath();
      ctx.moveTo(x, titleH + extraMargin + axisSize);
      ctx.lineTo(x, titleH + extraMargin + axisSize + gridH);
      ctx.stroke();
    }
    for (let j = gridInterval; j < M; j += gridInterval) {
      const y = titleH + extraMargin + j * cellSize + axisSize;
      ctx.beginPath();
      ctx.moveTo(extraMargin + axisSize, y);
      ctx.lineTo(extraMargin + axisSize + gridW, y);
      ctx.stroke();
    }
  }

  // Main border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    extraMargin + axisSize + 0.5,
    titleH + extraMargin + axisSize + 0.5,
    gridW,
    gridH,
  );

  // Color stats
  if (includeStats && colorCounts) {
    const keys = Object.keys(colorCounts).sort(sortColorKeys);
    const availW = canvasW - 40;
    const cols = Math.max(1, Math.min(4, Math.floor(availW / 250)));
    const statsY = titleH + extraMargin * 2 + gridH + axisSize * 2 + 20;
    const itemW = Math.floor(availW / cols);

    ctx.fillStyle = "#333";
    ctx.font = `bold 16px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("颜色统计", 20, statsY);

    ctx.strokeStyle = "#DDD";
    ctx.beginPath();
    ctx.moveTo(20, statsY + 12);
    ctx.lineTo(canvasW - 20, statsY + 12);
    ctx.stroke();

    ctx.font = "13px sans-serif";
    keys.forEach((key, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const ix = 20 + col * itemW;
      const iy = statsY + 28 + row * 28;
      const d = colorCounts[key];

      ctx.fillStyle = d.color;
      ctx.fillRect(ix, iy - 8, 16, 16);
      ctx.strokeStyle = "#CCC";
      ctx.strokeRect(ix + 0.5, iy - 8 + 0.5, 15, 15);

      ctx.fillStyle = "#333";
      ctx.textAlign = "left";
      ctx.fillText(
        `${getColorKeyByHex(key, system)}  ${d.count}颗`,
        ix + 22,
        iy + 1,
      );
    });

    const numRows = Math.ceil(keys.length / cols);
    const totalY = statsY + 30 + numRows * 28 + 10;
    ctx.font = `bold 13px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(`总计: ${totalBeadCount} 颗`, canvasW - 20, totalY);
  }

  // Download
  try {
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = `bead-grid-${N}x${M}-${system}.png`;
    a.href = dataURL;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // canvas too large — fall through
  }

  if (exportCsv) {
    exportPerlerCsv(colorCounts, totalBeadCount, system);
  }
}
