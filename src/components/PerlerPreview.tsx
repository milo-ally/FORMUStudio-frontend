import { useRef, useEffect, useCallback, useState } from "react";
import type { MappedPixel } from "../types";
import { getDisplayColorKey } from "../lib/perler/colorSystem";

interface PerlerPreviewProps {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  selectedColor: MappedPixel | null;
  highlightColor: string | null;
  showCellNumbers: boolean;
  tool: "brush" | "hand";
  onToolChange: (t: "brush" | "hand") => void;
  onCellClick: (row: number, col: number) => void;
  onCellHover: (row: number, col: number, key: string, color: string) => void;
  onCellHoverOut: () => void;
  onToggleCellNumbers: (v: boolean) => void;
  onStrokeEnd: () => void;
}

function contrastColor(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "#000";
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.5 ? "#000000" : "#FFFFFF";
}

const CELL_NUM_ZOOM_THRESHOLD = 1.5;

export function PerlerPreview({
  mappedPixelData,
  gridDimensions,
  selectedColor,
  highlightColor,
  showCellNumbers,
  tool,
  onToolChange,
  onCellClick,
  onCellHover,
  onCellHoverOut,
  onToggleCellNumbers,
  onStrokeEnd,
}: PerlerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [painting, setPainting] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const lastPainted = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) return;

    const { N, M } = gridDimensions;
    const baseCellSize = Math.max(12, Math.floor(1200 / Math.max(N, M)));
    const effectiveCellSize = baseCellSize * zoom;
    const w = N * baseCellSize;
    const h = M * baseCellSize;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#374151" : "#F3F4F6";
    const gridColor = isDark ? "#4B5563" : "#DDDDDD";

    ctx.clearRect(0, 0, w, h);

    const showLabels = showCellNumbers && effectiveCellSize >= CELL_NUM_ZOOM_THRESHOLD;

    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const cell = mappedPixelData[j]?.[i];
        if (!cell) continue;

        const dx = i * baseCellSize;
        const dy = j * baseCellSize;

        if (cell.isExternal) {
          ctx.fillStyle = bgColor;
        } else {
          ctx.fillStyle = cell.color;
        }
        ctx.fillRect(dx, dy, baseCellSize, baseCellSize);

        if (highlightColor && !cell.isExternal) {
          if (cell.color.toUpperCase() !== highlightColor.toUpperCase()) {
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(dx, dy, baseCellSize, baseCellSize);
          }
        }

        // Cell grid lines
        if (baseCellSize >= 6) {
          ctx.strokeStyle = gridColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(dx + 0.5, dy + 0.5, baseCellSize, baseCellSize);
        }

        // Bead ID labels — only when zoomed in enough
        if (showLabels && !cell.isExternal) {
          const fontSize = Math.max(9, Math.floor(baseCellSize * 0.38));
          ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = contrastColor(cell.color);
          try {
            const key = getDisplayColorKey(cell.color, "MARD" as any);
            ctx.fillText(key, dx + baseCellSize / 2, dy + baseCellSize / 2);
          } catch {
            // ignore
          }
        }
      }
    }
  }, [mappedPixelData, gridDimensions, highlightColor, showCellNumbers, zoom]);

  const getCell = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !gridDimensions) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / zoom;
      const y = (clientY - rect.top) / zoom;
      const cellSize = canvas.width / gridDimensions.N;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (col < 0 || col >= gridDimensions.N || row < 0 || row >= gridDimensions.M) return null;
      return { row, col };
    },
    [gridDimensions, zoom],
  );

  const brushMode = tool === "brush";
  const canPaint = brushMode && selectedColor !== null;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setPan({
          x: panStart.current.x + (e.clientX - dragStart.current.x),
          y: panStart.current.y + (e.clientY - dragStart.current.y),
        });
        return;
      }
      if (painting) {
        const cell = getCell(e.clientX, e.clientY);
        if (cell && canPaint && mappedPixelData) {
          const last = lastPainted.current;
          if (!last || last.row !== cell.row || last.col !== cell.col) {
            lastPainted.current = cell;
            onCellClick(cell.row, cell.col);
          }
        }
        return;
      }
      const cell = getCell(e.clientX, e.clientY);
      if (cell && mappedPixelData) {
        const c = mappedPixelData[cell.row]?.[cell.col];
        if (c) onCellHover(cell.row, cell.col, c.key, c.color);
      } else {
        onCellHoverOut();
      }
    },
    [dragging, painting, canPaint, getCell, mappedPixelData, onCellClick, onCellHover, onCellHoverOut],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click, shift+click, or left-click in hand mode → pan
      if (e.button === 1 || e.shiftKey || (e.button === 0 && !brushMode)) {
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
        return;
      }
      // Left-click in brush mode → paint
      if (e.button === 0 && brushMode) {
        if (canPaint) {
          setPainting(true);
          lastPainted.current = null;
          const cell = getCell(e.clientX, e.clientY);
          if (cell) {
            lastPainted.current = cell;
            onCellClick(cell.row, cell.col);
          }
        }
      }
    },
    [getCell, onCellClick, pan, brushMode, canPaint],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setPainting(false);
    lastPainted.current = null;
    onStrokeEnd();
  }, [onStrokeEnd]);

  // Global mouseup to end stroke even if cursor leaves canvas
  const strokeEndRef = useRef(onStrokeEnd);
  strokeEndRef.current = onStrokeEnd;

  useEffect(() => {
    const onUp = () => {
      setDragging(false);
      setPainting(false);
      lastPainted.current = null;
      strokeEndRef.current();
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // Manual wheel listener so we can use { passive: false } to block browser zoom
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = zoomRef.current;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.25, Math.min(5, oldZoom + delta));

      const scale = newZoom / oldZoom;
      const newPanX = mouseX - scale * (mouseX - panRef.current.x);
      const newPanY = mouseY - scale * (mouseY - panRef.current.y);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="perler-preview">
      <div className="perler-preview-zoom">
        <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>+</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>重置</button>
        <label className="perler-cellnum-toggle" style={{ marginLeft: 0 }}>
          <input
            type="checkbox"
            checked={tool === "brush"}
            onChange={(e) => onToolChange(e.target.checked ? "brush" : "hand")}
          />
          画笔模式
        </label>
        {selectedColor && (
          <span className="perler-current-brush">
            画笔: <span className="perler-brush-dot" style={{ background: selectedColor.color }} />
            {selectedColor.key === "ERASE" ? "橡皮擦" : selectedColor.key}
          </span>
        )}
        <label className="perler-cellnum-toggle">
          <input
            type="checkbox"
            checked={showCellNumbers}
            onChange={(e) => onToggleCellNumbers(e.target.checked)}
          />
          显示色号
        </label>
      </div>
      <div
        ref={containerRef}
        className="perler-preview-canvas-wrap"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragging ? "grabbing" : brushMode ? "crosshair" : "grab" }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
