import { useState, useRef, useEffect } from "react";
import type { Project } from "../../types";
import "./ProjectSidebar.css";

interface ProjectSidebarProps {
  projects: Project[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProjectSidebar({ projects, activeId, onSelect, onCreate, onDelete, onRename }: ProjectSidebarProps) {
  return (
    <>
      <div className="project-sidebar-header">
        <h3 className="project-sidebar-title">项目</h3>
        <button className="project-sidebar-add" onClick={onCreate} title="新建项目">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
      </div>
      <div className="project-list">
        {projects.map((p) => (
          <ProjectItem
            key={p.id}
            project={p}
            active={p.id === activeId}
            onSelect={() => onSelect(p.id)}
            onDelete={() => onDelete(p.id)}
            onRename={(name) => onRename(p.id, name)}
          />
        ))}
      </div>
    </>
  );
}

function ProjectItem({
  project,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  project: Project;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(trimmed);
    } else {
      setName(project.name);
    }
    setEditing(false);
  };

  return (
    <div className={`project-item ${active ? "active" : ""}`} onClick={onSelect}>
      <div className="project-thumb">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <div className="project-info">
        {editing ? (
          <input
            ref={inputRef}
            className="project-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setName(project.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="project-name" onDoubleClick={() => setEditing(true)}>
            {project.name}
          </span>
        )}
        <span className="project-count">{project.imageCount} 张</span>
      </div>
      <button
        className="project-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除项目"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </button>
    </div>
  );
}
