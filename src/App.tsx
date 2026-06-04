import { useState, useCallback, useEffect, useRef } from "react";
import { PromptInput } from "./components/PromptInput";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { Gallery } from "./components/Gallery";
import { DraftArea } from "./components/DraftArea";
import { Lightbox } from "./components/Lightbox";
import { Select } from "./components/Select";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { fetchModels } from "./lib/api";
import { base64ToFile } from "./lib/utils";
import { fetchProjects, saveProject, removeProject, fetchWorks, saveWork, removeWork, fetchPresets, savePreset, removePreset, fetchSetting, saveSetting } from "./lib/dataApi";
import { maybeMigrate } from "./lib/migrateData";
import { RATIO_DIMENSIONS } from "./types";
import { getDefaultPresets, resolvePresets, DEFAULT_IDS } from "./data/presets";
import type { Preset } from "./data/presets";
import { PresetEditor } from "./components/PresetEditor";
import { Toast } from "./components/Toast";
import type { ToastMessage } from "./components/Toast";
import type { ImageRatio, StoredImage, Project } from "./types";
import "./App.css";

interface WorkMeta {
  id: string;
  status: "success";
  revised_prompt?: string;
  created_at: number;
  b64_json?: string;
}

interface PresetOverride {
  id: string;
  title?: string;
  prompt?: string;
}

interface CustomPresetMeta {
  id: string;
  title: string;
  prompt: string;
  ratio?: string;
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Generation settings
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [model, setModel] = useState("gpt-image-2");
  const [models, setModels] = useState(["gpt-image-2"]);
  const [ratio, setRatio] = useState<ImageRatio>("1:1");
  const [quality, setQuality] = useState("auto");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // Data loading state
  const [dataLoaded, setDataLoaded] = useState(false);

  // Projects
  const [projects, setProjects] = useState<Project[]>(() => [
    { id: "default", name: "默认项目", thumbnail: "", imageCount: 0, createdAt: Date.now() },
  ]);
  const [activeProject, setActiveProject] = useState("default");

  // Works — metadata + b64_json from API
  const [works, setWorks] = useState<Record<string, WorkMeta[]>>({});

  // Presets
  const [presetOverrides, setPresetOverrides] = useState<Record<string, PresetOverride>>({});
  const [presetImages, setPresetImages] = useState<Record<string, string>>({}); // id -> data URL or base64
  const [customPresets, setCustomPresets] = useState<CustomPresetMeta[]>([]);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((text: string, type: "success" | "error") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Migrate legacy data then load from API on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        await maybeMigrate();
      } catch {}
      try {
        const savedActive = await fetchSetting("active_project");
        if (savedActive && !cancelled) setActiveProject(savedActive);
      } catch {}
      try {
        const [serverProjects, serverWorks, serverPresets] = await Promise.all([
          fetchProjects(),
          (async () => {
            // Fetch works for all projects we know about
            const allWorks: Record<string, WorkMeta[]> = {};
            const projects = await fetchProjects();
            for (const p of projects) {
              const w = await fetchWorks(p.id);
              allWorks[p.id] = w;
            }
            return allWorks;
          })(),
          fetchPresets(),
        ]);

        if (cancelled) return;

        if (serverProjects.length > 0) {
          setProjects(serverProjects);
        }

        if (Object.keys(serverWorks).length > 0) {
          setWorks(serverWorks);
        }

        // Parse presets
        const overrides: Record<string, PresetOverride> = {};
        const images: Record<string, string> = {};
        const customs: CustomPresetMeta[] = [];

        for (const o of serverPresets.overrides) {
          overrides[o.id] = { id: o.id, title: o.title, prompt: o.prompt };
          if (o.image_base64) {
            images[o.id] = `data:image/png;base64,${o.image_base64}`;
          }
        }
        for (const c of serverPresets.customs) {
          customs.push({
            id: c.id,
            title: c.title,
            prompt: c.prompt,
            ratio: c.ratio,
          });
          if (c.image_base64) {
            images[c.id] = `data:image/png;base64,${c.image_base64}`;
          }
        }

        setPresetOverrides(overrides);
        setPresetImages(images);
        setCustomPresets(customs);
      } catch (err) {
        console.error("Failed to load data from API:", err);
      }
      if (!cancelled) setDataLoaded(true);
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Resolved presets
  const resolvedPresets = resolvePresets(presetOverrides, presetImages, customPresets, presetImages);

  // Update project thumbnails + imageCount from works
  useEffect(() => {
    setProjects((prev) =>
      prev.map((p) => {
        const ws = works[p.id] || [];
        const last = [...ws].reverse()[0];
        const thumb = last?.b64_json ? `data:image/png;base64,${last.b64_json}` : "";
        return {
          ...p,
          thumbnail: thumb,
          imageCount: ws.length,
        };
      }),
    );
  }, [works]);

  // Persist active project to server
  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("active_project", activeProject).catch(() => {});
  }, [activeProject, dataLoaded]);

  // Persist project list changes to API
  const prevProjectsRef = useRef(projects);
  useEffect(() => {
    if (!dataLoaded) return;
    // Only save if something actually changed
    for (const p of projects) {
      saveProject({
        id: p.id,
        name: p.name,
        image_count: p.imageCount,
        created_at: p.createdAt,
      }).catch(() => {});
    }
    prevProjectsRef.current = projects;
  }, [projects, dataLoaded]);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());

  const { images, generating, startGeneration, cancelGeneration, addImage, removeImage } = useImageGeneration();

  // Load models
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

  // Project CRUD
  const handleCreateProject = useCallback(() => {
    const existing = projects.map((p) => p.name);
    let n = 1;
    let name = `未命名项目 ${n}`;
    while (existing.includes(name)) name = `未命名项目 ${++n}`;
    const id = crypto.randomUUID();
    const newProject: Project = { id, name, thumbnail: "", imageCount: 0, createdAt: Date.now() };
    setProjects((prev) => [...prev, newProject]);
    setActiveProject(id);
    saveProject({ id, name, image_count: 0, created_at: newProject.createdAt }).catch(() => {});
  }, [projects]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      if (projects.length <= 1) return;
      removeProject(id).catch(() => {});
      setWorks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject === id) {
        const remaining = projects.filter((p) => p.id !== id);
        setActiveProject(remaining[0]?.id || "default");
      }
    },
    [projects, activeProject],
  );

  const handleRenameProject = useCallback(
    (id: string, name: string) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    },
    [],
  );

  const handleSelectProject = useCallback((id: string) => {
    setActiveProject(id);
  }, []);

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

  // Promote from generation panel → works
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
      setWorks((w) => ({
        ...w,
        [activeProject]: [...(w[activeProject] || []), meta],
      }));
    },
    [activeProject, images],
  );

  const handleDiscardDraft = useCallback(
    (id: string) => {
      removeImage(id);
    },
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
        return;
      }
      // Works from API have b64_json populated, so this fallback rarely needed
    },
    [],
  );

  const handleDeleteWork = useCallback(
    async (id: string) => {
      removeWork(id).catch(() => {});
      setWorks((prev) => ({
        ...prev,
        [activeProject]: (prev[activeProject] || []).filter((w) => w.id !== id),
      }));
    },
    [activeProject],
  );

  const handleCancelGeneration = useCallback(() => {
    cancelGeneration();
    setPromotedIds(new Set());
  }, [cancelGeneration]);

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      setPrompt(preset.prompt);
    },
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
              c.id === id
                ? {
                    ...c,
                    title: updates.title || c.title,
                    prompt: updates.prompt || c.prompt,
                  }
                : c,
            ),
          );
          if (updates.imageB64) {
            setPresetImages((prev) => ({ ...prev, [id]: `data:image/png;base64,${updates.imageB64}` }));
          }
        }
        setEditingPreset(null);
        pushToast("风格已保存", "success");
      } catch {
        pushToast("保存失败，请重试", "error");
      }
    },
    [customPresets, pushToast],
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
        pushToast("风格已添加", "success");
      } catch {
        pushToast("添加失败，请重试", "error");
      }
    },
    [],
  );

  const handleAddPreset = useCallback(() => {
    setEditingPreset({
      id: "",
      title: "",
      image: "",
      prompt: "",
    });
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
        pushToast("风格已删除", "success");
      } catch {
        pushToast("删除失败，请重试", "error");
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
        pushToast("已重置为默认", "success");
      } catch {
        pushToast("重置失败，请重试", "error");
      }
    },
    [],
  );

  // Works for rendering
  const currentWorks = works[activeProject] || [];
  const successWorks = currentWorks.map((w) => ({
    id: w.id,
    status: "success" as const,
    revised_prompt: w.revised_prompt,
    url: w.b64_json ? `data:image/png;base64,${w.b64_json}` : "",
    b64_json: w.b64_json,
  }));

  const handlePreviewWork = useCallback(
    (index: number) => {
      setLightboxIndex(index);
      setLightboxOpen(true);
    },
    [],
  );

  return (
    <div className="app">
      {/* ===== Header ===== */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="logo">
            FORMU<span className="logo-sep"> </span>Studio
          </h1>
          <span className="logo-badge">beta</span>
        </div>
        <div className="header-right">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? "收起侧栏" : "展开侧栏"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="12" height="10" rx="1.5" />
              <line x1="6" y1="5" x2="6" y2="11" />
              {sidebarOpen && <line x1="3.5" y1="5" x2="3.5" y2="11" />}
            </svg>
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === "light" ? "暗色模式" : "亮色模式"}>
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ===== Main ===== */}
      <div className="app-main">
        <div className={`project-sidebar ${sidebarOpen ? "open" : ""}`}>
          <ProjectSidebar
            projects={projects}
            activeId={activeProject}
            onSelect={handleSelectProject}
            onCreate={handleCreateProject}
            onDelete={handleDeleteProject}
            onRename={handleRenameProject}
          />
        </div>

        <div className="content-area">
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

          {/* ===== Draft Area ===== */}
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

          {/* ===== Gallery ===== */}
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
        </div>
      </div>

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

      <Toast messages={toasts} onDone={dismissToast} />
    </div>
  );
}

export default App;
