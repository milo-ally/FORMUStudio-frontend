import type { Project, WorkMeta } from "../types";

interface WorkPickerProps {
  works: Record<string, WorkMeta[]>;
  projects: Project[];
  activeProject: string;
  onSelectProject: (id: string) => void;
  selected: { projectId: string; workId: string } | null;
  onSelect: (projectId: string, workId: string, b64: string) => void;
}

export function WorkPicker({
  works,
  projects,
  activeProject,
  onSelectProject,
  selected,
  onSelect,
}: WorkPickerProps) {
  const allWorks = works[activeProject] || [];
  const successWorks = allWorks.filter((w) => w.status === "success");

  return (
    <section className="workpicker-section">
      <div className="workpicker-inner">
        <h3 className="workpicker-title">选择参考作品</h3>

        <div className="workpicker-projects">
          {projects.map((p) => {
            const count = (works[p.id] || []).filter((w) => w.status === "success").length;
            return (
              <button
                key={p.id}
                className={`workpicker-project-tag ${p.id === activeProject ? "active" : ""}`}
                onClick={() => onSelectProject(p.id)}
              >
                {p.name}
                <span className="workpicker-project-count">{count}</span>
              </button>
            );
          })}
        </div>

        {successWorks.length === 0 ? (
          <div className="workpicker-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>此项目暂无作品</p>
            <span>先在图像生成模块中生成并提升作品</span>
          </div>
        ) : (
          <div className="workpicker-grid">
            {successWorks.map((w) => {
              const isSelected = selected?.projectId === activeProject && selected?.workId === w.id;
              const src = w.b64_json
                ? `data:image/png;base64,${w.b64_json}`
                : "";
              return (
                <button
                  key={w.id}
                  className={`workpicker-card ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    onSelect(
                      activeProject,
                      w.id,
                      isSelected ? "" : (w.b64_json || ""),
                    )
                  }
                >
                  {src ? (
                    <img src={src} alt="" />
                  ) : (
                    <div className="workpicker-card-placeholder" />
                  )}
                  {isSelected && (
                    <div className="workpicker-card-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
