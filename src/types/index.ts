// 图片任务状态：排队 → 运行中 → 成功/失败
export type ImageTaskStatus = "queued" | "running" | "success" | "error";

export type ImageMode = "generate" | "edit";

export interface ImageData {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

export interface ImageTask {
  id: string;
  status: ImageTaskStatus;
  mode: ImageMode;
  model: string;
  progress?: string;
  elapsed_secs?: number;
  duration_ms?: number;
  data?: ImageData[];
  error?: string;
}

export interface ImageTaskListResponse {
  items: ImageTask[];
  missing_ids: string[];
}

export interface StoredImage {
  id: string;
  status: "loading" | "success" | "error";
  error?: string;
  progress?: string;
  elapsed_secs?: number;
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

export interface GenerationRequest {
  client_task_id: string;
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  mode: ImageMode;
  referenceFiles?: File[];
}

export type ImageRatio = "1:1" | "4:3" | "3:2" | "16:9" | "9:16" | "2:3" | "3:4";

export const RATIO_DIMENSIONS: Record<ImageRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1152, height: 896 },
  "3:2": { width: 1216, height: 832 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "2:3": { width: 832, height: 1216 },
  "3:4": { width: 896, height: 1152 },
};

export interface Project {
  id: string;
  name: string;
  thumbnail: string;
  imageCount: number;
  createdAt: number;
}

/** Work metadata stored in SQLite. The image base64 may be populated at runtime. */
export interface WorkMeta {
  id: string;
  status: "success";
  revised_prompt?: string;
  created_at: number;
  b64_json?: string;
}

/** User override for a built-in preset. */
export interface PresetOverride {
  id: string;
  title?: string;
  prompt?: string;
}

/** Metadata for a user-created custom preset (image stored separately). */
export interface CustomPresetMeta {
  id: string;
  title: string;
  prompt: string;
  ratio?: string;
}

// ── 3D 模型生成 ──

export type ThreeDJobStatus = "WAIT" | "RUN" | "DONE" | "FAIL";

export interface ResultFile3D {
  type: string; // OBJ, FBX, MTL, IMAGE, POSTPROCESS_OBJ
  url: string;
}

export interface ThreeDJob {
  job_id: string;
  status: ThreeDJobStatus;
  result_files: ResultFile3D[];
  error_code: string;
  error_message: string;
}

// ── 拼豆模块 ──

export interface MappedPixel {
  key: string;
  color: string;
  isExternal?: boolean;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  key: string;
  hex: string;
  rgb: RgbColor;
}

export type PixelationMode = "dominant" | "average";

export type ColorSystem = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

export interface PerlerExportOptions {
  showGrid: boolean;
  gridInterval: number;
  showCoordinates: boolean;
  showCellNumbers: boolean;
  gridLineColor: string;
  includeStats: boolean;
  exportCsv: boolean;
}
