import axios from "axios";
import type { ImageTask, ImageTaskListResponse, ThreeDJob } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const AUTH_KEY = import.meta.env.VITE_AUTH_KEY || "dummy";

/**
 * 判断模型 ID 是否为生图模型。
 * 后期新增生图模型只需在此函数添加匹配规则即可。
 */
export function isImageModel(modelId: string): boolean {
  const IMAGE_MODEL_PATTERNS = [
    "image",      // gpt-image-2, gpt-image-1
    "dall",     // dall-e-2, dall-e-3
    // 后期新增示例: "flux", "midjourney", "sd", etc.
  ];
  const lower = modelId.toLowerCase();
  return IMAGE_MODEL_PATTERNS.some((p) => lower.includes(p));
}

/** 判断模型 ID 是否为 3D 生成模型 */
export function isThreeDModel(modelId: string): boolean {
  const MODEL_PATTERNS = ["3d", "hunyuan"];
  const lower = modelId.toLowerCase();
  return MODEL_PATTERNS.some((p) => lower.includes(p));
}


const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${AUTH_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 120_000,
});

// 文生图任务（异步）
export async function createImageGenerationTask(
  clientTaskId: string,
  prompt: string,
  model = "gpt-image-2",
  size = "1024x1024",
  quality = "auto",
): Promise<ImageTask> {
  const { data } = await http.post<ImageTask>("/api/image-tasks/generations", {
    client_task_id: clientTaskId,
    prompt,
    model,
    size,
    quality,
  });
  return data;
}

// 图生图任务（异步）
export async function createImageEditTask(
  clientTaskId: string,
  files: File | File[],
  prompt: string,
  model = "gpt-image-2",
  size = "1024x1024",
  quality = "auto",
): Promise<ImageTask> {
  const formData = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((f) => formData.append("image", f));
  formData.append("client_task_id", clientTaskId);
  formData.append("prompt", prompt);
  formData.append("model", model);
  formData.append("size", size);
  formData.append("quality", quality);

  const { data } = await http.post<ImageTask>("/api/image-tasks/edits", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// 轮询任务状态
export async function fetchImageTasks(ids: string[]): Promise<ImageTaskListResponse> {
  if (ids.length === 0) return { items: [], missing_ids: [] };
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", id));
  const { data } = await http.get<ImageTaskListResponse>(`/api/image-tasks?${params.toString()}`);
  return data;
}

// 超时续询
export async function resumeImagePoll(taskId: string, extraTimeoutSecs = 30): Promise<ImageTask> {
  const { data } = await http.post<ImageTask>(
    `/api/image-tasks/${encodeURIComponent(taskId)}/resume-poll`,
    { extra_timeout_secs: extraTimeoutSecs },
  );
  return data;
}

// 获取可用模型
export async function fetchModels(): Promise<string[]> {
  const { data } = await http.get<{ data: { id: string }[] }>("/v1/models");
  return (Array.isArray(data.data) ? data.data : [])
    .map((m: { id: string }) => m.id)
    .filter(isImageModel);
}

// ── 3D 模型生成 ──

/** 获取可用的 3D 模型列表 */
export async function fetch3DModels(): Promise<string[]> {
  const { data } = await http.get<{ data: { id: string }[] }>("/api/3d/models");
  return (Array.isArray(data.data) ? data.data : [])
    .map((m: { id: string }) => m.id)
    .filter(isThreeDModel);
}

/** 提交 3D 生成任务（文生3D / 图生3D） */
export async function submit3DGeneration(
  prompt: string,
  opts: { model?: string; image_url?: string } = {},
): Promise<{ job_id: string }> {
  const { data } = await http.post<{ job_id: string }>("/api/3d/submit", {
    prompt,
    model: opts.model || "3.0",
    image_url: opts.image_url || undefined,
  });
  return data;
}

/** 查询 3D 任务状态 */
export async function query3DJob(jobId: string): Promise<ThreeDJob> {
  const { data } = await http.post<ThreeDJob>("/api/3d/query", {
    job_id: jobId,
  });
  return data;
}

/** 格式转换（OBJ → STL / USDZ / MP4 / GIF） */
export async function convert3DFormat(
  fileUrl: string,
  format: string,
): Promise<{ result_url: string }> {
  const { data } = await http.post<{ result_url: string }>("/api/3d/convert", {
    file_url: fileUrl,
    format,
  });
  return data;
}
