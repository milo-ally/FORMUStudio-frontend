import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dirname, "..", "..", "data");
const DB_PATH = join(DATA_DIR, "user_data.db");

let db: Database;

export function getDb(): Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnail_base64 TEXT DEFAULT '',
      image_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      image_base64 TEXT DEFAULT '',
      revised_prompt TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      image_base64 TEXT DEFAULT '',
      ratio TEXT DEFAULT '1:1',
      is_custom INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_history (
      prompt TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'image',
      count INTEGER DEFAULT 1,
      last_used INTEGER NOT NULL,
      PRIMARY KEY (prompt, category)
    );

    CREATE TABLE IF NOT EXISTS perler_patterns (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      image_base64 TEXT DEFAULT '',
      grid_json TEXT NOT NULL DEFAULT '[]',
      grid_n INTEGER NOT NULL DEFAULT 50,
      grid_m INTEGER NOT NULL DEFAULT 50,
      pixelation_mode TEXT NOT NULL DEFAULT 'dominant',
      color_system TEXT NOT NULL DEFAULT 'MARD',
      bead_count INTEGER DEFAULT 0,
      color_counts_json TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_works_project ON works(project_id);
    CREATE INDEX IF NOT EXISTS idx_presets_custom ON presets(is_custom);
    CREATE INDEX IF NOT EXISTS idx_perler_patterns_project ON perler_patterns(project_id);
  `);

  // Migrate old prompt_history table that lacks the category column
  const cols = db.query("PRAGMA table_info(prompt_history)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "category")) {
    db.exec(`
      CREATE TABLE prompt_history_new (
        prompt TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'image',
        count INTEGER DEFAULT 1,
        last_used INTEGER NOT NULL,
        PRIMARY KEY (prompt, category)
      );
      INSERT INTO prompt_history_new (prompt, category, count, last_used)
        SELECT prompt, 'image', count, last_used FROM prompt_history;
      DROP TABLE prompt_history;
      ALTER TABLE prompt_history_new RENAME TO prompt_history;
    `);
  }
}

// ── Projects ──

export interface ProjectRow {
  id: string;
  name: string;
  thumbnail_base64: string;
  image_count: number;
  created_at: number;
}

export function listProjects(): ProjectRow[] {
  return getDb()
    .query("SELECT * FROM projects ORDER BY created_at DESC")
    .all() as ProjectRow[];
}

export function insertProject(p: ProjectRow) {
  getDb().run(
    `INSERT INTO projects (id, name, thumbnail_base64, image_count, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       thumbnail_base64 = COALESCE(NULLIF(excluded.thumbnail_base64, ''), thumbnail_base64),
       image_count = excluded.image_count`,
    [p.id, p.name, p.thumbnail_base64, p.image_count, p.created_at],
  );
}

export function deleteProject(id: string) {
  getDb().run("DELETE FROM projects WHERE id = ?", [id]);
}

// ── Works ──

export interface WorkRow {
  id: string;
  project_id: string;
  image_base64: string;
  revised_prompt: string;
  created_at: number;
}

export function listWorks(projectId: string): WorkRow[] {
  return getDb()
    .query("SELECT * FROM works WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId) as WorkRow[];
}

export function insertWork(w: WorkRow) {
  getDb().run(
    "INSERT INTO works (id, project_id, image_base64, revised_prompt, created_at) VALUES (?, ?, ?, ?, ?)",
    [w.id, w.project_id, w.image_base64, w.revised_prompt, w.created_at],
  );
}

export function deleteWork(id: string) {
  getDb().run("DELETE FROM works WHERE id = ?", [id]);
}

// ── Presets ──

export interface PresetRow {
  id: string;
  title: string;
  prompt: string;
  image_base64: string;
  ratio: string;
  is_custom: number;
  created_at: number;
}

export function listPresets(): PresetRow[] {
  return getDb()
    .query("SELECT * FROM presets ORDER BY is_custom ASC, created_at ASC")
    .all() as PresetRow[];
}

export function upsertPreset(p: PresetRow) {
  getDb().run(
    `INSERT INTO presets (id, title, prompt, image_base64, ratio, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       prompt = excluded.prompt,
       image_base64 = COALESCE(NULLIF(excluded.image_base64, ''), image_base64),
       ratio = excluded.ratio,
       is_custom = excluded.is_custom`,
    [p.id, p.title, p.prompt, p.image_base64, p.ratio, p.is_custom, p.created_at],
  );
}

export function deletePreset(id: string) {
  getDb().run("DELETE FROM presets WHERE id = ?", [id]);
}

export function getPreset(id: string): PresetRow | null {
  return getDb()
    .query("SELECT * FROM presets WHERE id = ?")
    .get(id) as PresetRow | null;
}

// ── Prompt History ──

export interface PromptHistoryRow {
  prompt: string;
  count: number;
  last_used: number;
}

export function listPromptHistory(category: string): PromptHistoryRow[] {
  return getDb()
    .query("SELECT * FROM prompt_history WHERE category = ? ORDER BY count DESC, last_used DESC LIMIT 50")
    .all(category) as PromptHistoryRow[];
}

export function upsertPrompt(prompt: string, category: string) {
  getDb().run(
    `INSERT INTO prompt_history (prompt, category, count, last_used) VALUES (?, ?, 1, ?)
     ON CONFLICT(prompt, category) DO UPDATE SET
       count = count + 1,
       last_used = excluded.last_used`,
    [prompt, category, Date.now()],
  );
}

// ── Settings ──

export function getSetting(key: string): string | null {
  const row = getDb()
    .query("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

// ── Perler Patterns ──

export interface PerlerPatternRow {
  id: string;
  project_id: string;
  name: string;
  image_base64: string;
  grid_json: string;
  grid_n: number;
  grid_m: number;
  pixelation_mode: string;
  color_system: string;
  bead_count: number;
  color_counts_json: string;
  created_at: number;
  updated_at: number;
}

export function listPerlerPatterns(projectId: string): PerlerPatternRow[] {
  return getDb()
    .query("SELECT * FROM perler_patterns WHERE project_id = ? ORDER BY updated_at DESC")
    .all(projectId) as PerlerPatternRow[];
}

export function insertPerlerPattern(p: PerlerPatternRow) {
  getDb().run(
    `INSERT INTO perler_patterns
     (id, project_id, name, image_base64, grid_json,
      grid_n, grid_m, pixelation_mode, color_system, bead_count,
      color_counts_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.project_id, p.name, p.image_base64,
     p.grid_json, p.grid_n, p.grid_m, p.pixelation_mode, p.color_system,
     p.bead_count, p.color_counts_json, p.created_at, p.updated_at],
  );
}

export function updatePerlerPattern(p: PerlerPatternRow) {
  getDb().run(
    `UPDATE perler_patterns SET
       name = ?, image_base64 = ?, grid_json = ?,
       grid_n = ?, grid_m = ?, pixelation_mode = ?, color_system = ?,
       bead_count = ?, color_counts_json = ?, updated_at = ?
     WHERE id = ?`,
    [p.name, p.image_base64, p.grid_json, p.grid_n, p.grid_m,
     p.pixelation_mode, p.color_system, p.bead_count,
     p.color_counts_json, p.updated_at, p.id],
  );
}

export function deletePerlerPattern(id: string) {
  getDb().run("DELETE FROM perler_patterns WHERE id = ?", [id]);
}

export function getPerlerPattern(id: string): PerlerPatternRow | null {
  return getDb()
    .query("SELECT * FROM perler_patterns WHERE id = ?")
    .get(id) as PerlerPatternRow | null;
}
