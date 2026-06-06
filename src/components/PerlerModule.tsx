import { useState, useCallback, useEffect, useRef } from "react";
import { PerlerHero } from "./PerlerHero";
import { PerlerPreview } from "./PerlerPreview";
import { PerlerColorPanel } from "./PerlerColorPanel";
import { PerlerExportModal } from "./PerlerExportModal";
import { usePerlerPattern } from "../hooks/usePerlerPattern";
import type { Project, WorkMeta, MappedPixel, PerlerExportOptions } from "../types";
import { TRANSPARENT_KEY } from "../lib/perler/editing";

interface PerlerModuleProps {
  works: Record<string, WorkMeta[]>;
  projects: Project[];
  activeProject: string;
  onSelectProject: (id: string) => void;
}

export function PerlerModule({
  works,
  projects,
  activeProject,
  onSelectProject,
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
  } = usePerlerPattern();

  const [selectedColor, setSelectedColor] = useState<MappedPixel | null>(null);
  const [highlightColor, setHighlightColor] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [tooltip, setTooltip] = useState<{ key: string; color: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showCellNumbers, setShowCellNumbers] = useState(true);
  const [tool, setTool] = useState<"brush" | "hand">("brush");
  const [renderKey, setRenderKey] = useState(0);

  const pixelateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const undoRef = useRef(undo);
  undoRef.current = undo;

  useEffect(() => {
    if (imageSrc) {
      setGenerating(true);
      clearTimeout(pixelateTimer.current);
      pixelateTimer.current = setTimeout(async () => {
        await pixelate();
        setRenderKey((k) => k + 1);
        setGenerating(false);
      }, 200);
      return () => clearTimeout(pixelateTimer.current);
    }
  }, [imageSrc, pixelationMode, colorSystem]);

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
