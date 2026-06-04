import { ImageCard } from "./ImageCard";
import type { StoredImage } from "../types";

interface ImageGalleryProps {
  images: StoredImage[];
  generating: boolean;
  onPreviewImage: (index: number) => void;
}

export function ImageGallery({ images, generating, onPreviewImage }: ImageGalleryProps) {
  if (images.length === 0 && !generating) {
    return (
      <div className="gallery-empty">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <h2>开始创作</h2>
        <p>在上方输入提示词，AI 将为你生成精美图像</p>
      </div>
    );
  }

  return (
    <div className="gallery-grid">
      {images.map((img, i) => (
        <ImageCard
          key={img.id}
          image={img}
          onPreview={() => onPreviewImage(i)}
        />
      ))}
      {generating && images.filter((i) => i.status === "loading").length === 0 && (
        <div className="image-card loading">
          <div className="image-loader">
            <div className="loader-ring" />
            <span className="loader-text">创建中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
