import { useState, useCallback, useEffect } from "react";
import { ImageModule } from "./components/image/ImageModule";
import { ProjectSidebar } from "./components/shared/ProjectSidebar";
import { Toast } from "./components/shared/Toast";
import { use3DGeneration } from "./components/3d/use3DGeneration";
import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";
import { ThreeDModule } from "./components/3d/ThreeDModule";
import { PerlerModule } from "./components/perler/PerlerModule";
import type { PerlerSaveData } from "./components/perler/PerlerModule";
import { fetchProjects, saveProject, removeProject, fetchWorks, fetchPerlerPatterns, savePerlerPattern, removePerlerPattern, fetchSetting, saveSetting } from "./api/dataApi";
import { maybeMigrate } from "./utils/migrateData";
import type { Project, WorkMeta, PerlerPatternMeta } from "./types";
import "./App.css";

function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const toast = useToast();

  // ── Tab ──
  const [tab, setTab] = useState<"image" | "3d" | "perler">(() => {
    try {
      const v = localStorage.getItem("active_tab");
      if (v === "image" || v === "3d" || v === "perler") return v;
    } catch {}
    return "image";
  });

  // ── Sidebar ──
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Data ──
  const [dataLoaded, setDataLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => [
    { id: "default", name: "默认项目", thumbnail: "", imageCount: 0, createdAt: Date.now() },
  ]);
  const [activeProject, setActiveProject] = useState("default");
  const [works, setWorks] = useState<Record<string, WorkMeta[]>>({});
  const [perlerPatterns, setPerlerPatterns] = useState<Record<string, PerlerPatternMeta[]>>({});

  // ── 3D generation ──
  const {
    jobs: threeDJobs,
    generating: generating3D,
    startGeneration: start3DGeneration,
    cancelJob: cancel3DJob,
    clearJob: clear3DJob,
    clearAllJobs: clearAll3DJobs,
  } = use3DGeneration();

  // ── Data loading on mount ──
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try { await maybeMigrate(); } catch {}
      try {
        const savedActive = await fetchSetting("active_project");
        if (savedActive && !cancelled) setActiveProject(savedActive);
      } catch {}
      try {
        const savedTab = await fetchSetting("active_tab");
        if (savedTab && !cancelled && (savedTab === "image" || savedTab === "3d" || savedTab === "perler")) {
          setTab(savedTab);
        }
      } catch {}
      try {
        const allProjects = await fetchProjects();
        const allWorks: Record<string, WorkMeta[]> = {};
        const allPatterns: Record<string, PerlerPatternMeta[]> = {};
        for (const p of allProjects) {
          allWorks[p.id] = await fetchWorks(p.id);
          try {
            allPatterns[p.id] = await fetchPerlerPatterns(p.id);
          } catch { /* ignore */ }
        }
        if (cancelled) return;
        if (allProjects.length > 0) setProjects(allProjects);
        if (Object.keys(allWorks).length > 0) setWorks(allWorks);
        if (Object.keys(allPatterns).length > 0) setPerlerPatterns(allPatterns);
      } catch (err) {
        console.error("Failed to load data from API:", err);
      }
      if (!cancelled) setDataLoaded(true);
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  // ── Sync project thumbnails + imageCount from works ──
  useEffect(() => {
    setProjects((prev) =>
      prev.map((p) => {
        const ws = works[p.id] || [];
        const last = [...ws].reverse()[0];
        const thumb = last?.b64_json ? `data:image/png;base64,${last.b64_json}` : "";
        return { ...p, thumbnail: thumb, imageCount: ws.length };
      }),
    );
  }, [works]);

  // ── Persist active project + tab ──
  useEffect(() => {
    if (!dataLoaded) return;
    saveSetting("active_project", activeProject).catch(() => {});
  }, [activeProject, dataLoaded]);

  useEffect(() => {
    try { localStorage.setItem("active_tab", tab); } catch {}
    if (!dataLoaded) return;
    saveSetting("active_tab", tab).catch(() => {});
  }, [tab, dataLoaded]);

  // ── Persist project list changes ──
  useEffect(() => {
    if (!dataLoaded) return;
    for (const p of projects) {
      saveProject({
        id: p.id,
        name: p.name,
        image_count: p.imageCount,
        created_at: p.createdAt,
      }).catch(() => {});
    }
  }, [projects, dataLoaded]);

  // ── Project CRUD ──
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

  // ── Works mutation (called by ImageModule) ──
  const handleWorksChange = useCallback((newWorks: Record<string, WorkMeta[]>) => {
    setWorks(newWorks);
  }, []);

  // ── Perler pattern CRUD ──
  const handleSavePerlerPattern = useCallback(
    async (data: PerlerSaveData) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const meta: PerlerPatternMeta = {
        id,
        project_id: activeProject,
        name: data.name || "",
        image_base64: data.image_base64,
        grid_data: data.grid_data,
        grid_n: data.grid_n,
        grid_m: data.grid_m,
        pixelation_mode: data.pixelation_mode,
        color_system: data.color_system,
        bead_count: data.bead_count,
        color_counts: data.color_counts,
        created_at: now,
        updated_at: now,
      };
      try {
        await savePerlerPattern({
          id,
          project_id: activeProject,
          name: data.name,
          image_base64: data.image_base64,
          grid_data: data.grid_data,
          grid_n: data.grid_n,
          grid_m: data.grid_m,
          pixelation_mode: data.pixelation_mode,
          color_system: data.color_system,
          bead_count: data.bead_count,
          color_counts: data.color_counts,
        });
      } catch (err) {
        console.error("Failed to save perler pattern:", err);
        return;
      }
      setPerlerPatterns((prev) => ({
        ...prev,
        [activeProject]: [meta, ...(prev[activeProject] || [])],
      }));
    },
    [activeProject],
  );

  const handleDeletePerlerPattern = useCallback(
    async (id: string) => {
      removePerlerPattern(id).catch(() => {});
      setPerlerPatterns((prev) => ({
        ...prev,
        [activeProject]: (prev[activeProject] || []).filter((p) => p.id !== id),
      }));
    },
    [activeProject],
  );

  // ── Render ──
  return (
    <div className="app">
      <div className="bg-bubbles" aria-hidden="true">
        <span className="bubble bubble-1" />
        <span className="bubble bubble-2" />
        <span className="bubble bubble-3" />
        <span className="bubble bubble-4" />
        <span className="bubble bubble-5" />
        <span className="bubble bubble-6" />
        <span className="bubble bubble-7" />
        <span className="bubble bubble-8" />
      </div>

      <header className="app-header">
        <div className="header-left">
          <h1 className="logo">
            FORMU<span className="logo-sep"> </span>Studio
          </h1>
          <span className="logo-badge">beta</span>
        </div>
        <div
          className="toggle-group header-toggle-group"
          style={{ "--toggle-pos": tab === "image" ? "0" : tab === "3d" ? "1" : "2" } as React.CSSProperties}
        >
          <button className={`toggle-btn ${tab === "image" ? "active" : ""}`} onClick={() => setTab("image")}>
            图像生成
          </button>
          <button className={`toggle-btn ${tab === "3d" ? "active" : ""}`} onClick={() => setTab("3d")}>
            3D 模型生成
          </button>
          <button className={`toggle-btn ${tab === "perler" ? "active" : ""}`} onClick={() => setTab("perler")}>
            拼豆图纸
          </button>
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

        <div className="content-area" style={{ display: tab === "image" ? "flex" : "none" }}>
          <ImageModule
            works={works}
            activeProject={activeProject}
            onWorksChange={handleWorksChange}
            toast={toast}
          />
        </div>
        <div className="content-area" style={{ display: tab === "3d" ? "flex" : "none" }}>
          <ThreeDModule
            works={works}
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            jobs={threeDJobs}
            generating={generating3D}
            onStartGeneration={start3DGeneration}
            onCancelJob={cancel3DJob}
            onClearJob={clear3DJob}
            onClearAllJobs={clearAll3DJobs}
          />
        </div>
        <div className="content-area" style={{ display: tab === "perler" ? "flex" : "none" }}>
          <PerlerModule
            works={works}
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            savedPatterns={perlerPatterns[activeProject] || []}
            onSavePattern={handleSavePerlerPattern}
            onDeletePattern={handleDeletePerlerPattern}
          />
        </div>
      </div>

      <Toast messages={toast.messages} onDone={toast.dismiss} />
    </div>
  );
}

export default App;
