import type { StoredImage } from "../types";

interface GenerationPanelProps {
  images: StoredImage[];
  generating: boolean;
  prompt: string;
  promotedIds: Set<string>;
  onCancel: () => void;
  onPromote: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function GenerationPanel({
  images,
  generating,
  prompt: usedPrompt,
  promotedIds,
  onCancel,
  onPromote,
  onDiscard,
}: GenerationPanelProps) {
  const drafts = images.filter(
    (i) => i.status === "success" && !promotedIds.has(i.id)
  );
  const activeCount = images.filter((i) => i.status === "loading").length;

  if (!generating && drafts.length === 0 && activeCount === 0) return null;

  return (
    <div className="gen-panel">
      <div className="gen-panel-header">
        <p className="gen-panel-prompt">{usedPrompt}</p>
        {generating && (
          <button className="gen-panel-cancel" onClick={onCancel}>
            取消生成
          </button>
        )}
      </div>

      <div className="gen-panel-cards">
        {/* Active / loading cards */}
        {images
          .filter((i) => i.status === "loading")
          .map((img) => (
            <div key={img.id} className="gen-card gen-card-loading">
              <div className="gen-card-loading-inner">
                <div className="loader-ring gen-loader" />
                <span className="gen-progress">
                  {img.progress || (img.elapsed_secs ? `${img.elapsed_secs.toFixed(0)}s` : "排队中...")}
                </span>
              </div>
            </div>
          ))}

        {/* Error cards */}
        {images
          .filter((i) => i.status === "error")
          .map((img) => (
            <div key={img.id} className="gen-card gen-card-error">
              <div className="gen-card-error-inner">
                <span className="gen-error-icon">!</span>
                <span className="gen-error-text">{img.error || "生成失败"}</span>
              </div>
              <div className="gen-card-actions">
                <button className="gen-card-btn" onClick={() => onDiscard(img.id)}>
                  丢弃
                </button>
              </div>
            </div>
          ))}

        {/* Draft cards (completed, not yet promoted) */}
        {drafts.map((img) => (
          <div key={img.id} className="gen-card gen-card-success">
            <img
              src={
                img.b64_json
                  ? `data:image/png;base64,${img.b64_json}`
                  : img.url || ""
              }
              alt=""
              className="gen-card-img"
            />
            <div className="gen-card-actions">
              <button
                className="gen-card-btn gen-card-promote"
                onClick={() => onPromote(img.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                收录
              </button>
              <button
                className="gen-card-btn gen-card-discard"
                onClick={() => onDiscard(img.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
