import { useEffect, useCallback } from "react";
import type { StoredImage } from "../../types";
import "./Lightbox.css";

interface LightboxProps {
  images: StoredImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function Lightbox({ images, index, open, onClose, onIndexChange }: LightboxProps) {
  const image = images[index];
  const src = image?.b64_json
    ? `data:image/png;base64,${image.b64_json}`
    : image?.url || "";

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, goPrev, goNext]);

  if (!open) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        ×
      </button>

      {images.length > 1 && (
        <>
          <button className="lightbox-nav left" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
            ‹
          </button>
          <button className="lightbox-nav right" onClick={(e) => { e.stopPropagation(); goNext(); }}>
            ›
          </button>
        </>
      )}

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={image?.revised_prompt || "AI Generated"} />
        {image?.revised_prompt && (
          <p className="lightbox-prompt">{image.revised_prompt}</p>
        )}
        <div className="lightbox-counter">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
