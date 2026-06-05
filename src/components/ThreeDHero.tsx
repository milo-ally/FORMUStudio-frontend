import { useRef, useState, useCallback } from "react";
import { PromptInput } from "./PromptInput";
import { Select } from "./Select";

export type ImageSourceType = "text" | "work" | "upload";

interface ThreeDHeroProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: () => void;
  generating: boolean;
  onCancel: () => void;
  model: string;
  models: string[];
  onModelChange: (v: string) => void;
  imageSourceType: ImageSourceType;
  onImageSourceTypeChange: (v: ImageSourceType) => void;
  referenceFile: File | null;
  onReferenceFileChange: (f: File | null) => void;
  referenceConfirmed: boolean;
  onReferenceConfirm: () => void;
  selectedWorkUrl: string;
  promptCategory?: string;
  promptPlaceholder?: string;
}

const SOURCE_OPTIONS: { key: ImageSourceType; label: string }[] = [
  { key: "text", label: "仅文本" },
  { key: "work", label: "从作品" },
  { key: "upload", label: "上传图片" },
];

export function ThreeDHero({
  prompt,
  onPromptChange,
  onSubmit,
  generating,
  onCancel,
  model,
  models,
  onModelChange,
  imageSourceType,
  onImageSourceTypeChange,
  referenceFile,
  onReferenceFileChange,
  referenceConfirmed,
  onReferenceConfirm,
  selectedWorkUrl,
  promptCategory = "3d",
  promptPlaceholder = "描述你想要的 3D 模型 ...",
}: ThreeDHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length > 0) {
        onReferenceFileChange(files[0]);
        onImageSourceTypeChange("upload");
      }
    },
    [onReferenceFileChange, onImageSourceTypeChange],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onReferenceFileChange(file);
        onImageSourceTypeChange("upload");
      }
    },
    [onReferenceFileChange, onImageSourceTypeChange],
  );

  const hasImage =
    imageSourceType === "work"
      ? !!selectedWorkUrl
      : imageSourceType === "upload"
        ? !!(referenceFile && referenceConfirmed)
        : false;

  const referencePreviewUrl = referenceFile
    ? URL.createObjectURL(referenceFile)
    : null;

  return (
    <section className="hero-section">
      <div className="hero-inner">
        <h2 className="hero-title">为记忆，塑实体</h2>

        <div
          className={`prompt-card${dragOver ? " threed-dragover" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
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
              <span>释放图片以图生3D</span>
            </div>
          )}

          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSubmit={onSubmit}
            generating={generating}
            onCancel={onCancel}
            allowEmptySubmit={imageSourceType !== "text"}
            category={promptCategory}
            placeholder={promptPlaceholder}
          />

          <div className="prompt-settings">
            <div className="ps-item">
              <div
                className="toggle-group toggle-3"
                style={
                  {
                    "--toggle-pos": String(
                      ["text", "work", "upload"].indexOf(imageSourceType),
                    ),
                  } as React.CSSProperties
                }
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    className={`toggle-btn ${imageSourceType === opt.key ? "active" : ""}`}
                    onClick={() => onImageSourceTypeChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ps-item">
              <Select
                className="ps-select"
                value={model}
                options={models}
                onChange={onModelChange}
              />
            </div>

            {imageSourceType === "upload" && (
              <div className="ps-item">
                <label className={`ps-upload-btn${referenceFile ? " has-files" : ""}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  {referenceFile ? referenceFile.name : "选择图片"}
                  <input
                    type="file"
                    accept="image/*"
                    className="ps-file-hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            )}

            {hasImage && (
              <div className="ps-item">
                <span className="threed-ref-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  参考图已选
                </span>
              </div>
            )}
          </div>

          {imageSourceType === "upload" && referenceFile && (
            <div className="prompt-ref-previews">
              <div
                className={`prompt-ref-thumb threed-upload-preview${referenceConfirmed ? " confirmed" : ""}`}
                onClick={onReferenceConfirm}
                title={referenceConfirmed ? "点击取消参考图" : "点击设为参考图"}
              >
                <img src={referencePreviewUrl!} alt="" />
                {!referenceConfirmed && (
                  <div className="threed-upload-confirm-hint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    点击确认
                  </div>
                )}
                <button
                  className="prompt-ref-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReferenceFileChange(null);
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="2" y1="2" x2="8" y2="8" />
                    <line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
