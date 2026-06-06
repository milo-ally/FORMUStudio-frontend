import { useState, useCallback, useEffect } from "react";
import { PromptInput } from "../shared/PromptInput";
import { Gallery } from "./Gallery";
import { DraftArea } from "./DraftArea";
import { Lightbox } from "./Lightbox";
import { Select } from "../shared/Select";
import { PresetEditor } from "./PresetEditor";
import { useImageGeneration } from "./useImageGeneration";
import { fetchModels } from "../../api/api";
import { base64ToFile } from "../../utils/fileUtils";
import { fetchPresets, savePreset, removePreset, saveWork, removeWork } from "../../api/dataApi";
import { RATIO_DIMENSIONS } from "../../types";
import { getDefaultPresets, resolvePresets, DEFAULT_IDS } from "./presets";
import type { Preset } from "./presets";
import type { ImageRatio, StoredImage, WorkMeta, PresetOverride, CustomPresetMeta } from "../../types";
import "./ImageModule.css";

interface ImageModuleProps {
  works: Record<string, WorkMeta[]>;
  activeProject: string;
  onWorksChange: (works: Record<string, WorkMeta[]>) => void;
  toast: {
    push: (text: string, type: "success" | "error") => void;
  };
}

export function ImageModule({ works, activeProject, onWorksChange, toast }: ImageModuleProps) {
  // ── Image generation state ──
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [model, setModel] = useState("gpt-image-2");
  const [models, setModels] = useState(["gpt-image-2"]);
  const [ratio, setRatio] = useState<ImageRatio>("1:1");
  const [quality, setQuality] = useState("auto");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // ── Presets ──
  const [presetOverrides, setPresetOverrides] = useState<Record<string, PresetOverride>>({});
  const [presetImages, setPresetImages] = useState<Record<string, string>>({});
  const [customPresets, setCustomPresets] = useState<CustomPresetMeta[]>([]);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  // ── Lightbox ──
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());

  const { images, generating, startGeneration, cancelGeneration, addImage, removeImage } = useImageGeneration();

  // ── Load presets from server on mount ──
  useEffect(() => {
    fetchPresets()
      .then((serverPresets) => {
        const overrides: Record<string, PresetOverride> = {};
        const imgs: Record<string, string> = {};
        const customs: CustomPresetMeta[] = [];

        for (const o of serverPresets.overrides) {
          overrides[o.id] = { id: o.id, title: o.title, prompt: o.prompt };
          if (o.image_base64) imgs[o.id] = `data:image/png;base64,${o.image_base64}`;
        }
        for (const c of serverPresets.customs) {
          customs.push({ id: c.id, title: c.title, prompt: c.prompt, ratio: c.ratio });
          if (c.image_base64) imgs[c.id] = `data:image/png;base64,${c.image_base64}`;
        }

        setPresetOverrides(overrides);
        setPresetImages(imgs);
        setCustomPresets(customs);
      })
      .catch(() => {});
  }, []);

  const resolvedPresets = resolvePresets(presetOverrides, presetImages, customPresets, presetImages);

  // ── Load models ──
  useEffect(() => {
    fetchModels()
      .then((list) => {
        if (list.length > 0) {
          setModels(list);
          if (!list.includes(model)) setModel(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Works for rendering ──
  const currentWorks = works[activeProject] || [];
  const successWorks: StoredImage[] = currentWorks.map((w) => ({
    id: w.id,
    status: "success" as const,
    revised_prompt: w.revised_prompt,
    url: w.b64_json ? `data:image/png;base64,${w.b64_json}` : "",
    b64_json: w.b64_json,
  }));

  // ── Handlers ──
  const handleSubmit = useCallback((text?: string) => {
    const p = (text ?? prompt).trim();
    if (!p) return;
    const { width, height } = RATIO_DIMENSIONS[ratio];
    setLastPrompt(p);
    setPromotedIds(new Set());
    startGeneration(p, mode, {
      count: 1,
      model,
      size: `${width}x${height}`,
      quality,
      referenceFiles: mode === "edit" ? referenceFiles : undefined,
    });
    setPrompt("");
  }, [prompt, mode, model, ratio, quality, referenceFiles, startGeneration]);

  const handlePromoteToWorks = useCallback(
    async (id: string) => {
      const item = images.find((img) => img.id === id);
      if (!item || item.status !== "success" || !item.b64_json) return;
      setPromotedIds((prev) => new Set(prev).add(id));

      try {
        await saveWork({
          id,
          project_id: activeProject,
          image_base64: item.b64_json,
          revised_prompt: item.revised_prompt,
          created_at: Date.now(),
        });
      } catch (err) {
        console.error("Failed to save work:", err);
        setPromotedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const meta: WorkMeta = {
        id,
        status: "success",
        revised_prompt: item.revised_prompt,
        created_at: Date.now(),
        b64_json: item.b64_json,
      };
      onWorksChange({
        ...works,
        [activeProject]: [...(works[activeProject] || []), meta],
      });
    },
    [activeProject, images, works, onWorksChange],
  );

  const handleDiscardDraft = useCallback(
    (id: string) => { removeImage(id); },
    [removeImage],
  );

  const handleImportFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const b64 = dataUrl.split(",")[1] || "";
          const draft: StoredImage = {
            id: crypto.randomUUID(),
            status: "success",
            b64_json: b64,
            revised_prompt: file.name,
          };
          addImage(draft);
        };
        reader.readAsDataURL(file);
      }
    },
    [addImage],
  );

  const handleUseAsReference = useCallback(
    (img: StoredImage) => {
      if (img.b64_json) {
        const file = base64ToFile(img.b64_json, "reference.png");
        setReferenceFiles((prev) => [...prev, file].slice(0, 5));
        setMode("edit");
      }
    },
    [],
  );

  const handleDeleteWork = useCallback(
    async (id: string) => {
      removeWork(id).catch(() => {});
      onWorksChange({
        ...works,
        [activeProject]: (works[activeProject] || []).filter((w) => w.id !== id),
      });
    },
    [activeProject, works, onWorksChange],
  );

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration();
    setPromotedIds(new Set());
  }, [cancelGeneration]);

  const handlePresetSelect = useCallback(
    (preset: Preset) => { setPrompt(preset.prompt); },
    [],
  );

  const handleEditPreset = useCallback((preset: Preset) => {
    setEditingPreset(preset);
  }, []);

  const handleSavePreset = useCallback(
    async (id: string, updates: { title?: string; prompt?: string; imageB64?: string }) => {
      try {
        const isBuiltin = DEFAULT_IDS.has(id);
        if (isBuiltin) {
          const defaults = getDefaultPresets().find((p) => p.id === id)!;
          const title = updates.title && updates.title !== defaults.title ? updates.title : undefined;
          const prompt = updates.prompt && updates.prompt !== defaults.prompt ? updates.prompt : undefined;
          await savePreset({
            id,
            title: updates.title || defaults.title,
            prompt: updates.prompt || defaults.prompt,
            image_base64: updates.imageB64,
            ratio: defaults.ratio,
            is_custom: 0,
          });
          setPresetOverrides((prev) => {
            const next = { ...prev };
            const ov: PresetOverride = { id };
            if (title) ov.title = title;
            if (prompt) ov.prompt = prompt;
            next[id] = ov;
            return next;
          });
          if (updates.imageB64) {
            setPresetImages((prev) => ({ ...prev, [id]: `data:image/png;base64,${updates.imageB64}` }));
          }
        } else {
          const existing = customPresets.find((c) => c.id === id);
          await savePreset({
            id,
            title: updates.title || existing?.title || "",
            prompt: updates.prompt || existing?.prompt || "",
            image_base64: updates.imageB64,
            ratio: existing?.ratio || "1:1",
            is_custom: 1,
          });
          setCustomPresets((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, title: updates.title || c.title, prompt: updates.prompt || c.prompt } : c,
            ),
          );
          if (updates.imageB64) {
            setPresetImages((prev) => ({ ...prev, [id]: `data:image/png;base64,${updates.imageB64}` }));
          }
        }
        setEditingPreset(null);
        toast.push("风格已保存", "success");
      } catch {
        toast.push("保存失败，请重试", "error");
      }
    },
    [customPresets, toast.push],
  );

  const handleCreatePreset = useCallback(
    async (_id: string, updates: { title?: string; prompt?: string; imageB64?: string }) => {
      if (!updates.title || !updates.prompt) return;
      try {
        const newId = crypto.randomUUID();
        await savePreset({
          id: newId,
          title: updates.title,
          prompt: updates.prompt,
          image_base64: updates.imageB64,
          ratio: "1:1",
          is_custom: 1,
          created_at: Date.now(),
        });
        setCustomPresets((prev) => [
          ...prev,
          { id: newId, title: updates.title!, prompt: updates.prompt! },
        ]);
        if (updates.imageB64) {
          setPresetImages((prev) => ({ ...prev, [newId]: `data:image/png;base64,${updates.imageB64}` }));
        }
        setEditingPreset(null);
        toast.push("风格已添加", "success");
      } catch {
        toast.push("添加失败，请重试", "error");
      }
    },
    [],
  );

  const handleAddPreset = useCallback(() => {
    setEditingPreset({ id: "", title: "", image: "", prompt: "" });
  }, []);

  const handleDeleteCustomPreset = useCallback(
    async (id: string) => {
      try {
        await removePreset(id);
        setCustomPresets((prev) => prev.filter((c) => c.id !== id));
        setPresetImages((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.push("风格已删除", "success");
      } catch {
        toast.push("删除失败，请重试", "error");
      }
    },
    [],
  );

  const handleResetPreset = useCallback(
    async (id: string) => {
      try {
        await removePreset(id);
        setPresetOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setPresetImages((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.push("已重置为默认", "success");
      } catch {
        toast.push("重置失败，请重试", "error");
      }
    },
    [],
  );

  const handlePreviewWork = useCallback(
    (index: number) => {
      setLightboxIndex(index);
      setLightboxOpen(true);
    },
    [],
  );

  return (
    <>
      <section className="hero-section">
        <div className="hero-inner">
          <h2 className="hero-title">为记忆，塑实体</h2>

          <div className="prompt-card">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              generating={generating}
              onCancel={cancelGeneration}
              category="image"
            />

            <div className="prompt-settings">
              <div className="ps-item">
                <div className="toggle-group" style={{ "--toggle-pos": mode === "generate" ? "0" : "1" } as React.CSSProperties}>
                  <button className={`toggle-btn ${mode === "generate" ? "active" : ""}`} onClick={() => setMode("generate")}>
                    文生图
                  </button>
                  <button className={`toggle-btn ${mode === "edit" ? "active" : ""}`} onClick={() => setMode("edit")}>
                    图生图
                  </button>
                </div>
              </div>

              <div className="ps-item">
                <Select className="ps-select" value={model} options={models} onChange={setModel} />
              </div>

              <div className="ps-item">
                <Select className="ps-select" value={ratio} options={[
                  { value: "1:1", label: "1:1 (1024×1024)" },
                  { value: "4:3", label: "4:3 (1152×896)" },
                  { value: "3:2", label: "3:2 (1216×832)" },
                  { value: "16:9", label: "16:9 (1344×768)" },
                  { value: "9:16", label: "9:16 (768×1344)" },
                  { value: "2:3", label: "2:3 (832×1216)" },
                  { value: "3:4", label: "3:4 (896×1152)" },
                ]} onChange={(v) => setRatio(v as ImageRatio)} />
              </div>

              <div className="ps-item">
                <Select className="ps-select" value={quality} options={[
                  { value: "auto", label: "自动" },
                  { value: "high", label: "高清" },
                  { value: "standard", label: "标准" },
                ]} onChange={setQuality} />
              </div>

              {mode === "edit" && (
                <div className="ps-item">
                  <label className="ps-upload-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {referenceFiles.length > 0 ? `${referenceFiles.length} 张图` : "参考图"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="ps-file-hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setReferenceFiles([...referenceFiles, ...Array.from(e.target.files)].slice(0, 5));
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {mode === "edit" && referenceFiles.length > 0 && (
              <div className="prompt-ref-previews">
                {referenceFiles.map((file, i) => (
                  <div key={i} className="prompt-ref-thumb">
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button
                      className="prompt-ref-remove"
                      onClick={() => setReferenceFiles(referenceFiles.filter((_, j) => j !== i))}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <DraftArea
        images={images}
        generating={generating}
        prompt={lastPrompt}
        promotedIds={promotedIds}
        onCancel={handleCancelGeneration}
        onPromote={handlePromoteToWorks}
        onDiscard={handleDiscardDraft}
        onImport={handleImportFiles}
        onUseAsReference={handleUseAsReference}
      />

      <section className="gallery-section">
        <Gallery
          presets={resolvedPresets}
          works={successWorks}
          onSelectPreset={handlePresetSelect}
          onEditPreset={handleEditPreset}
          onAddPreset={handleAddPreset}
          onPreviewWork={handlePreviewWork}
          onDeleteWork={handleDeleteWork}
        />
      </section>

      <Lightbox
        images={successWorks}
        index={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />

      {editingPreset && (() => {
        const isCreate = editingPreset.id === "";
        const defaultMatch = getDefaultPresets().find((p) => p.id === editingPreset.id);
        const defaultPreset = defaultMatch || { id: "", title: "", image: "", prompt: "" };
        return (
          <PresetEditor
            preset={editingPreset}
            defaultPreset={defaultPreset}
            mode={isCreate ? "create" : "edit"}
            open={true}
            onClose={() => setEditingPreset(null)}
            onSave={isCreate ? handleCreatePreset : handleSavePreset}
            onReset={handleResetPreset}
            onDelete={(!isCreate && !DEFAULT_IDS.has(editingPreset.id)) ? handleDeleteCustomPreset : undefined}
          />
        );
      })()}
    </>
  );
}
