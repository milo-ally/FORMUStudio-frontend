import { useCallback, useRef } from "react";
import type { ImageRatio } from "../types";
import { RATIO_DIMENSIONS } from "../types";
import { Select } from "./Select";

interface SettingsPanelProps {
  mode: "generate" | "edit";
  onModeChange: (mode: "generate" | "edit") => void;
  model: string;
  onModelChange: (model: string) => void;
  models: string[];
  ratio: ImageRatio;
  onRatioChange: (ratio: ImageRatio) => void;
  quality: string;
  onQualityChange: (quality: string) => void;
  referenceFiles: File[];
  onReferenceFilesChange: (files: File[]) => void;
}

const RATIOS: ImageRatio[] = ["1:1", "4:3", "3:2", "16:9", "9:16", "2:3", "3:4"];

export function SettingsPanel({
  mode,
  onModeChange,
  model,
  onModelChange,
  models,
  ratio,
  onRatioChange,
  quality,
  onQualityChange,
  referenceFiles,
  onReferenceFilesChange,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width, height } = RATIO_DIMENSIONS[ratio];

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const existing = referenceFiles.map((f) => f.name);
        const incoming = Array.from(e.target.files).filter((f) => !existing.includes(f.name));
        onReferenceFilesChange([...referenceFiles, ...incoming].slice(0, 5));
      }
    },
    [referenceFiles, onReferenceFilesChange],
  );

  return (
    <div className="settings-panel">
      <h3 className="settings-title">创作设置</h3>

      {/* 模式切换 */}
      <div className="settings-group">
        <label className="settings-label">模式</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${mode === "generate" ? "active" : ""}`}
            onClick={() => onModeChange("generate")}
          >
            文生图
          </button>
          <button
            className={`toggle-btn ${mode === "edit" ? "active" : ""}`}
            onClick={() => onModeChange("edit")}
          >
            图生图
          </button>
        </div>
      </div>

      {/* 模型选择 */}
      <div className="settings-group">
        <label className="settings-label">模型</label>
        <Select
          value={model}
          options={models}
          onChange={onModelChange}
        />
      </div>

      {/* 比例选择 */}
      <div className="settings-group">
        <label className="settings-label">
          尺寸 — {width} × {height}
        </label>
        <div className="ratio-grid">
          {RATIOS.map((r) => (
            <button
              key={r}
              className={`ratio-btn ${r === ratio ? "active" : ""}`}
              onClick={() => onRatioChange(r)}
            >
              <div className={`ratio-box ratio-${r.replace(":", "-")}`} />
              <span>{r}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 质量 */}
      <div className="settings-group">
        <label className="settings-label">质量</label>
        <Select
          value={quality}
          options={[
            { value: "auto", label: "自动" },
            { value: "high", label: "高清" },
            { value: "standard", label: "标准" },
          ]}
          onChange={onQualityChange}
        />
      </div>

      {/* 参考图（仅图生图） */}
      {mode === "edit" && (
        <div className="settings-group">
          <label className="settings-label">参考图片</label>
          <div className="ref-images">
            {referenceFiles.map((f, i) => (
              <div key={i} className="ref-image-thumb">
                <img src={URL.createObjectURL(f)} alt="" />
                <button
                  className="ref-remove-btn"
                  onClick={() => onReferenceFilesChange(referenceFiles.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            {referenceFiles.length < 5 && (
              <button className="ref-add-btn" onClick={() => fileInputRef.current?.click()}>
                + 添加
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="file-hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}
