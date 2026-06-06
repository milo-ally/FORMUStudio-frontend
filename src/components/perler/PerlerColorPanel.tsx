import { useState, useMemo } from "react";
import type { MappedPixel, PaletteColor, ColorSystem } from "../../types";
import { getDisplayColorKey, sortColorsByHue } from "./colorSystem";
import { TRANSPARENT_KEY } from "./editing";
import "./PerlerColorPanel.css";

interface ColorEntry {
  key: string;
  color: string;
  count: number;
}

interface PerlerColorPanelProps {
  colorCounts: Record<string, { count: number; color: string }> | null;
  totalBeadCount: number;
  colorSystem: ColorSystem;
  selectedColor: MappedPixel | null;
  highlightColor: string | null;
  palette: PaletteColor[];
  onSelectColor: (color: MappedPixel) => void;
  onHighlightColor: (hex: string | null) => void;
  onExport: () => void;
}

export function PerlerColorPanel({
  colorCounts,
  totalBeadCount,
  colorSystem,
  selectedColor,
  highlightColor,
  palette,
  onSelectColor,
  onHighlightColor,
  onExport,
}: PerlerColorPanelProps) {
  const [showFullPalette, setShowFullPalette] = useState(false);
  const [showAllStats, setShowAllStats] = useState(false);
  const [showAllSwatches, setShowAllSwatches] = useState(false);

  const STATS_LIMIT = 12;
  const SWATCH_LIMIT = 24;

  const entries = useMemo<ColorEntry[]>(() => {
    if (!colorCounts) return [];
    const raw = Object.entries(colorCounts).map(([hex, data]) => ({
      key: getDisplayColorKey(hex, colorSystem),
      color: data.color,
      count: data.count,
    }));
    return sortColorsByHue(raw);
  }, [colorCounts, colorSystem]);

  const fullColors = useMemo(
    () => palette.map((c) => ({ key: c.key, color: c.hex })),
    [palette],
  );

  const allDisplayColors = showFullPalette ? fullColors : entries.map((e) => ({ key: e.key, color: e.color }));
  const displayColors = showAllSwatches ? allDisplayColors : allDisplayColors.slice(0, SWATCH_LIMIT);
  const swatchHidden = allDisplayColors.length - SWATCH_LIMIT;

  return (
    <section className="perler-color-section">
      <div className="perler-color-section-header">
        <div>
          <span className="perler-section-label">颜色面板</span>
          <span className="perler-color-total"> · 共 {totalBeadCount} 颗 · {entries.length} 色</span>
        </div>
        <div className="perler-color-actions">
          <button className="perler-action-btn" onClick={() => { setShowFullPalette(!showFullPalette); setShowAllSwatches(false); }}>
            {showFullPalette ? `当前色板 (${entries.length})` : `完整色板 (${fullColors.length})`}
          </button>
          <button className="perler-action-btn primary" onClick={onExport}>导出</button>
        </div>
      </div>

      {/* Swatches */}
      <div className="perler-swatch-strip">
        <button
          className={`perler-swatch-chip eraser ${selectedColor?.key === TRANSPARENT_KEY ? "sel" : ""}`}
          onClick={() => onSelectColor({ key: TRANSPARENT_KEY, color: "#FFFFFF" })}
          title="橡皮擦"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v4m4-6v4m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {displayColors.map((c) => {
          const isSel = selectedColor?.color.toUpperCase() === c.color.toUpperCase() && selectedColor?.key !== TRANSPARENT_KEY;
          const isHl = highlightColor?.toUpperCase() === c.color.toUpperCase();
          const entry = entries.find((e) => e.color.toUpperCase() === c.color.toUpperCase());
          return (
            <button
              key={`${c.key}-${c.color}`}
              className={`perler-swatch-chip ${isSel ? "sel" : ""} ${isHl ? "hl" : ""}`}
              style={{ backgroundColor: c.color }}
              title={`${c.key}${entry ? ` (${entry.count}颗)` : ""}`}
              onClick={() => onSelectColor({ key: c.key, color: c.color })}
              onMouseEnter={() => onHighlightColor(c.color)}
              onMouseLeave={() => onHighlightColor(null)}
            >
              <span className="perler-swatch-chip-label">{c.key}</span>
              {entry && <span className="perler-swatch-chip-count">{entry.count}</span>}
            </button>
          );
        })}
      </div>
      {swatchHidden > 0 && (
        <button
          className="perler-stats-expand"
          onClick={() => setShowAllSwatches(!showAllSwatches)}
        >
          {showAllSwatches
            ? "收起"
            : `展开全部 ${allDisplayColors.length} 色`}
        </button>
      )}

      {/* Stats table */}
      {entries.length > 0 && (
        <div className="perler-stats-wrap">
          <table className="perler-stats-table">
            <thead>
              <tr>
                <th>色块</th>
                <th>色号</th>
                <th>数量</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {(showAllStats ? entries : entries.slice(0, STATS_LIMIT)).map((e) => {
                const pct = ((e.count / totalBeadCount) * 100).toFixed(3);
                const isHl = highlightColor?.toUpperCase() === e.color.toUpperCase();
                return (
                  <tr
                    key={e.color}
                    className={isHl ? "perler-row-hl" : ""}
                    onMouseEnter={() => onHighlightColor(e.color)}
                    onMouseLeave={() => onHighlightColor(null)}
                    onClick={() => onSelectColor({ key: e.key, color: e.color })}
                  >
                    <td><span className="perler-stat-dot" style={{ backgroundColor: e.color }} /></td>
                    <td className="perler-stat-mono">{e.key}</td>
                    <td>{e.count}</td>
                    <td>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length > STATS_LIMIT && (
            <button
              className="perler-stats-expand"
              onClick={() => setShowAllStats(!showAllStats)}
            >
              {showAllStats
                ? `收起`
                : `展开全部 ${entries.length} 色`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
