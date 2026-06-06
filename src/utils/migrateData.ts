import { loadWorkImage } from "./workFilesystem";
import { loadPresetImage, loadPresetOverrides, loadCustomPresets } from "./presetStorage";
import { fetchProjects, saveProject, saveWork, savePreset, addPromptEntry, saveSetting } from "../api/dataApi";

interface LegacyProject {
  id: string;
  name: string;
  thumbnail?: string;
  imageCount?: number;
  createdAt: number;
}

interface LegacyWorkMeta {
  id: string;
  status: "success";
  revised_prompt?: string;
  created_at: number;
}

/** Check whether migration is needed and run it if so. */
export async function maybeMigrate(): Promise<boolean> {
  try {
    // If server already has projects, assume migration is done
    const existing = await fetchProjects();
    if (existing.length > 0) return false;
  } catch {
    // Server unreachable — can't migrate
    return false;
  }

  // Read legacy data from localStorage
  let legacyProjects: LegacyProject[] = [];
  let legacyWorksMeta: Record<string, LegacyWorkMeta[]> = {};
  let legacyOverrides: Record<string, { id: string; title?: string; prompt?: string }> = {};
  let legacyCustoms: { id: string; title: string; prompt: string; ratio?: string }[] = [];

  try {
    const raw = localStorage.getItem("formu_projects");
    if (raw) legacyProjects = JSON.parse(raw);
  } catch {}
  try {
    const raw = localStorage.getItem("formu_works_meta");
    if (raw) legacyWorksMeta = JSON.parse(raw);
  } catch {}
  try {
    legacyOverrides = loadPresetOverrides();
  } catch {}
  try {
    legacyCustoms = loadCustomPresets();
  } catch {}

  if (legacyProjects.length === 0 && legacyCustoms.length === 0 && Object.keys(legacyOverrides).length === 0) {
    return false;
  }

  console.log("Migrating legacy data to SQLite...");

  // Migrate projects
  for (const p of legacyProjects) {
    await saveProject({
      id: p.id,
      name: p.name,
      image_count: p.imageCount || 0,
      created_at: p.createdAt,
    });
  }

  // Migrate works (images from OPFS)
  for (const [projectId, works] of Object.entries(legacyWorksMeta)) {
    for (const w of works) {
      let imageB64 = "";
      try {
        const blobUrl = await loadWorkImage(projectId, w.id);
        if (blobUrl) {
          imageB64 = await blobUrlToBase64(blobUrl);
          URL.revokeObjectURL(blobUrl);
        }
      } catch {}
      try {
        await saveWork({
          id: w.id,
          project_id: projectId,
          image_base64: imageB64,
          revised_prompt: w.revised_prompt,
          created_at: w.created_at,
        });
      } catch {}
    }
  }

  // Migrate preset overrides (default preset edits)
  for (const [id, ov] of Object.entries(legacyOverrides)) {
    let imageB64 = "";
    try {
      const blobUrl = await loadPresetImage(id);
      if (blobUrl) {
        imageB64 = await blobUrlToBase64(blobUrl);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {}
    try {
      await savePreset({
        id,
        title: ov.title || id,
        prompt: ov.prompt || "",
        image_base64: imageB64,
        is_custom: 0,
        created_at: Date.now(),
      });
    } catch {}
  }

  // Migrate custom presets
  for (const cp of legacyCustoms) {
    let imageB64 = "";
    try {
      const blobUrl = await loadPresetImage(cp.id);
      if (blobUrl) {
        imageB64 = await blobUrlToBase64(blobUrl);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {}
    try {
      await savePreset({
        id: cp.id,
        title: cp.title,
        prompt: cp.prompt,
        image_base64: imageB64,
        ratio: cp.ratio,
        is_custom: 1,
        created_at: Date.now(),
      });
    } catch {}
  }

  // Migrate prompt history
  try {
    const raw = localStorage.getItem("formu_prompt_history");
    if (raw) {
      const history: { prompt: string }[] = JSON.parse(raw);
      for (const h of history) {
        try { await addPromptEntry(h.prompt); } catch {}
      }
    }
  } catch {}

  // Migrate active project
  try {
    const active = localStorage.getItem("formu_active_project");
    if (active) await saveSetting("active_project", active);
  } catch {}

  console.log("Migration complete.");
  return true;
}

function blobUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1] || "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}
