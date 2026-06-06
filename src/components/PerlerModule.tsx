import { useState, useCallback, useEffect, useRef } from "react";
import { PerlerHero } from "./PerlerHero";
import { PerlerPreview } from "./PerlerPreview";
import { PerlerColorPanel } from "./PerlerColorPanel";
import { PerlerExportModal } from "./PerlerExportModal";
import { usePerlerPattern } from "../hooks/usePerlerPattern";
import type { Project, WorkMeta, MappedPixel, PerlerExportOptions, PerlerPatternMeta } from "../types";
import { TRANSPARENT_KEY } from "../lib/perler/editing";

export interface PerlerSaveData {
  image_base64: string;
  grid_data: MappedPixel[][];
  grid_n: number;
  grid_m: number;
  pixelation_mode: import("../types").PixelationMode;
  color_system: import("../types").ColorSystem;
  bead_count: number;
  color_counts: Record<string, { count: number; color: string }>;
  name?: string;
}

interface PerlerModuleProps {
  works: Record<string, WorkMeta[]>;
  projects: Project[];
  activeProject: string;
  onSelectProject: (id: string) => void;
  savedPatterns: PerlerPatternMeta[];
  onSavePattern: (data: PerlerSaveData) => void;
  onDeletePattern: (id: string) => void;
}

export function PerlerModule({
  works,
  projects,
  activeProject,
  onSelectProject,
  savedPatterns,
  onSavePattern,
  onDeletePattern,
}: PerlerModuleProps) {
  const {
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
    undo,
    canUndo,
    hasPattern,
    exportPattern,
    endStroke,
    loadPattern,
    isLoadingPattern,
    getPatternSaveData,
  } = usePerlerPattern();

  const [selectedColor, setSelectedColor] = useState<MappedPixel | null>(null);
  const [highlightColor, setHighlightColor] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [tooltip, setTooltip] = useState<{ key: string; color: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showCellNumbers, setShowCellNumbers] = useState(() => {
    try {
      const v = localStorage.getItem("perler_show_cell_numbers");
      return v !== null ? v === "true" : true;
    } catch { return true; }
  });
  const [tool, setTool] = useState<"brush" | "hand">(() => {
    try {
      const v = localStorage.getItem("perler_tool");
      return v === "brush" || v === "hand" ? v : "brush";
    } catch { return "brush"; }
  });
  const [renderKey, setRenderKey] = useState(0);

  const pixelateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const autoLoadedRef = useRef(false);

  // Auto-load most recent saved pattern on mount
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (hasPattern) return;
    if (savedPatterns.length === 0) return;
    autoLoadedRef.current = true;
    const latest = savedPatterns[0];
    loadPattern(latest);
    setRenderKey((k) => k + 1);
  }, [hasPattern, savedPatterns, loadPattern]);

  useEffect(() => {
    if (imageSrc) {
      if (isLoadingPattern.current) {
        isLoadingPattern.current = false;
        return;
      }
      setGenerating(true);
      clearTimeout(pixelateTimer.current);
      pixelateTimer.current = setTimeout(async () => {
        await pixelate();
        setRenderKey((k) => k + 1);
        setGenerating(false);
      }, 200);
      return () => clearTimeout(pixelateTimer.current);
    }
  }, [imageSrc, pixelationMode, colorSystem, isLoadingPattern]);

  // Persist UI preferences
  useEffect(() => {
    try { localStorage.setItem("perler_tool", tool); } catch {}
  }, [tool]);
  useEffect(() => {
    try { localStorage.setItem("perler_show_cell_numbers", String(showCellNumbers)); } catch {}
  }, [showCellNumbers]);

  // Ctrl+Z keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageSrc) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 50));
    await pixelate();
    setRenderKey((k) => k + 1);
    setGenerating(false);
  }, [imageSrc, pixelate]);

  const handleClearImage = useCallback(() => {
    setImage(null);
  }, [setImage]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!selectedColor) return;
      if (selectedColor.key === TRANSPARENT_KEY) {
        floodErase(row, col);
      } else {
        paintPixel(row, col, selectedColor);
      }
    },
    [selectedColor, paintPixel, floodErase],
  );

  const handleCellHover = useCallback(
    (_row: number, _col: number, key: string, color: string) => {
      setTooltip({ key, color });
    },
    [],
  );

  const handleStrokeEnd = useCallback(() => {
    endStroke();
  }, [endStroke]);

  const handleExport = useCallback(
    (options: PerlerExportOptions) => {
      exportPattern(options);
    },
    [exportPattern],
  );

  const handleSave = useCallback(() => {
    const data = getPatternSaveData();
    if (!data) return;
    const name = window.prompt("图纸名称:", `拼豆 ${gridDimensions?.N ?? 0}×${gridDimensions?.M ?? 0}`);
    if (!name) return;
    onSavePattern({ ...data, name });
  }, [getPatternSaveData, onSavePattern, gridDimensions]);

  const handleLoad = useCallback(
    (pattern: PerlerPatternMeta) => {
      if (hasPattern) {
        const ok = window.confirm("加载图纸会覆盖当前编辑，确定继续？");
        if (!ok) return;
      }
      loadPattern(pattern);
      setRenderKey((k) => k + 1);
    },
    [hasPattern, loadPattern],
  );

  const handleDeleteSaved = useCallback(
    (id: string, name: string) => {
      const ok = window.confirm(`确定删除图纸「${name}」？`);
      if (!ok) return;
      onDeletePattern(id);
    },
    [onDeletePattern],
  );

  return (
    <div className="perler-module">
      <PerlerHero
        imageSrc={imageSrc}
        gridN={gridN}
        gridM={gridM}
        pixelationMode={pixelationMode}
        colorSystem={colorSystem}
        works={works}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={onSelectProject}
        onImageChange={setImage}
        onGridNChange={setGridN}
        onGridMChange={setGridM}
        onPixelationModeChange={setPixelationMode}
        onColorSystemChange={setColorSystem}
        onPixelate={handleGenerate}
        hasImage={imageSrc !== null}
        generating={generating}
      />

      {hasPattern && imageSrc && (
        <div className="perler-content">
          <div className="perler-source-preview">
            <img src={imageSrc} alt="源图片" />
            <div className="perler-source-preview-info">
              <span className="perler-source-preview-label">源图片</span>
            </div>
            <button className="perler-source-clear" onClick={handleClearImage} title="清除图片">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {savedPatterns.length > 0 && (
        <div className="perler-content">
          <div className="perler-saved-row">
            <span className="perler-saved-label">已保存图纸:</span>
            {savedPatterns.map((p) => (
              <div key={p.id} className="perler-saved-chip">
                <button
                  className="perler-saved-chip-btn"
                  onClick={() => handleLoad(p)}
                  title={`${p.name} (${p.grid_n}×${p.grid_m})`}
                >
                  {p.name}
                  <span className="perler-saved-chip-dims">{p.grid_n}×{p.grid_m}</span>
                </button>
                <button
                  className="perler-saved-chip-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSaved(p.id, p.name);
                  }}
                  title="删除"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasPattern && (
        <>
          {tooltip && (
            <div className="perler-tooltip">
              {tooltip.key} ({tooltip.color})
            </div>
          )}

          <div className="perler-content">
            <section key={renderKey} className="perler-result-section perler-fade-in">
              <div className="perler-result-header">
                <h3 className="perler-result-title">
                  拼豆图纸 {gridDimensions && `— ${gridDimensions.N}×${gridDimensions.M}`}
                </h3>
                <div className="perler-result-actions">
                  <button className="perler-action-btn" onClick={undo} disabled={!canUndo}>
                    撤销
                  </button>
                  {selectedColor && (
                    <button className="perler-action-btn" onClick={() => setSelectedColor(null)}>
                      取消画笔
                    </button>
                  )}
                  <button className="perler-action-btn" onClick={handleSave}>
                    保存图纸
                  </button>
                  <button className="perler-action-btn primary" onClick={() => setShowExport(true)}>
                    导出图纸
                  </button>
                </div>
              </div>

              <PerlerPreview
                mappedPixelData={mappedPixelData}
                gridDimensions={gridDimensions}
                selectedColor={selectedColor}
                highlightColor={highlightColor}
                showCellNumbers={showCellNumbers}
                tool={tool}
                onToolChange={setTool}
                onCellClick={handleCellClick}
                onCellHover={handleCellHover}
                onCellHoverOut={() => setTooltip(null)}
                onToggleCellNumbers={setShowCellNumbers}
                onStrokeEnd={handleStrokeEnd}
              />
            </section>
          </div>

          {colorCounts && (
            <div className="perler-content">
              <PerlerColorPanel
                colorCounts={colorCounts}
                totalBeadCount={totalBeadCount}
                colorSystem={colorSystem}
                selectedColor={selectedColor}
                highlightColor={highlightColor}
                palette={palette}
                onSelectColor={setSelectedColor}
                onHighlightColor={setHighlightColor}
                onExport={() => setShowExport(true)}
              />
            </div>
          )}
        </>
      )}

      <PerlerExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
      />
    </div>
  );
}
