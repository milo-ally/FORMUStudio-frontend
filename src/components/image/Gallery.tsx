import type { StoredImage } from "../../types";
import type { Preset } from "./presets";
import "./Gallery.css";

interface GalleryProps {
  presets: Preset[];
  works: StoredImage[];
  onSelectPreset: (preset: Preset) => void;
  onEditPreset?: (preset: Preset) => void;
  onAddPreset?: () => void;
  onPreviewWork: (index: number) => void;
  onDeleteWork?: (id: string) => void;
}

export function Gallery({
  presets,
  works,
  onSelectPreset,
  onEditPreset,
  onAddPreset,
  onPreviewWork,
  onDeleteWork,
}: GalleryProps) {
  const successWorks = works.filter((w) => w.status === "success");

  return (
    <div className="gallery">
      {/* Presets showcase */}
      <section className="gallery-presets">
        <div className="gallery-presets-header">
          <h3 className="gallery-section-title">风格探索</h3>
          {onAddPreset && (
            <button className="presets-add-btn" onClick={onAddPreset} title="添加风格">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
          )}
        </div>
        <div className="presets-grid">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="preset-card"
              onClick={() => onSelectPreset(preset)}
            >
              <img src={preset.image} alt={preset.title} />
              <div className="preset-card-overlay">
                <span className="preset-card-title">{preset.title}</span>
                <span className="preset-card-hint">使用此风格</span>
              </div>
              {onEditPreset && (
                <button
                  className="preset-card-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPreset(preset);
                  }}
                  title="编辑风格"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Works grid */}
      <section className="gallery-works">
        <h3 className="gallery-section-title">
          作品{successWorks.length > 0 && ` · ${successWorks.length} 张`}
        </h3>
        {successWorks.length === 0 ? (
          <div className="gallery-works-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>开始创作吧</p>
            <span>选择上方风格或输入提示词，AI 将为你生成精美图像</span>
          </div>
        ) : (
          <div className="works-grid">
            {successWorks.map((work, i) => {
              const src = work.b64_json
                ? `data:image/png;base64,${work.b64_json}`
                : work.url || "";

              return (
                <div
                  key={work.id}
                  className="work-card"
                  onClick={() => onPreviewWork(i)}
                >
                  <img src={src} alt="" loading="lazy" />
                  <div className="work-card-overlay">
                    <span className="work-card-view">查看大图</span>
                  </div>
                  {onDeleteWork && (
                    <button
                      className="work-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWork(work.id);
                      }}
                      title="删除"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
