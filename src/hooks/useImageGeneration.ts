import {
  createImageGenerationTask,
  createImageEditTask,
  fetchImageTasks,
} from "../lib/api";
import { useState, useCallback, useRef } from "react";
import type { ImageTask, StoredImage } from "../types";

export function useImageGeneration() {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLoadingImages = useCallback(
    (ids: string[]) => {
      const loading: StoredImage[] = ids.map((id) => ({
        id,
        status: "loading",
      }));
      setImages((prev) => [...prev, ...loading]);
    },
    [],
  );

  const updateImageFromTask = useCallback(
    (task: ImageTask) => {
      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== task.id) return img;
          if (task.status === "success" && task.data?.[0]) {
            return {
              ...img,
              status: "success",
              b64_json: task.data[0].b64_json,
              url: task.data[0].url,
              revised_prompt: task.data[0].revised_prompt,
              elapsed_secs: task.elapsed_secs,
            };
          }
          if (task.status === "error") {
            return { ...img, status: "error", error: task.error };
          }
          return {
            ...img,
            status: task.status === "running" ? "loading" : "loading",
            progress: task.progress,
            elapsed_secs: task.elapsed_secs,
          };
        }),
      );
    },
    [],
  );

  const startGeneration = useCallback(
    async (
      prompt: string,
      mode: "generate" | "edit",
      opts: {
        count?: number;
        model?: string;
        size?: string;
        quality?: string;
        referenceFiles?: File[];
      } = {},
    ) => {
      const { count = 1, model = "gpt-image-2", size = "1024x1024", quality = "auto", referenceFiles } = opts;

      const taskIds = Array.from({ length: count }, () => crypto.randomUUID());
      addLoadingImages(taskIds);

      setGenerating(true);

      const tasks: Promise<ImageTask>[] = taskIds.map((id) =>
        mode === "edit" && referenceFiles?.length
          ? createImageEditTask(id, referenceFiles, prompt, model, size, quality)
          : createImageGenerationTask(id, prompt, model, size, quality),
      );

      const created = await Promise.all(tasks);

      // 轮询
      const poll = async () => {
        const { items, missing_ids } = await fetchImageTasks(created.map((t) => t.id));
        const finished = new Set(["success", "error"]);

        for (const task of items) {
          updateImageFromTask(task);
        }

        const allDone = created.every(
          (t) => finished.has(items.find((i) => i.id === t.id)?.status ?? ""),
        );

        if (!allDone && missing_ids.length === 0) {
          pollingRef.current = setTimeout(poll, 2000);
        } else {
          setGenerating(false);
        }
      };

      poll();
    },
    [addLoadingImages, updateImageFromTask],
  );

  const clearImages = useCallback(() => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    setImages([]);
    setGenerating(false);
  }, []);

  return { images, generating, startGeneration, clearImages };
}
