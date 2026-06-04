export interface PresetOverride {
  id: string;
  title?: string;
  prompt?: string;
}

const STORAGE_KEY = "formu_preset_overrides";

async function resolveDir(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  const parts = path.split("/").filter(Boolean);
  let current = root;
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create });
    } catch {
      if (!create) throw new Error(`Directory not found: ${path}`);
      throw new Error(`Cannot create directory: ${part}`);
    }
  }
  return current;
}

// ─── OPFS image storage ────────────────────────────────────────

export async function savePresetImage(presetId: string, b64: string): Promise<void> {
  const byteString = atob(b64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const dir = await resolveDir(`presets/${presetId}`, true);
  const fh = await dir.getFileHandle("image.png", { create: true });
  const writable = await fh.createWritable();
  await writable.write(ab);
  await writable.close();
}

export async function loadPresetImage(presetId: string): Promise<string | null> {
  try {
    const dir = await resolveDir(`presets/${presetId}`, false);
    const fh = await dir.getFileHandle("image.png");
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export async function deletePresetImage(presetId: string): Promise<void> {
  try {
    const dir = await resolveDir(`presets/${presetId}`, false);
    await dir.removeEntry("image.png");
  } catch {
    // Already gone
  }
}

// ─── localStorage overrides ─────────────────────────────────────

export function loadPresetOverrides(): Record<string, PresetOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function savePresetOverrides(overrides: Record<string, PresetOverride>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function savePresetOverride(override: PresetOverride) {
  const all = loadPresetOverrides();
  all[override.id] = override;
  savePresetOverrides(all);
}

export function deletePresetOverride(id: string) {
  const all = loadPresetOverrides();
  delete all[id];
  savePresetOverrides(all);
}

// ─── Custom presets (user-created, unlimited) ─────────────────────

export interface CustomPresetMeta {
  id: string;
  title: string;
  prompt: string;
  ratio?: string;
}

const CUSTOM_KEY = "formu_custom_presets";

export function loadCustomPresets(): CustomPresetMeta[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCustomPresets(list: CustomPresetMeta[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function addCustomPreset(preset: CustomPresetMeta) {
  const list = loadCustomPresets();
  list.push(preset);
  saveCustomPresets(list);
}

export function updateCustomPreset(id: string, updates: Partial<Pick<CustomPresetMeta, "title" | "prompt" | "ratio">>) {
  const list = loadCustomPresets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates };
  saveCustomPresets(list);
}

export function removeCustomPreset(id: string) {
  const list = loadCustomPresets().filter((p) => p.id !== id);
  saveCustomPresets(list);
}

