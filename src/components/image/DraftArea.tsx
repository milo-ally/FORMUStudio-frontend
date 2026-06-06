import { useRef, useCallback, useState } from "react";
import type { StoredImage } from "../../types";
import "./DraftArea.css";

interface DraftAreaProps {
  images: StoredImage[];
  generating: boolean;
  prompt: string;
  promotedIds: Set<string>;
  onCancel: () => void;
  onPromote: (id: string) => void;
  onDiscard: (id: string) => void;
  onImport: (files: File[]) => void;
  onUseAsReference: (image: StoredImage) => void;
}

export function DraftArea({
  images,
  generating,
  prompt: usedPrompt,
  promotedIds,
  onCancel,
  onPromote,
  onDiscard,
  onImport,
  onUseAsReference,
}: DraftAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingImages = images.filter((i) => i.status === "loading");
  const drafts = images.filter(
    (i) => i.status === "success" && !promotedIds.has(i.id)
  );
  const errorImages = images.filter((i) => i.status === "error");

  const hasContent = generating || drafts.length > 0 || loadingImages.length > 0 || errorImages.length > 0;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      dragCounter.current = 0;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onImport(files);
    },
    [onImport]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onImport(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [onImport]
  );

  return (
    <div
      className={`draft-area ${dragOver ? "draft-dragover" : ""} ${hasContent ? "draft-has-content" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <div className="draft-header">
        <div className="draft-header-left">
          <span className="draft-label">草稿</span>
          {(drafts.length > 0 || loadingImages.length > 0) && (
            <span className="draft-count">
              {loadingImages.length > 0
                ? `生成中 ${loadingImages.length}...`
                : `${drafts.length} 张`}
            </span>
          )}
        </div>
        <div className="draft-header-right">
          {generating && (
            <button className="draft-cancel-btn" onClick={onCancel}>
              取消生成
            </button>
          )}
          <button
            className="draft-import-btn"
            onClick={() => fileInputRef.current?.click()}
            title="导入本地图片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="draft-file-hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Prompt (only during generation) */}
      {generating && usedPrompt && (
        <p className="draft-prompt">{usedPrompt}</p>
      )}

      {/* Cards strip */}
      {hasContent ? (
        <div className="draft-cards">
          {/* Loading cards */}
          {loadingImages.map((img) => (
            <div key={img.id} className="draft-card draft-card-loading">
              <div className="draft-card-scan" />
              <div className="draft-card-glow" />
              <div className="draft-card-loading-inner">
                <span className="draft-progress">
                  {img.progress || (img.elapsed_secs ? `${img.elapsed_secs.toFixed(0)}s` : "排队中...")}
                </span>
              </div>
            </div>
          ))}

          {/* Error cards */}
          {errorImages.map((img) => (
            <div key={img.id} className="draft-card draft-card-error">
              <div className="draft-card-error-inner">
                <span className="draft-error-icon">!</span>
                <span className="draft-error-text">{img.error || "生成失败"}</span>
              </div>
              <div className="draft-card-actions">
                <button className="draft-card-btn" onClick={() => onDiscard(img.id)}>
                  丢弃
                </button>
              </div>
            </div>
          ))}

          {/* Draft cards (completed, not promoted) */}
          {drafts.map((img) => {
            const src = img.b64_json
              ? `data:image/png;base64,${img.b64_json}`
              : img.url || "";

            return (
              <div key={img.id} className="draft-card draft-card-success">
                <img src={src} alt="" className="draft-card-img" />
                <div className="draft-card-actions">
                  <button
                    className="draft-card-btn draft-card-promote"
                    onClick={() => onPromote(img.id)}
                  >
                    收录
                  </button>
                  <button
                    className="draft-card-btn"
                    onClick={() => onUseAsReference(img)}
                  >
                    参考
                  </button>
                  <button
                    className="draft-card-btn draft-card-discard"
                    onClick={() => onDiscard(img.id)}
                  >
                    丢弃
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="draft-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>拖拽图片到此处导入，或点击「导入」按钮</span>
        </div>
      )}

      {/* Drop overlay */}
      {dragOver && (
        <div className="draft-drop-overlay">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>释放以导入图片</span>
        </div>
      )}
    </div>
  );
}
