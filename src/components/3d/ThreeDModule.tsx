import { useState, useCallback, useRef, useEffect } from "react";
import { ThreeDHero } from "./ThreeDHero";
import { WorkPicker } from "../shared/WorkPicker";
import { ThreeDJobArea } from "./ThreeDJobArea";
import { fetch3DModels } from "../../api/api";
import type { ImageSourceType } from "./ThreeDHero";
import type { Project, WorkMeta } from "../../types";
import type { JobEntry } from "./use3DGeneration";
import "./ThreeDModule.css";

interface ThreeDModuleProps {
  works: Record<string, WorkMeta[]>;
  projects: Project[];
  activeProject: string;
  onSelectProject: (id: string) => void;
  jobs: JobEntry[];
  generating: boolean;
  onStartGeneration: (prompt: string, opts?: { model?: string; image_url?: string }) => void;
  onCancelJob: (jobId: string) => void;
  onClearJob: (jobId: string) => void;
  onClearAllJobs: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ThreeDModule({
  works,
  projects,
  activeProject,
  onSelectProject,
  jobs,
  generating,
  onStartGeneration,
  onCancelJob,
  onClearJob,
  onClearAllJobs,
}: ThreeDModuleProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("hunyuan-3d-3.1");
  const [imageSourceType, setImageSourceType] = useState<ImageSourceType>("text");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceConfirmed, setReferenceConfirmed] = useState(false);
  const [selectedWork, setSelectedWork] = useState<{
    projectId: string;
    workId: string;
    b64: string;
  } | null>(null);

  const submittingRef = useRef(false);

  const [models, setModels] = useState<string[]>(["hunyuan-3d-3.1"]);

  useEffect(() => {
    fetch3DModels()
      .then((list) => {
        if (list.length > 0) {
          setModels(list);
          if (!list.includes(model)) setModel(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleCancelAll = useCallback(() => {
    for (const entry of jobs) {
      if (entry.job.status === "WAIT" || entry.job.status === "RUN") {
        onCancelJob(entry.job.job_id);
      }
    }
  }, [jobs, onCancelJob]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;

    if (imageSourceType === "text" && !prompt.trim()) return;
    if (imageSourceType === "work" && !selectedWork?.b64) return;
    if (imageSourceType === "upload" && !(referenceFile && referenceConfirmed)) return;

    submittingRef.current = true;

    try {
      const promptText = prompt.trim() || "3D model";
      let opts: { model?: string; image_url?: string } = { model };

      if (imageSourceType === "work" && selectedWork?.b64) {
        opts.image_url = `data:image/png;base64,${selectedWork.b64}`;
      } else if (imageSourceType === "upload" && referenceFile) {
        opts.image_url = await fileToBase64(referenceFile);
      }

      onStartGeneration(promptText, opts);
      setPrompt("");
    } finally {
      submittingRef.current = false;
    }
  }, [prompt, model, imageSourceType, selectedWork, referenceFile, referenceConfirmed, onStartGeneration]);

  const handleSelectWork = useCallback(
    (projectId: string, workId: string, b64: string) => {
      if (!b64) {
        setSelectedWork(null);
      } else {
        setSelectedWork({ projectId, workId, b64 });
      }
    },
    [],
  );

  const handleFileChange = useCallback((file: File | null) => {
    setReferenceFile(file);
    setReferenceConfirmed(false);
  }, []);

  return (
    <div className="threed-module">
      <ThreeDHero
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        generating={generating}
        onCancel={handleCancelAll}
        model={model}
        models={models}
        onModelChange={setModel}
        imageSourceType={imageSourceType}
        onImageSourceTypeChange={setImageSourceType}
        referenceFile={referenceFile}
        onReferenceFileChange={handleFileChange}
        referenceConfirmed={referenceConfirmed}
        onReferenceConfirm={() => setReferenceConfirmed((p) => !p)}
        selectedWorkUrl={
          selectedWork?.b64
            ? `data:image/png;base64,${selectedWork.b64}`
            : ""
        }
      />

      {imageSourceType === "work" && (
        <WorkPicker
          works={works}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={onSelectProject}
          selected={
            selectedWork
              ? { projectId: selectedWork.projectId, workId: selectedWork.workId }
              : null
          }
          onSelect={handleSelectWork}
        />
      )}

      {jobs.length > 0 && (
        <ThreeDJobArea
          jobs={jobs}
          onCancelJob={onCancelJob}
          onClearJob={onClearJob}
          onClearAllJobs={onClearAllJobs}
        />
      )}
    </div>
  );
}
