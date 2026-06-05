# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Vite dev server on :5173
bun run dev:server       # Bun data server on :3001 (hot reload)
bun run dev:all          # Both servers concurrently
bun run build            # Type-check (tsc -b) + production build
bun run lint             # ESLint
```

There is no test suite.

## Architecture

This is an AI image generation studio ("FORMU Studio") with a React 19 + TypeScript + Vite frontend. It has two backend dependencies:

```
Browser (React)
  ├── fetch → localhost:3001 (Bun + SQLite)     Data persistence
  └── fetch → localhost:8000 (Python chatgpt2api)  AI image generation
```

### Two API layers

- **`src/lib/api.ts`** — Calls the chatgpt2api backend (port 8000) for image generation. Uses axios with Bearer auth. Five endpoints: create generation task, create edit task (multipart), poll task status, resume poll, and list models. Models are filtered to image-capable ones via `isImageModel()`.
- **`src/lib/dataApi.ts`** — Calls the Bun data server (port 3001) with plain `fetch`. CRUD for projects, works, presets, prompt history, and settings. The works store the full `b64_json` of generated images.

### Data server (`server/`)

A Bun HTTP server (`Bun.serve`) with raw SQLite queries (no ORM). Tables: `projects`, `works`, `presets`, `prompt_history`, `settings`. The `db.ts` module lazily initializes the DB at `data/user_data.db` with WAL mode and foreign keys. All routes are under `/api/data/`.

### Image generation flow

`useImageGeneration` hook in `src/hooks/useImageGeneration.ts`:
1. Client generates task IDs, adds "loading" placeholders to state
2. Calls `createImageGenerationTask` or `createImageEditTask` (chatgpt2api)
3. Polls `/api/image-tasks?ids=` every 2 seconds until all tasks are `success` or `error`
4. `updateImageFromTask` merges results (b64_json, revised_prompt) into state

### State management

All app state lives in `App.tsx` via `useState`/`useCallback`. No Redux, no React Context aside from small self-contained hooks (`useTheme`, `useToast`). The app is a single-page layout with:

- **Header** — logo, sidebar toggle, theme toggle
- **ProjectSidebar** — project CRUD (create, rename, delete, select)
- **PromptInput + settings** — text prompt, mode toggle (generate/edit), model/ratio/quality selects, reference image upload for edits
- **DraftArea** — shows in-progress and completed generations; promote to gallery, discard, use-as-reference, file import
- **Gallery** — preset style picker + finalized works by project, with lightbox preview

### Preset system

Four built-in presets (3d, anime, cyberpunk, robot) defined in `src/data/presets.ts`. Users can:
- **Override** built-in presets (title, prompt, cover image)
- **Create custom** presets
- **Delete custom** or **reset** built-ins to defaults

`resolvePresets()` merges built-in defaults with user overrides and custom presets from the server. The resolved list drives the Gallery's style explorer.

### Key types (`src/types/index.ts`)

`ImageTask` is the wire format from chatgpt2api (status lifecycle: queued → running → success/error). `StoredImage` is the client-side representation used in DraftArea (may be loading/success/error). `WorkMeta` is a persisted work in the gallery (always status "success" with b64_json).

### Environment

Create `.env` with `VITE_API_BASE_URL` (chatgpt2api address) and `VITE_AUTH_KEY`. Both default to localhost:8000 and "dummy".
