import { useState, useCallback, useEffect, useRef } from "react";
import { PromptInput } from "./components/PromptInput";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ImageGallery } from "./components/ImageGallery";
import { Lightbox } from "./components/Lightbox";
import { Select } from "./components/Select";
import { useImageGeneration } from "./hooks/useImageGeneration";
import { fetchModels } from "./lib/api";
import { RATIO_DIMENSIONS } from "./types";
import type { ImageRatio, StoredImage, Project } from "./types";
import "./App.css";

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem("formu_projects");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [{ id: "default", name: "默认项目", thumbnail: "", imageCount: 0, createdAt: Date.now() }];
}

function saveProjects(projects: Project[]) {
  localStorage.setItem("formu_projects", JSON.stringify(projects));
}

function loadProjectImages(): Record<string, StoredImage[]> {
  try {
    const raw = localStorage.getItem("formu_project_images");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveProjectImages(images: Record<string, StoredImage[]>) {
  localStorage.setItem("formu_project_images", JSON.stringify(images));
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
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [model, setModel] = useState("gpt-image-2");
  const [models, setModels] = useState(["gpt-image-2"]);
  const [ratio, setRatio] = useState<ImageRatio>("1:1");
  const [quality, setQuality] = useState("auto");
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // Projects
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeProject, setActiveProject] = useState(() => {
    const stored = localStorage.getItem("formu_active_project");
    return stored || "default";
  });
  const [projectImages, setProjectImages] = useState<Record<string, StoredImage[]>>(loadProjectImages);

  // Persist projects
  useEffect(() => { saveProjects(projects); }, [projects]);
  useEffect(() => { saveProjectImages(projectImages); }, [projectImages]);
  useEffect(() => {
    localStorage.setItem("formu_active_project", activeProject);
  }, [activeProject]);

  // Current project's images
  const currentImages = projectImages[activeProject] || [];

  // Sync images back to project
  const syncImages = useCallback((imgs: StoredImage[]) => {
    setProjectImages((prev) => ({ ...prev, [activeProject]: imgs }));
  }, [activeProject]);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { images, generating, startGeneration, clearImages } = useImageGeneration();

  // Sync hook images → project images
  const prevImagesRef = useRef<StoredImage[]>([]);
  useEffect(() => {
    if (images !== prevImagesRef.current) {
      prevImagesRef.current = images;
      syncImages(images);
    }
  }, [images, syncImages]);

  // Update project thumbnail + imageCount when images change
  useEffect(() => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject) return p;
        const imgs = projectImages[activeProject] || [];
        const lastSuccess = [...imgs].reverse().find((i) => i.status === "success");
        return {
          ...p,
          thumbnail: lastSuccess?.b64_json
            ? `data:image/png;base64,${lastSuccess.b64_json}`
            : lastSuccess?.url || p.thumbnail,
          imageCount: imgs.filter((i) => i.status === "success").length,
        };
      }),
    );
  }, [projectImages, activeProject]);

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
  }, [projects]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      if (projects.length <= 1) return;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setProjectImages((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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

  const handleSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    const { width, height } = RATIO_DIMENSIONS[ratio];
    startGeneration(prompt, mode, {
      count: 1,
      model,
      size: `${width}x${height}`,
      quality,
      referenceFiles: mode === "edit" ? referenceFiles : undefined,
    });
    setPrompt("");
  }, [prompt, mode, model, ratio, quality, referenceFiles, startGeneration]);

  const handleClearImages = useCallback(() => {
    clearImages();
    setProjectImages((prev) => ({ ...prev, [activeProject]: [] }));
  }, [clearImages, activeProject]);

  const handlePreviewImage = useCallback(
    (index: number) => {
      const successImages = currentImages.filter((i: StoredImage) => i.status === "success");
      const globalIndex = currentImages.indexOf(successImages[index]);
      setLightboxIndex(globalIndex >= 0 ? globalIndex : index);
      setLightboxOpen(true);
    },
    [currentImages],
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
          <button className="clear-btn" onClick={handleClearImages} disabled={currentImages.length === 0}>
            清空
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
                  disabled={generating}
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

          <section className="gallery-section">
            <ImageGallery
              images={currentImages}
              generating={generating}
              onPreviewImage={handlePreviewImage}
            />
          </section>
        </div>
      </div>

      <Lightbox
        images={currentImages}
        index={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}

export default App;
