import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from "react";
import { Select } from "../shared/Select";
import { WorkPicker } from "../shared/WorkPicker";
import type { PixelationMode, ColorSystem, Project, WorkMeta } from "../../types";
import { colorSystemOptions } from "./colorSystem";
import "./PerlerHero.css";

type ImageSource = "upload" | "work";

interface PerlerHeroProps {
  imageSrc: string | null;
  gridN: number;
  gridM: number;
  pixelationMode: PixelationMode;
  colorSystem: ColorSystem;
  works: Record<string, WorkMeta[]>;
  projects: Project[];
  activeProject: string;
  onSelectProject: (id: string) => void;
  onImageChange: (src: string | null) => void;
  onGridNChange: (n: number) => void;
  onGridMChange: (m: number) => void;
  onPixelationModeChange: (m: PixelationMode) => void;
  onColorSystemChange: (s: ColorSystem) => void;
  onPixelate: () => void;
  hasImage: boolean;
  generating: boolean;
}

const MODE_OPTIONS: { key: PixelationMode; label: string }[] = [
  { key: "dominant", label: "卡通模式" },
  { key: "average", label: "真实模式" },
];

export function PerlerHero({
  gridN,
  gridM,
  pixelationMode,
  colorSystem,
  works,
  projects,
  activeProject,
  onSelectProject,
  onImageChange,
  onGridNChange,
  onGridMChange,
  onPixelationModeChange,
  onColorSystemChange,
  onPixelate,
  hasImage,
  generating,
}: PerlerHeroProps) {
  const [sourceType, setSourceType] = useState<ImageSource>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedWork, setSelectedWork] = useState<{
    projectId: string;
    workId: string;
    b64: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => onImageChange(ev.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onImageChange],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (e.target) e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleSelectWork = useCallback(
    (projectId: string, workId: string, b64: string) => {
      if (!b64) {
        setSelectedWork(null);
        onImageChange(null);
      } else {
        setSelectedWork({ projectId, workId, b64 });
        onImageChange(`data:image/png;base64,${b64}`);
      }
    },
    [onImageChange],
  );

  const stepNUp = useCallback(() => onGridNChange(Math.min(100, gridN + 1)), [gridN, onGridNChange]);
  const stepNDown = useCallback(() => onGridNChange(Math.max(10, gridN - 1)), [gridN, onGridNChange]);
  const stepMUp = useCallback(() => onGridMChange(Math.min(100, gridM + 1)), [gridM, onGridMChange]);
  const stepMDown = useCallback(() => onGridMChange(Math.max(10, gridM - 1)), [gridM, onGridMChange]);

  return (
    <section className="hero-section">
      <div className="hero-inner">
        <h2 className="hero-title">为记忆，塑实体</h2>

        <div
          className={`prompt-card${dragOver ? " threed-dragover" : ""}`}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div className="threed-drop-overlay">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>释放图片生成拼豆图纸</span>
            </div>
          )}

          <div className="perler-source-row">
            <label
              className={`perler-source-btn ${sourceType === "upload" && hasImage ? "has-image" : ""} ${sourceType === "upload" ? "active" : ""}`}
              onClick={() => setSourceType("upload")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="perler-source-btn-label">{sourceType === "upload" && hasImage ? "已选择图片" : "上传图片"}</span>
              <span className="perler-source-btn-hint">{sourceType === "upload" && hasImage ? "点击更换图片" : "拖拽或点击上传"}</span>
              <input ref={fileRef} type="file" accept="image/*" className="ps-file-hidden" onChange={handleFileChange} />
            </label>

            <button
              className={`perler-source-btn ${sourceType === "work" ? "active" : ""} ${sourceType === "work" && selectedWork ? "has-image" : ""}`}
              onClick={() => setSourceType("work")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="perler-source-btn-label">{sourceType === "work" && selectedWork ? "已选择作品" : "从作品"}</span>
              <span className="perler-source-btn-hint">{sourceType === "work" && selectedWork ? "点击更换作品" : "从作品中选择已有图片"}</span>
            </button>
          </div>

          {sourceType === "work" && (
            <div style={{ marginTop: 12 }}>
              <WorkPicker
                works={works}
                projects={projects}
                activeProject={activeProject}
                onSelectProject={onSelectProject}
                selected={
                  selectedWork
                    ? { projectId: selectedWork.projectId, workId: selectedWork.workId }
                    : null
                }
                onSelect={handleSelectWork}
              />
            </div>
          )}

          <div className="prompt-settings perler-settings-bar">
            <div className="ps-item">
              <label className="perler-setting-label">网格列数</label>
              <div className="perler-stepper">
                <button className="perler-stepper-btn" onClick={stepNDown} disabled={gridN <= 10}>−</button>
                <input
                  className="perler-num-input"
                  type="number"
                  min={10}
                  max={100}
                  value={gridN}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") { onGridNChange(0); return; }
                    const n = parseInt(v, 10);
                    if (!isNaN(n)) onGridNChange(n);
                  }}
                />
                <button className="perler-stepper-btn" onClick={stepNUp} disabled={gridN >= 100}>+</button>
              </div>
            </div>

            <div className="ps-item">
              <label className="perler-setting-label">网格行数</label>
              <div className="perler-stepper">
                <button className="perler-stepper-btn" onClick={stepMDown} disabled={gridM <= 10}>−</button>
                <input
                  className="perler-num-input"
                  type="number"
                  min={10}
                  max={100}
                  value={gridM}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") { onGridMChange(0); return; }
                    const m = parseInt(v, 10);
                    if (!isNaN(m)) onGridMChange(m);
                  }}
                />
                <button className="perler-stepper-btn" onClick={stepMUp} disabled={gridM >= 100}>+</button>
              </div>
            </div>

            <div className="ps-item">
              <label className="perler-setting-label">像素模式</label>
              <div
                className="toggle-group"
                style={{ "--toggle-pos": pixelationMode === "dominant" ? "0" : "1" } as React.CSSProperties}
              >
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    className={`toggle-btn ${pixelationMode === opt.key ? "active" : ""}`}
                    onClick={() => onPixelationModeChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ps-item">
              <label className="perler-setting-label">色号系统</label>
              <Select
                className="ps-select"
                value={colorSystem}
                options={colorSystemOptions.map((o) => ({ value: o.key, label: o.name }))}
                onChange={(v) => onColorSystemChange(v as ColorSystem)}
              />
            </div>
          </div>

          <div className="perler-generate-row">
            <button
              className="perler-generate-btn"
              onClick={onPixelate}
              disabled={!hasImage || generating}
            >
              {generating ? (
                <>
                  <span className="spinner-triple">
                    <span className="spinner-dot" />
                    <span className="spinner-dot" />
                    <span className="spinner-dot" />
                  </span>
                  生成中...
                </>
              ) : (
                "生成图纸"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
