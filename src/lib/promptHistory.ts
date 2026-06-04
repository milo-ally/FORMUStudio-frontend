export interface PromptEntry {
  prompt: string;
  count: number;
  lastUsed: number;
}

const STORAGE_KEY = "formu_prompt_history";
const MAX_ENTRIES = 50;

function load(): PromptEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(entries: PromptEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return;

  const entries = load();
  const existing = entries.find((e) => e.prompt === trimmed);
  if (existing) {
    existing.count++;
    existing.lastUsed = Date.now();
  } else {
    entries.push({ prompt: trimmed, count: 1, lastUsed: Date.now() });
  }

  // Keep top MAX_ENTRIES by frequency then recency
  entries.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  save(entries.slice(0, MAX_ENTRIES));
}

export function getHistory(): PromptEntry[] {
  return load();
}
