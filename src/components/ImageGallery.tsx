import { ImageCard } from "./ImageCard";
import type { StoredImage } from "../types";

interface ImageGalleryProps {
  images: StoredImage[];
  generating: boolean;
  onPreviewImage: (index: number) => void;
  onDeleteImage?: (id: string) => void;
}

export function ImageGallery({ images, generating, onPreviewImage, onDeleteImage }: ImageGalleryProps) {
  const successImages = images.filter((i) => i.status === "success");

  if (successImages.length === 0) {
    return (
      <div className="works-empty">
        <span className="works-empty-text">暂无作品</span>
      </div>
    );
  }

  return (
    <div className="works-gallery">
      <h3 className="works-title">作品</h3>
      <div className="works-grid">
        {images
          .filter((i) => i.status === "success")
          .map((img, i) => (
            <ImageCard
              key={img.id}
              image={img}
              onPreview={() => onPreviewImage(i)}
              onDelete={onDeleteImage ? () => onDeleteImage(img.id) : undefined}
            />
          ))}
      </div>
    </div>
  );
}
