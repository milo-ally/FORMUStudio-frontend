import { useState, useCallback, useRef, useEffect } from "react";
import type { Preset } from "../data/presets";
import { DEFAULT_IDS } from "../data/presets";

interface PresetEditorProps {
  preset: Preset;
  defaultPreset: Preset;
  mode: "edit" | "create";
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; prompt?: string; imageB64?: string }) => void;
  onReset: (id: string) => void;
  onDelete?: (id: string) => void;
}

const EMPTY_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23181818' width='200' height='200'/%3E%3Ccircle cx='100' cy='80' r='20' fill='%23333'/%3E%3Cpath d='M40 170 L80 120 L120 140 L160 60 L180 80 L180 170 Z' fill='%23333'/%3E%3C/svg%3E";

export function PresetEditor({
  preset,
  defaultPreset,
  mode,
  open,
  onClose,
  onSave,
  onReset,
  onDelete,
}: PresetEditorProps) {
  const [title, setTitle] = useState(preset.title);
  const [prompt, setPrompt] = useState(preset.prompt);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(preset.image || EMPTY_IMAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(preset.title || "");
      setPrompt(preset.prompt || "");
      setImageB64(null);
      setPreviewUrl(preset.image || EMPTY_IMAGE);
    }
  }, [open, preset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [open, onClose]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(",")[1] || "";
      setImageB64(b64);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(() => {
    onSave(preset.id, {
      title: title || defaultPreset.title || undefined,
      prompt: prompt || defaultPreset.prompt || undefined,
      imageB64: imageB64 || undefined,
    });
  }, [preset.id, title, prompt, imageB64, defaultPreset, onSave]);

  const handleReset = useCallback(() => {
    onReset(preset.id);
    setTitle(defaultPreset.title);
    setPrompt(defaultPreset.prompt);
    setImageB64(null);
    setPreviewUrl(defaultPreset.image);
  }, [preset.id, defaultPreset, onReset]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(preset.id);
      onClose();
    }
  }, [preset.id, onDelete, onClose]);

  if (!open) return null;

  const isCustom = !DEFAULT_IDS.has(preset.id);
  const hasChanges =
    title !== preset.title ||
    prompt !== preset.prompt ||
    imageB64 !== null;

  const canSave = mode === "create"
    ? title.trim() && prompt.trim()
    : hasChanges;

  return (
    <div className="preset-editor-backdrop" onClick={onClose}>
      <div className="preset-editor-card" onClick={(e) => e.stopPropagation()}>
        <button className="preset-editor-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="14" y2="14" />
            <line x1="14" y1="4" x2="4" y2="14" />
          </svg>
        </button>

        <h3 className="preset-editor-title">
          {mode === "create" ? "添加风格" : "编辑风格"}
        </h3>

        {/* Image */}
        <div className="preset-editor-image-area" onClick={() => fileInputRef.current?.click()}>
          <img src={previewUrl} alt="" />
          <div className="preset-editor-image-hint">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>点击更换图片</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="preset-editor-file-hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Title */}
        <label className="preset-editor-field">
          <span>名称</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入风格名称"
          />
        </label>

        {/* Prompt */}
        <label className="preset-editor-field">
          <span>提示词</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="输入提示词"
          />
        </label>

        {/* Actions */}
        <div className="preset-editor-actions">
          {mode === "edit" && !isCustom && (
            <button className="preset-editor-reset-btn" onClick={handleReset}>
              重置默认
            </button>
          )}
          {mode === "edit" && isCustom && onDelete && (
            <button className="preset-editor-delete-btn" onClick={handleDelete}>
              删除
            </button>
          )}
          <button
            className="preset-editor-save-btn"
            onClick={handleSave}
            disabled={!canSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
