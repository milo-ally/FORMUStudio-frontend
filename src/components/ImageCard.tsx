import type { StoredImage } from "../types";

interface ImageCardProps {
  image: StoredImage;
  onPreview: () => void;
  onDelete?: () => void;
}

export function ImageCard({ image, onPreview, onDelete }: ImageCardProps) {
  if (image.status === "loading") {
    return (
      <div className="image-card loading">
        <div className="image-loader">
          <div className="loader-ring" />
          <span className="loader-text">
            {image.progress ? image.progress : image.elapsed_secs ? `${image.elapsed_secs.toFixed(0)}s` : "排队中..."}
          </span>
        </div>
      </div>
    );
  }

  if (image.status === "error") {
    return (
      <div className="image-card error">
        <div className="error-content">
          <span className="error-icon">!</span>
          <span className="error-text">{image.error || "生成失败"}</span>
        </div>
      </div>
    );
  }

  const src = image.b64_json
    ? `data:image/png;base64,${image.b64_json}`
    : image.url || "";

  return (
    <div className="image-card success" onClick={onPreview}>
      <img src={src} alt={image.revised_prompt || "AI Generated"} loading="lazy" />
      {onDelete && (
        <button
          className="work-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="删除"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <div className="image-overlay">
        <span className="overlay-btn">查看大图</span>
      </div>
    </div>
  );
}
