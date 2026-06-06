import type { PerlerPatternMeta, MappedPixel, PixelationMode, ColorSystem } from "../types";

const DATA_URL = "http://localhost:3001/api/data";

interface ApiProject {
  id: string;
  name: string;
  thumbnail: string;
  imageCount: number;
  createdAt: number;
}

interface ApiWork {
  id: string;
  status: "success";
  revised_prompt?: string;
  created_at: number;
  b64_json?: string;
}

interface ApiPresets {
  overrides: ApiPresetEntry[];
  customs: ApiPresetEntry[];
}

interface ApiPresetEntry {
  id: string;
  title: string;
  prompt: string;
  image_base64?: string;
  ratio?: string;
}

// ── Projects ──

export async function fetchProjects(): Promise<ApiProject[]> {
  const res = await fetch(`${DATA_URL}/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

export async function saveProject(project: {
  id: string;
  name: string;
  thumbnail_base64?: string;
  image_count?: number;
  created_at?: number;
}): Promise<void> {
  const res = await fetch(`${DATA_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`Failed to save project: ${res.status}`);
}

export async function removeProject(id: string): Promise<void> {
  const res = await fetch(`${DATA_URL}/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`);
}

// ── Works ──

export async function fetchWorks(projectId: string): Promise<ApiWork[]> {
  const res = await fetch(`${DATA_URL}/works?project_id=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Failed to fetch works: ${res.status}`);
  return res.json();
}

export async function saveWork(work: {
  id: string;
  project_id: string;
  image_base64?: string;
  revised_prompt?: string;
  created_at?: number;
}): Promise<void> {
  const res = await fetch(`${DATA_URL}/works`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(work),
  });
  if (!res.ok) throw new Error(`Failed to save work: ${res.status}`);
}

export async function removeWork(id: string): Promise<void> {
  const res = await fetch(`${DATA_URL}/works/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete work: ${res.status}`);
}

// ── Presets ──

export async function fetchPresets(): Promise<ApiPresets> {
  const res = await fetch(`${DATA_URL}/presets`);
  if (!res.ok) throw new Error(`Failed to fetch presets: ${res.status}`);
  return res.json();
}

export async function savePreset(preset: {
  id: string;
  title: string;
  prompt: string;
  image_base64?: string;
  ratio?: string;
  is_custom?: number;
  created_at?: number;
}): Promise<void> {
  const res = await fetch(`${DATA_URL}/presets/${encodeURIComponent(preset.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preset),
  });
  if (!res.ok) throw new Error(`Failed to save preset: ${res.status}`);
}

export async function removePreset(id: string): Promise<void> {
  const res = await fetch(`${DATA_URL}/presets/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete preset: ${res.status}`);
}

// ── Prompt History ──

interface PromptEntry { prompt: string; count: number; last_used: number }

export async function fetchPromptHistory(category = "image"): Promise<PromptEntry[]> {
  const res = await fetch(`${DATA_URL}/prompt-history?category=${encodeURIComponent(category)}`);
  if (!res.ok) throw new Error(`Failed to fetch prompt history: ${res.status}`);
  return res.json();
}

export async function addPromptEntry(prompt: string, category = "image"): Promise<void> {
  await fetch(`${DATA_URL}/prompt-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, category }),
  });
}

// ── Settings ──

export async function fetchSetting(key: string): Promise<string | null> {
  const res = await fetch(`${DATA_URL}/settings/${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.value || null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await fetch(`${DATA_URL}/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
}

// ── Perler Patterns ──

export interface PerlerPatternSaveData {
  id?: string;
  project_id: string;
  name?: string;
  image_base64?: string;
  grid_data: MappedPixel[][];
  grid_n: number;
  grid_m: number;
  pixelation_mode: PixelationMode;
  color_system: ColorSystem;
  bead_count: number;
  color_counts: Record<string, { count: number; color: string }>;
}

export async function fetchPerlerPatterns(projectId: string): Promise<PerlerPatternMeta[]> {
  const res = await fetch(`${DATA_URL}/perler-patterns?project_id=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Failed to fetch perler patterns: ${res.status}`);
  return res.json();
}

export async function savePerlerPattern(pattern: PerlerPatternSaveData): Promise<{ ok: boolean; id: string }> {
  const isNew = !pattern.id;
  const url = isNew
    ? `${DATA_URL}/perler-patterns`
    : `${DATA_URL}/perler-patterns/${encodeURIComponent(pattern.id!)}`;
  const res = await fetch(url, {
    method: isNew ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pattern),
  });
  if (!res.ok) throw new Error(`Failed to save perler pattern: ${res.status}`);
  return res.json();
}

export async function removePerlerPattern(id: string): Promise<void> {
  const res = await fetch(`${DATA_URL}/perler-patterns/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete perler pattern: ${res.status}`);
}
