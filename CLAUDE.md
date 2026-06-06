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

This is an AI image generation studio ("FORMU Studio") with a React 19 + TypeScript + Vite frontend. Three main modules (tabs): image generation, 3D model generation, and perler bead pattern generation. Two backend dependencies:

```
Browser (React)
  ├── fetch → localhost:3001 (Bun + SQLite)       Data persistence
  └── fetch → localhost:8000 (Python chatgpt2api)  AI image & 3D generation
```

### Two API layers

- **`src/api/api.ts`** — Calls the chatgpt2api backend (port 8000). Uses axios with Bearer auth. Endpoints: create image generation task, create edit task (multipart), poll task status, resume poll, list models (image + 3D), submit 3D generation, query 3D job, convert 3D format. Models are filtered by capability via `isImageModel()` / `isThreeDModel()`.
- **`src/api/dataApi.ts`** — Calls the Bun data server (port 3001) with plain `fetch`. CRUD for projects, works, presets, prompt history, settings, and perler patterns. The works store the full `b64_json` of generated images.

### Data server (`src/server/`)

A Bun HTTP server (`Bun.serve`) with raw SQLite queries (no ORM). Tables: `projects`, `works`, `presets`, `prompt_history`, `perler_patterns`, `settings`. The `db.ts` module lazily initializes the DB at `data/user_data.db` with WAL mode and foreign keys. All routes are under `/api/data/`.

### Module structure

All business logic is organized in `src/components/` by feature:

```
src/components/
  image/           Image generation module
    ├── ImageModule.tsx     Module orchestrator (extracted from App.tsx)
    ├── useImageGeneration.ts  Hook: task lifecycle, polling, crash recovery
    ├── presets.ts          Built-in presets + resolution logic
    ├── DraftArea.tsx/css   Draft card strip with loading animation
    ├── Gallery.tsx/css     Preset grid + works grid
    ├── Lightbox.tsx/css    Fullscreen image viewer
    └── PresetEditor.tsx/css  Preset CRUD modal
  3d/              3D generation module
    ├── use3DGeneration.ts  Hook: job submission, polling, recovery
    ├── ThreeDModule.tsx/css  Module orchestrator
    ├── ThreeDHero.tsx/css  Prompt card + image source toggle
    ├── ThreeDJobArea.tsx/css Job cards (status, preview, files, conversion)
    └── ModelViewer.tsx     Three.js OBJ viewer (lazy-loaded)
  perler/          Perler bead pattern module
    ├── usePerlerPattern.ts Hook: pixelation, editing, undo, export, persistence
    ├── PerlerModule.tsx/css  Module orchestrator
    ├── PerlerHero.tsx/css  Source picker + grid settings
    ├── PerlerPreview.tsx/css Canvas-based zoomable/editable grid
    ├── PerlerColorPanel.tsx/css Color swatches + stats table
    ├── PerlerExportModal.tsx/css Export settings modal
    ├── colorSystem.ts      292-color mapping (MARD/COCO/漫漫/盼盼/咪小窝)
    ├── editing.ts          Flood fill, color replace, single pixel paint
    ├── pixelation.ts       Oklab color distance, palette matching, grid calc
    ├── download.ts         PNG export + CSV export
    └── colorSystemMapping.json
  shared/          Shared UI components
    ├── PromptInput.tsx/css  Textarea with history suggestions + auto-resize
    ├── ProjectSidebar.tsx/css Project list with rename/delete
    ├── Select.tsx/css       Custom dropdown
    ├── Toast.tsx/css        Auto-dismissing toast notifications
    └── WorkPicker.tsx/css   Grid for selecting saved works as references
```

Each module has an `index.ts` barrel export. Shared components, hooks (`useTheme`, `useToast`), API clients, utilities, and types live at the `src/` top level.

### Image generation flow

`useImageGeneration` hook in `src/components/image/useImageGeneration.ts`:
1. Client generates task IDs, adds "loading" placeholders to state
2. Calls `createImageGenerationTask` or `createImageEditTask` (chatgpt2api)
3. Polls `/api/image-tasks?ids=` every 2 seconds until all tasks are `success` or `error`
4. Merges results (b64_json, revised_prompt) into state

### State management

All module-level state lives in the respective module component or hook. App-level state (projects, theme, tabs, toast) lives in `App.tsx` via `useState`/`useCallback`. No Redux, no React Context aside from small self-contained hooks (`useTheme`, `useToast`).

- **App.tsx** — Thin shell: header, tab routing, project CRUD, data loading, theme
- **ImageModule** — All image generation state + presets + lightbox (extracted from App.tsx)
- **ThreeDModule** — All 3D generation state + WorkPicker integration
- **PerlerModule** — All perler pattern state + canvas editing

### Preset system

Four built-in presets (3d, anime, cyberpunk, robot) defined in `src/components/image/presets.ts`. Users can:
- **Override** built-in presets (title, prompt, cover image)
- **Create custom** presets
- **Delete custom** or **reset** built-ins to defaults

`resolvePresets()` merges built-in defaults with user overrides and custom presets from the server. The resolved list drives the Gallery's style explorer. Preset thumbnail images live in `src/assets/`.

### Perler color system

5 bead color systems supported (MARD, COCO, 漫漫, 盼盼, 咪小窝) with 292 colors total. The pixelation algorithm uses Oklab color distance for perceptual accuracy. Two modes: "dominant" (most frequent exact color in grid cell) and "average" (mean color). Editing supports brush, flood-fill erase, color replace, and undo (50-frame history).

### Key types (`src/types/index.ts`)

`ImageTask` is the wire format from chatgpt2api (status lifecycle: queued → running → success/error). `StoredImage` is the client-side representation used in DraftArea (may be loading/success/error). `WorkMeta` is a persisted work in the gallery (always status "success" with b64_json). `ThreeDJob` represents a 3D generation task. `MappedPixel` is a single bead cell.

### Environment

Create `.env` with `VITE_API_BASE_URL` (chatgpt2api address) and `VITE_AUTH_KEY`. Both default to localhost:8000 and "dummy".
