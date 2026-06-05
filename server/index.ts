import {
  type ProjectRow,
  type WorkRow,
  type PresetRow,
  listProjects,
  insertProject,
  deleteProject,
  listWorks,
  insertWork,
  deleteWork,
  listPresets,
  upsertPreset,
  deletePreset,
  getPreset,
  listPromptHistory,
  upsertPrompt,
  getSetting,
  setSetting,
} from "./db";

const PORT = 3001;

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseId(url: URL, segment: number): string {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[segment] || "";
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function cors(res: Response): Response {
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    try {
      // ── Projects ──
      if (path === "/api/data/projects" && method === "GET") {
        const rows = listProjects();
        const projects = rows.map((r) => ({
          id: r.id,
          name: r.name,
          thumbnail: r.thumbnail_base64
            ? `data:image/png;base64,${r.thumbnail_base64}`
            : "",
          imageCount: r.image_count,
          createdAt: r.created_at,
        }));
        return cors(json(projects));
      }

      if (path === "/api/data/projects" && method === "POST") {
        const body = await readBody(req);
        const row: ProjectRow = {
          id: (body.id as string) || crypto.randomUUID(),
          name: (body.name as string) || "未命名",
          thumbnail_base64: (body.thumbnail_base64 as string) || "",
          image_count: (body.image_count as number) || 0,
          created_at: (body.created_at as number) || Date.now(),
        };
        insertProject(row);
        return cors(json({ ok: true, id: row.id }));
      }

      if (path.startsWith("/api/data/projects/") && method === "DELETE") {
        const id = parseId(url, 3);
        deleteProject(id);
        return cors(json({ ok: true }));
      }

      // ── Works ──
      if (path === "/api/data/works" && method === "GET") {
        const projectId = url.searchParams.get("project_id") || "";
        const rows = listWorks(projectId);
        const works = rows.map((r) => ({
          id: r.id,
          status: "success" as const,
          revised_prompt: r.revised_prompt || undefined,
          created_at: r.created_at,
          b64_json: r.image_base64 || undefined,
        }));
        return cors(json(works));
      }

      if (path === "/api/data/works" && method === "POST") {
        const body = await readBody(req);
        const row: WorkRow = {
          id: (body.id as string) || crypto.randomUUID(),
          project_id: body.project_id as string,
          image_base64: (body.image_base64 as string) || "",
          revised_prompt: (body.revised_prompt as string) || "",
          created_at: (body.created_at as number) || Date.now(),
        };
        insertWork(row);
        return cors(json({ ok: true, id: row.id }));
      }

      if (path.startsWith("/api/data/works/") && method === "DELETE") {
        const id = parseId(url, 3);
        deleteWork(id);
        return cors(json({ ok: true }));
      }

      // ── Presets ──
      if (path === "/api/data/presets" && method === "GET") {
        const rows = listPresets();
        const overrides: Record<string, unknown>[] = [];
        const customs: Record<string, unknown>[] = [];
        for (const r of rows) {
          const obj = {
            id: r.id,
            title: r.title,
            prompt: r.prompt,
            image_base64: r.image_base64 || undefined,
            ratio: r.ratio || undefined,
          };
          if (r.is_custom) {
            customs.push(obj);
          } else {
            overrides.push(obj);
          }
        }
        return cors(json({ overrides, customs }));
      }

      if (path.startsWith("/api/data/presets/") && method === "PUT") {
        const id = parseId(url, 3);
        if (!id) return cors(json({ error: "id is required" }, 400));
        const body = await readBody(req);
        const existing = getPreset(id);
        const isCustom =
          body.is_custom !== undefined
            ? (body.is_custom as number)
            : existing?.is_custom ?? 0;
        const row: PresetRow = {
          id,
          title: (body.title as string) || "",
          prompt: (body.prompt as string) || "",
          image_base64: (body.image_base64 as string) || "",
          ratio: (body.ratio as string) || "1:1",
          is_custom: isCustom,
          created_at:
            (body.created_at as number) || existing?.created_at || Date.now(),
        };
        upsertPreset(row);
        return cors(json({ ok: true, id }));
      }

      if (path.startsWith("/api/data/presets/") && method === "DELETE") {
        const id = parseId(url, 3);
        deletePreset(id);
        return cors(json({ ok: true }));
      }

      // ── Prompt History ──
      if (path === "/api/data/prompt-history" && method === "GET") {
        const category = url.searchParams.get("category") || "image";
        return cors(json(listPromptHistory(category)));
      }

      if (path === "/api/data/prompt-history" && method === "POST") {
        const body = await readBody(req);
        const prompt = (body.prompt as string)?.trim();
        const category = (body.category as string) || "image";
        if (prompt) upsertPrompt(prompt, category);
        return cors(json({ ok: true }));
      }

      // ── Settings ──
      if (path.startsWith("/api/data/settings/") && method === "GET") {
        const key = parseId(url, 3);
        return cors(json({ key, value: getSetting(key) }));
      }

      if (path.startsWith("/api/data/settings/") && method === "PUT") {
        const key = parseId(url, 3);
        const body = await readBody(req);
        setSetting(key, (body.value as string) || "");
        return cors(json({ ok: true }));
      }

      return cors(json({ error: "not found" }, 404));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return cors(json({ error: message }, 500));
    }
  },
});

console.log(`📦 Data server running at http://localhost:${server.port}`);
