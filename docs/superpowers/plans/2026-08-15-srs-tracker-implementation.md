# SRS Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, single-process Next.js tool that tracks any project's requirements, tasks, and free-form content as JSON files on disk, viewable and editable through a live-updating website.

**Architecture:** One Next.js (App Router) app. Server-side, Route Handlers and Server Components read/write a project's `.tracker/*.json` files directly (no database); a per-project `chokidar` watcher pushes change notifications to the browser over Server-Sent Events. Client-side, purpose-built pages (Overview, Requirements Explorer, Task Board, Documents) handle the interactions that are common to every project, while "sections" pages render a project-specific ordered list of typed content blocks — so a project's architecture/strategy/roadmap content can vary freely without code changes.

**Tech Stack:** Next.js 14 (App Router) + React 18 + TypeScript (strict), Tailwind CSS + `@tailwindcss/typography`, zod (validation), chokidar (file watching), `@dnd-kit/*` (task board drag-and-drop), `react-markdown` + `remark-gfm` (markdown rendering), `mermaid` (diagram blocks), `nanoid` (ID generation), Vitest (unit tests for server-side logic). Hand-rolled minimal UI primitives (no shadcn CLI dependency, no Radix) to keep the dependency surface small and the build fully deterministic — this is the one deliberate deviation from the spec's "shadcn/ui" mention, chosen because the CLI's registry-fetch step adds an external dependency this plan doesn't need; swapping in real shadcn components later is a drop-in change.

**Spec:** `docs/superpowers/specs/2026-08-15-srs-tracker-design.md`

## Global Constraints

- No database. JSON files under `<project-root>/.tracker/` are the only source of truth (spec §1, §3).
- Single process, local-first: one `npm run dev` / `npm run build && npm start` runs the whole tool (spec §3).
- The tracker's own project registry (list of `{ id, name, path }`) lives in the tracker repo's own `data/registry.json`, gitignored — never inside a tracked project (spec §4).
- Each tracked project's data lives in `<project-root>/.tracker/` (spec §4).
- Purpose-built pages (Overview, Requirements Explorer, Task Board, Documents) are hand-built components; Architecture/Strategy/Roadmap and any future project-specific page are data-driven "sections" pages made of typed content blocks (spec §5).
- The content block taxonomy is exactly these 14 types: `markdown`, `table`, `keyvalue`, `stat-grid`, `list`, `timeline`, `diagram`, `code`, `comparison`, `progress`, `callout`, `link-list`, `quote`, `image` (spec §6).
- Live updates are one-directional server→client via Server-Sent Events, not WebSocket — UI writes already go through normal PUT calls (spec §3).
- Concurrency: last-write-wins, no file locking — an accepted trade-off for a single-user local tool (spec §10).
- Every write to a `.tracker` JSON file is validated against its zod schema before hitting disk; a failed validation returns a clear error and never corrupts the file (spec §10).
- Path safety: data file reads/writes use a fixed filename allowlist (`ALLOWED_DATA_FILES`), never arbitrary path concatenation; doc file reads must resolve inside the project root and must be listed in that project's `documents.json` (spec §7, §8).
- No end-to-end/UI automated test suite for v1 — manual verification via `npm run dev` is the validation loop for pages and API wiring, matching the spec's "manual use is the validation loop" (spec §2). This plan still uses TDD (Vitest) for non-UI logic that isn't reasonably verified by hand: schema validation, filesystem safety, the project registry, and the file watcher.
- Package manager: npm.
- `docs/tracker-json-guide.md` is a required deliverable, not optional documentation (spec §9).

---

## File Structure

```
srs-tracker/
  package.json, tsconfig.json, next.config.js, tailwind.config.ts, postcss.config.js, vitest.config.ts
  .gitignore
  data/                              <- gitignored; registry.json lives here at runtime
  app/
    layout.tsx, globals.css, page.tsx                     <- root layout + project picker
    project/[id]/
      layout.tsx                                          <- server: loads meta.json, renders ProjectShell
      page.tsx                                             <- redirects to first page in the manifest
      overview/page.tsx
      requirements/page.tsx
      board/page.tsx
      documents/page.tsx
      [pageId]/page.tsx                                    <- generic "sections" page renderer
    api/
      projects/route.ts                                    <- GET list, POST add
      projects/[id]/data/[file]/route.ts                    <- GET/PUT a .tracker json file
      projects/[id]/doc/[...path]/route.ts                  <- GET a raw doc file's content
      projects/[id]/events/route.ts                         <- SSE stream
  lib/
    types.ts                          <- all shared TS types + ALLOWED_DATA_FILES
    server/
      registry.ts                     <- project registry CRUD
      trackerFs.ts                    <- safe .tracker file/doc I/O + scaffolding
      validation.ts                   <- zod schemas, one per file type
      watcher.ts                      <- chokidar singleton + SSE subscriber registry
    blocks/
      registry.tsx                    <- block type -> component map
  components/
    ProjectShell.tsx
    board/{TaskBoard,BoardColumn,TaskCard,NewTaskDialog}.tsx
    sections/BlockRenderer.tsx
    blocks/{Markdown,KeyValue,List,Callout,Quote,LinkList,Image,StatGrid,Table,Comparison,Progress,Timeline,Diagram,Code}BlockView.tsx
  hooks/
    useProjectEvents.tsx               <- ProjectEventsProvider, useProjectFileEvents
    useProjectData.ts                  <- fetch + live-refetch + save, keyed by .tracker file
  docs/
    tracker-json-guide.md              <- deliverable: schemas + block shapes + SRS-to-block mapping guide
    superpowers/{specs,plans}/...
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.gitignore`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `data/.gitkeep`

**Interfaces:**
- Produces: a buildable Next.js app skeleton every later task adds to.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "srs-tracker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "3.23.8",
    "chokidar": "3.6.0",
    "@dnd-kit/core": "6.1.0",
    "@dnd-kit/sortable": "8.0.0",
    "@dnd-kit/utilities": "3.2.2",
    "react-markdown": "9.0.1",
    "remark-gfm": "4.0.0",
    "mermaid": "11.3.0",
    "nanoid": "5.0.7"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.15",
    "@types/react": "18.3.5",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.10",
    "@tailwindcss/typography": "0.5.15",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.20",
    "vitest": "2.0.5"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [typography],
};
export default config;
```

- [ ] **Step 5: Write `postcss.config.js`**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules/
.next/
data/registry.json
next-env.d.ts
*.local
.env*.local
```

- [ ] **Step 8: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Write `app/layout.tsx`**

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "SRS Tracker" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Write a placeholder `app/page.tsx`** (replaced for real in Task 10)

```tsx
export default function HomePage() {
  return <main className="p-8">SRS Tracker scaffold OK.</main>;
}
```

- [ ] **Step 11: Create the `data/` directory placeholder**

Create an empty file `data/.gitkeep` so the directory exists in git even though `data/registry.json` itself is gitignored.

- [ ] **Step 12: Install dependencies and verify the build**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds with no errors (Next.js will auto-generate `next-env.d.ts`).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app"
```

---

## Task 2: Shared types and validation schemas

**Files:**
- Create: `lib/types.ts`
- Create: `lib/server/validation.ts`
- Test: `lib/server/validation.test.ts`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces: every type used by later tasks — `ProjectMeta`, `PageManifestEntry`, `PageType`, `Requirement`, `Task`, `TaskColumn`, `DocumentEntry`, `RegisteredProject`, `ContentBlock` (and its 14 member types), `ALLOWED_DATA_FILES`, `DataFileName`, `isDataFileName`. And `schemaForFile(file: DataFileName): ZodTypeAny`.

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export const ALLOWED_DATA_FILES = [
  "meta.json",
  "requirements.json",
  "tasks.json",
  "architecture.json",
  "strategy.json",
  "roadmap.json",
  "documents.json",
] as const;

export type DataFileName = (typeof ALLOWED_DATA_FILES)[number];

export function isDataFileName(value: string): value is DataFileName {
  return (ALLOWED_DATA_FILES as readonly string[]).includes(value);
}

export type PageType =
  | "overview"
  | "requirements-explorer"
  | "task-board"
  | "documents"
  | "sections";

export interface PageManifestEntry {
  id: string;
  type: PageType;
  source?: string;
  label?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description?: string;
  pages: PageManifestEntry[];
}

export interface Requirement {
  id: string;
  section: string;
  category: string;
  text: string;
  critical?: boolean;
  status?: "not-started" | "in-progress" | "done";
}

export type TaskColumn = "planning" | "implementation" | "testing" | "bugs" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  column: TaskColumn;
  requirementIds?: string[];
  priority?: "low" | "medium" | "high";
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentEntry {
  label: string;
  path: string;
}

export interface RegisteredProject {
  id: string;
  name: string;
  path: string;
}

export interface BlockBase {
  id: string;
  title?: string;
}

export interface TableCell {
  value: string;
  kind?: "text" | "badge" | "link" | "date" | "number";
  href?: string;
}

export interface MarkdownBlock extends BlockBase {
  type: "markdown";
  content: { text: string };
}

export interface TableBlock extends BlockBase {
  type: "table";
  content: { columns: string[]; rows: TableCell[][] };
}

export interface KeyValueBlock extends BlockBase {
  type: "keyvalue";
  content: { dense?: boolean; items: { label: string; value: string }[] };
}

export interface StatGridBlock extends BlockBase {
  type: "stat-grid";
  content: { stats: { label: string; value: string; sublabel?: string }[] };
}

export interface ListItem {
  text: string;
  icon?: string;
  status?: "none" | "done" | "warning" | "error";
}

export interface ListBlock extends BlockBase {
  type: "list";
  content: { ordered?: boolean; items: ListItem[] };
}

export interface TimelineEntry {
  title: string;
  description?: string;
  status?: "done" | "active" | "planned" | "blocked";
  date?: string;
}

export interface TimelineBlock extends BlockBase {
  type: "timeline";
  content: { entries: TimelineEntry[] };
}

export interface DiagramBlock extends BlockBase {
  type: "diagram";
  content: { mermaid: string };
}

export interface CodeBlock extends BlockBase {
  type: "code";
  content: { language: string; code: string };
}

export interface ComparisonCard {
  title: string;
  attributes: { label: string; value: string }[];
  recommended?: boolean;
}

export interface ComparisonBlock extends BlockBase {
  type: "comparison";
  content: { cards: ComparisonCard[] };
}

export interface ProgressBlock extends BlockBase {
  type: "progress";
  content: { items: { label: string; percent: number }[] };
}

export interface CalloutBlock extends BlockBase {
  type: "callout";
  content: { tone: "info" | "warning" | "danger" | "success"; text: string };
}

export interface LinkListBlock extends BlockBase {
  type: "link-list";
  content: { links: { label: string; href: string; description?: string }[] };
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  content: { text: string; attribution?: string };
}

export interface ImageBlock extends BlockBase {
  type: "image";
  content: { src: string; alt: string; caption?: string };
}

export type ContentBlock =
  | MarkdownBlock
  | TableBlock
  | KeyValueBlock
  | StatGridBlock
  | ListBlock
  | TimelineBlock
  | DiagramBlock
  | CodeBlock
  | ComparisonBlock
  | ProgressBlock
  | CalloutBlock
  | LinkListBlock
  | QuoteBlock
  | ImageBlock;

export type BlockType = ContentBlock["type"];
```

- [ ] **Step 2: Write `lib/server/validation.ts`**

```ts
import { z } from "zod";
import { type DataFileName } from "@/lib/types";

export const pageManifestEntrySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["overview", "requirements-explorer", "task-board", "documents", "sections"]),
  source: z.string().optional(),
  label: z.string().optional(),
});

export const projectMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  pages: z.array(pageManifestEntrySchema),
});

export const requirementSchema = z.object({
  id: z.string().min(1),
  section: z.string(),
  category: z.string(),
  text: z.string().min(1),
  critical: z.boolean().optional(),
  status: z.enum(["not-started", "in-progress", "done"]).optional(),
});
export const requirementsFileSchema = z.array(requirementSchema);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  column: z.enum(["planning", "implementation", "testing", "bugs", "done"]),
  requirementIds: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const tasksFileSchema = z.array(taskSchema);

export const documentEntrySchema = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
});
export const documentsFileSchema = z.array(documentEntrySchema);

const tableCellSchema = z.object({
  value: z.string(),
  kind: z.enum(["text", "badge", "link", "date", "number"]).optional(),
  href: z.string().optional(),
});

const blockBase = { id: z.string().min(1), title: z.string().optional() };

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("markdown"), content: z.object({ text: z.string() }) }),
  z.object({
    ...blockBase,
    type: z.literal("table"),
    content: z.object({ columns: z.array(z.string()), rows: z.array(z.array(tableCellSchema)) }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("keyvalue"),
    content: z.object({
      dense: z.boolean().optional(),
      items: z.array(z.object({ label: z.string(), value: z.string() })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("stat-grid"),
    content: z.object({
      stats: z.array(
        z.object({ label: z.string(), value: z.string(), sublabel: z.string().optional() })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("list"),
    content: z.object({
      ordered: z.boolean().optional(),
      items: z.array(
        z.object({
          text: z.string(),
          icon: z.string().optional(),
          status: z.enum(["none", "done", "warning", "error"]).optional(),
        })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("timeline"),
    content: z.object({
      entries: z.array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          status: z.enum(["done", "active", "planned", "blocked"]).optional(),
          date: z.string().optional(),
        })
      ),
    }),
  }),
  z.object({ ...blockBase, type: z.literal("diagram"), content: z.object({ mermaid: z.string() }) }),
  z.object({
    ...blockBase,
    type: z.literal("code"),
    content: z.object({ language: z.string(), code: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("comparison"),
    content: z.object({
      cards: z.array(
        z.object({
          title: z.string(),
          attributes: z.array(z.object({ label: z.string(), value: z.string() })),
          recommended: z.boolean().optional(),
        })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("progress"),
    content: z.object({
      items: z.array(z.object({ label: z.string(), percent: z.number().min(0).max(100) })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("callout"),
    content: z.object({ tone: z.enum(["info", "warning", "danger", "success"]), text: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("link-list"),
    content: z.object({
      links: z.array(z.object({ label: z.string(), href: z.string(), description: z.string().optional() })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("quote"),
    content: z.object({ text: z.string(), attribution: z.string().optional() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("image"),
    content: z.object({ src: z.string(), alt: z.string(), caption: z.string().optional() }),
  }),
]);
export const sectionsFileSchema = z.array(contentBlockSchema);

export function schemaForFile(file: DataFileName) {
  switch (file) {
    case "meta.json":
      return projectMetaSchema;
    case "requirements.json":
      return requirementsFileSchema;
    case "tasks.json":
      return tasksFileSchema;
    case "documents.json":
      return documentsFileSchema;
    case "architecture.json":
    case "strategy.json":
    case "roadmap.json":
      return sectionsFileSchema;
    default: {
      const exhaustive: never = file;
      throw new Error(`No schema for file: ${exhaustive}`);
    }
  }
}
```

- [ ] **Step 3: Write `lib/server/validation.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { requirementsFileSchema, tasksFileSchema, contentBlockSchema, schemaForFile } from "./validation";

describe("requirementsFileSchema", () => {
  it("accepts a valid requirement list", () => {
    const result = requirementsFileSchema.safeParse([
      { id: "DC-1", section: "2.4", category: "Constraint", text: "Must work.", critical: true },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a requirement missing required fields", () => {
    const result = requirementsFileSchema.safeParse([{ id: "DC-1" }]);
    expect(result.success).toBe(false);
  });
});

describe("contentBlockSchema", () => {
  it("accepts a valid table block", () => {
    const result = contentBlockSchema.safeParse({
      id: "tech-stack",
      type: "table",
      content: { columns: ["Layer", "Choice"], rows: [[{ value: "Backend" }, { value: "Next.js" }]] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a block with an unknown type", () => {
    const result = contentBlockSchema.safeParse({ id: "x", type: "not-a-type", content: {} });
    expect(result.success).toBe(false);
  });
});

describe("schemaForFile", () => {
  it("maps tasks.json to the tasks schema", () => {
    expect(schemaForFile("tasks.json")).toBe(tasksFileSchema);
  });

  it("maps architecture.json to the sections schema", () => {
    expect(schemaForFile("architecture.json")).toBe(schemaForFile("strategy.json"));
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all tests in `validation.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/server/validation.ts lib/server/validation.test.ts
git commit -m "feat: add shared types and zod validation schemas"
```

---

## Task 3: Filesystem safety utilities

**Files:**
- Create: `lib/server/trackerFs.ts`
- Test: `lib/server/trackerFs.test.ts`

**Interfaces:**
- Consumes: `ALLOWED_DATA_FILES`, `DataFileName`, `isDataFileName` from `lib/types.ts`.
- Produces: `getTrackerDir`, `readDataFile<T>`, `writeDataFile`, `resolveDocPath`, `readDocFile`, `scaffoldTrackerDir(projectPath, projectId, projectName)`.

- [ ] **Step 1: Write `lib/server/trackerFs.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { ALLOWED_DATA_FILES, type DataFileName } from "@/lib/types";

export function getTrackerDir(projectPath: string): string {
  return path.join(projectPath, ".tracker");
}

export async function readDataFile<T>(projectPath: string, file: DataFileName): Promise<T> {
  const filePath = path.join(getTrackerDir(projectPath), file);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeDataFile(
  projectPath: string,
  file: DataFileName,
  data: unknown
): Promise<void> {
  const filePath = path.join(getTrackerDir(projectPath), file);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function resolveDocPath(projectPath: string, relPath: string): string {
  const resolvedRoot = path.resolve(projectPath);
  const resolved = path.resolve(projectPath, relPath);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Path escapes project root");
  }
  return resolved;
}

export async function readDocFile(projectPath: string, relPath: string): Promise<string> {
  const filePath = resolveDocPath(projectPath, relPath);
  return fs.readFile(filePath, "utf-8");
}

export async function scaffoldTrackerDir(
  projectPath: string,
  projectId: string,
  projectName: string
): Promise<void> {
  const trackerDir = getTrackerDir(projectPath);
  await fs.mkdir(trackerDir, { recursive: true });

  const defaultMeta = {
    id: projectId,
    name: projectName,
    description: "",
    pages: [
      { id: "overview", type: "overview", label: "Overview" },
      { id: "requirements", type: "requirements-explorer", source: "requirements.json", label: "Requirements" },
      { id: "board", type: "task-board", source: "tasks.json", label: "Task Board" },
      { id: "documents", type: "documents", source: "documents.json", label: "Documents" },
    ],
  };

  const defaults: [DataFileName, unknown][] = [
    ["meta.json", defaultMeta],
    ["requirements.json", []],
    ["tasks.json", []],
    ["documents.json", []],
  ];

  for (const [file, content] of defaults) {
    const filePath = path.join(trackerDir, file);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(content, null, 2) + "\n", "utf-8");
    }
  }
}

export { ALLOWED_DATA_FILES };
export type { DataFileName };
```

- [ ] **Step 2: Write `lib/server/trackerFs.test.ts`**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scaffoldTrackerDir, readDataFile, writeDataFile, resolveDocPath } from "./trackerFs";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-fs-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("scaffoldTrackerDir", () => {
  it("creates the default .tracker files", async () => {
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    const meta = await readDataFile<{ id: string; pages: unknown[] }>(tmpDir, "meta.json");
    expect(meta.id).toBe("demo");
    expect(meta.pages.length).toBeGreaterThan(0);

    const requirements = await readDataFile<unknown[]>(tmpDir, "requirements.json");
    expect(requirements).toEqual([]);
  });

  it("does not overwrite an existing file", async () => {
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    await writeDataFile(tmpDir, "requirements.json", [{ id: "R-1" }]);
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    const requirements = await readDataFile<unknown[]>(tmpDir, "requirements.json");
    expect(requirements).toEqual([{ id: "R-1" }]);
  });
});

describe("resolveDocPath", () => {
  it("resolves a path inside the project root", () => {
    const resolved = resolveDocPath(tmpDir, "notes.md");
    expect(resolved).toBe(path.join(tmpDir, "notes.md"));
  });

  it("throws when the path escapes the project root", () => {
    expect(() => resolveDocPath(tmpDir, "../../etc/passwd")).toThrow();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: all tests in `trackerFs.test.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add lib/server/trackerFs.ts lib/server/trackerFs.test.ts
git commit -m "feat: add tracker filesystem safety utilities"
```

---

## Task 4: Project registry and scaffolding

**Files:**
- Create: `lib/server/registry.ts`
- Test: `lib/server/registry.test.ts`

**Interfaces:**
- Consumes: `scaffoldTrackerDir` from `lib/server/trackerFs.ts`; `RegisteredProject` from `lib/types.ts`.
- Produces: `getRegistryPath`, `readRegistry`, `writeRegistry`, `findProject(id)`, `addProject(dirPath)`.

- [ ] **Step 1: Write `lib/server/registry.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { scaffoldTrackerDir } from "./trackerFs";
import type { RegisteredProject } from "@/lib/types";

export function getRegistryPath(): string {
  return process.env.TRACKER_REGISTRY_PATH ?? path.join(process.cwd(), "data", "registry.json");
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "project";
}

export async function readRegistry(): Promise<RegisteredProject[]> {
  try {
    const raw = await fs.readFile(getRegistryPath(), "utf-8");
    return JSON.parse(raw) as RegisteredProject[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeRegistry(projects: RegisteredProject[]): Promise<void> {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(projects, null, 2) + "\n", "utf-8");
}

export async function findProject(id: string): Promise<RegisteredProject | null> {
  const projects = await readRegistry();
  return projects.find((p) => p.id === id) ?? null;
}

export async function addProject(dirPath: string): Promise<RegisteredProject> {
  const resolvedPath = path.resolve(dirPath);
  const stat = await fs.stat(resolvedPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Not a directory: ${resolvedPath}`);
  }

  const projects = await readRegistry();
  const existing = projects.find((p) => path.resolve(p.path) === resolvedPath);
  if (existing) return existing;

  const name = path.basename(resolvedPath);
  const usedIds = new Set(projects.map((p) => p.id));
  let id = slugify(name);
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${slugify(name)}-${suffix}`;
    suffix += 1;
  }

  await scaffoldTrackerDir(resolvedPath, id, name);

  const project: RegisteredProject = { id, name, path: resolvedPath };
  await writeRegistry([...projects, project]);
  return project;
}
```

- [ ] **Step 2: Write `lib/server/registry.test.ts`**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { addProject, readRegistry, findProject } from "./registry";

let tmpProjectDir: string;
let tmpRegistryDir: string;

beforeEach(async () => {
  tmpProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-project-"));
  tmpRegistryDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-registry-"));
  process.env.TRACKER_REGISTRY_PATH = path.join(tmpRegistryDir, "registry.json");
});

afterEach(async () => {
  delete process.env.TRACKER_REGISTRY_PATH;
  await fs.rm(tmpProjectDir, { recursive: true, force: true });
  await fs.rm(tmpRegistryDir, { recursive: true, force: true });
});

describe("addProject", () => {
  it("registers a new project and scaffolds .tracker", async () => {
    const project = await addProject(tmpProjectDir);
    expect(project.path).toBe(path.resolve(tmpProjectDir));

    const stored = await findProject(project.id);
    expect(stored).not.toBeNull();

    const trackerStat = await fs.stat(path.join(tmpProjectDir, ".tracker"));
    expect(trackerStat.isDirectory()).toBe(true);
  });

  it("returns the existing entry when the same path is added twice", async () => {
    const first = await addProject(tmpProjectDir);
    const second = await addProject(tmpProjectDir);
    expect(second.id).toBe(first.id);

    const all = await readRegistry();
    expect(all.length).toBe(1);
  });

  it("rejects a path that is not a directory", async () => {
    const filePath = path.join(tmpProjectDir, "file.txt");
    await fs.writeFile(filePath, "hi");
    await expect(addProject(filePath)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: all tests in `registry.test.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add lib/server/registry.ts lib/server/registry.test.ts
git commit -m "feat: add project registry with scaffolding"
```

---

## Task 5: `/api/projects` route (list + add)

**Files:**
- Create: `app/api/projects/route.ts`

**Interfaces:**
- Consumes: `readRegistry`, `addProject` from `lib/server/registry.ts`.
- Produces: `GET /api/projects` -> `RegisteredProject[]`; `POST /api/projects` with `{ path: string }` -> `RegisteredProject` (201) or `{ error: string }` (400).

- [ ] **Step 1: Write `app/api/projects/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { readRegistry, addProject } from "@/lib/server/registry";

export async function GET() {
  const projects = await readRegistry();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (typeof body.path !== "string" || body.path.trim() === "") {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  try {
    const project = await addProject(body.path.trim());
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`
Run in another terminal: `curl -s http://localhost:3000/api/projects`
Expected: `[]`

Run: `curl -s -X POST http://localhost:3000/api/projects -H "Content-Type: application/json" -d "{\"path\": \"C:\\\\Users\\\\Tausif\\\\AppData\\\\Local\\\\Temp\\\\tracker-smoke-test\"}"`
(create that directory first if it doesn't exist)
Expected: 201 response with a `RegisteredProject` object, and a `.tracker/` folder with `meta.json`, `requirements.json`, `tasks.json`, `documents.json` created inside it.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/route.ts
git commit -m "feat: add /api/projects list and add route"
```

---

## Task 6: `/api/projects/:id/data/:file` route (read + write)

**Files:**
- Create: `app/api/projects/[id]/data/[file]/route.ts`

**Interfaces:**
- Consumes: `findProject` from `lib/server/registry.ts`; `isDataFileName` from `lib/types.ts`; `readDataFile`, `writeDataFile` from `lib/server/trackerFs.ts`; `schemaForFile` from `lib/server/validation.ts`.
- Produces: `GET /api/projects/:id/data/:file` -> file contents as JSON; `PUT` with a JSON body -> validates and persists, `{ ok: true }` on success.

- [ ] **Step 1: Write `app/api/projects/[id]/data/[file]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { readDataFile, writeDataFile } from "@/lib/server/trackerFs";
import { schemaForFile } from "@/lib/server/validation";
import { isDataFileName } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isDataFileName(params.file)) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const data = await readDataFile(project.path, params.file);
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isDataFileName(params.file)) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const body = await request.json();
  const schema = schemaForFile(params.file);
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  await writeDataFile(project.path, params.file, result.data);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, and using the project id created in Task 5's smoke test:

`curl -s http://localhost:3000/api/projects/<id>/data/requirements.json` -> `[]`

`curl -s -X PUT http://localhost:3000/api/projects/<id>/data/requirements.json -H "Content-Type: application/json" -d "[{\"id\":\"R-1\",\"section\":\"1\",\"category\":\"Test\",\"text\":\"Example\"}]"` -> `{"ok":true}`

`curl -s -X PUT http://localhost:3000/api/projects/<id>/data/requirements.json -H "Content-Type: application/json" -d "[{\"id\":\"R-1\"}]"` -> 400 with a validation error (missing required fields)

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add "app/api/projects/[id]/data/[file]/route.ts"
git commit -m "feat: add project data file read/write route"
```

---

## Task 7: `/api/projects/:id/doc/:path` route

**Files:**
- Create: `app/api/projects/[id]/doc/[...path]/route.ts`

**Interfaces:**
- Consumes: `findProject`; `readDataFile`, `readDocFile` from `lib/server/trackerFs.ts`; `DocumentEntry` from `lib/types.ts`.
- Produces: `GET /api/projects/:id/doc/*path` -> `{ path: string; content: string }`, restricted to paths listed in that project's `documents.json`.

- [ ] **Step 1: Write `app/api/projects/[id]/doc/[...path]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { readDataFile, readDocFile } from "@/lib/server/trackerFs";
import type { DocumentEntry } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const relPath = params.path.join("/");
  const documents = await readDataFile<DocumentEntry[]>(project.path, "documents.json");
  const isRegistered = documents.some((doc) => doc.path === relPath);
  if (!isRegistered) {
    return NextResponse.json({ error: "Path not registered in documents.json" }, { status: 403 });
  }

  const content = await readDocFile(project.path, relPath);
  return NextResponse.json({ path: relPath, content });
}
```

- [ ] **Step 2: Verify manually**

Using the smoke-test project directory from Task 5, add a file `notes.md` with some text, register it:

`curl -s -X PUT http://localhost:3000/api/projects/<id>/data/documents.json -H "Content-Type: application/json" -d "[{\"label\":\"Notes\",\"path\":\"notes.md\"}]"`

`curl -s http://localhost:3000/api/projects/<id>/doc/notes.md` -> `{"path":"notes.md","content":"..."}`

`curl -s http://localhost:3000/api/projects/<id>/doc/unregistered.md` -> 403

- [ ] **Step 3: Commit**

```bash
git add "app/api/projects/[id]/doc/[...path]/route.ts"
git commit -m "feat: add project doc file read route"
```

---

## Task 8: File watcher

**Files:**
- Create: `lib/server/watcher.ts`
- Test: `lib/server/watcher.test.ts`

**Interfaces:**
- Consumes: nothing beyond `chokidar` and `node:path`.
- Produces: `subscribe(projectId: string, projectPath: string, listener: (file: string) => void): () => void`. Watches `.tracker/*.json` and root-level `*.md` files; `file` passed to listeners is project-root-relative with forward slashes (e.g. `.tracker/requirements.json`, `notes.md`).

- [ ] **Step 1: Write `lib/server/watcher.ts`**

```ts
import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";

type ChangeListener = (file: string) => void;

declare global {
  // eslint-disable-next-line no-var
  var __trackerWatchers: Map<string, FSWatcher> | undefined;
  // eslint-disable-next-line no-var
  var __trackerListeners: Map<string, Set<ChangeListener>> | undefined;
}

function getWatchers(): Map<string, FSWatcher> {
  if (!globalThis.__trackerWatchers) {
    globalThis.__trackerWatchers = new Map();
  }
  return globalThis.__trackerWatchers;
}

function getListeners(): Map<string, Set<ChangeListener>> {
  if (!globalThis.__trackerListeners) {
    globalThis.__trackerListeners = new Map();
  }
  return globalThis.__trackerListeners;
}

function ensureWatcher(projectId: string, projectPath: string): void {
  const watchers = getWatchers();
  if (watchers.has(projectId)) return;

  const watcher = chokidar.watch(
    [path.join(projectPath, ".tracker", "*.json"), path.join(projectPath, "*.md")],
    { ignoreInitial: true }
  );

  watcher.on("all", (_event, filePath) => {
    const relFile = path.relative(projectPath, filePath).split(path.sep).join("/");
    const listeners = getListeners().get(projectId);
    if (listeners) {
      for (const listener of listeners) listener(relFile);
    }
  });

  watchers.set(projectId, watcher);
}

export function subscribe(
  projectId: string,
  projectPath: string,
  listener: ChangeListener
): () => void {
  ensureWatcher(projectId, projectPath);
  const listeners = getListeners();
  if (!listeners.has(projectId)) {
    listeners.set(projectId, new Set());
  }
  listeners.get(projectId)!.add(listener);

  return () => {
    listeners.get(projectId)?.delete(listener);
  };
}
```

- [ ] **Step 2: Write `lib/server/watcher.test.ts`**

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { subscribe } from "./watcher";

let tmpDir: string;
let projectId: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-watch-"));
  projectId = path.basename(tmpDir);
  await fs.mkdir(path.join(tmpDir, ".tracker"), { recursive: true });
  await fs.writeFile(path.join(tmpDir, ".tracker", "requirements.json"), "[]\n");
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Timed out waiting for condition"));
      }
    }, 50);
  });
}

describe("subscribe", () => {
  it("notifies listeners when a watched file changes", async () => {
    const changed: string[] = [];
    const unsubscribe = subscribe(projectId, tmpDir, (file) => {
      changed.push(file);
    });

    await new Promise((resolve) => setTimeout(resolve, 300)); // let the initial scan settle
    await fs.writeFile(path.join(tmpDir, ".tracker", "requirements.json"), '[{"id":"R-1"}]\n');

    await waitFor(() => changed.includes(".tracker/requirements.json"));
    unsubscribe();
  }, 10000);
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: `watcher.test.ts` passes (it may take a couple of seconds due to filesystem event latency).

- [ ] **Step 4: Commit**

```bash
git add lib/server/watcher.ts lib/server/watcher.test.ts
git commit -m "feat: add per-project file watcher"
```

---

## Task 9: SSE events route + client events hook

**Files:**
- Create: `app/api/projects/[id]/events/route.ts`
- Create: `hooks/useProjectEvents.tsx`

**Interfaces:**
- Consumes: `findProject`; `subscribe` from `lib/server/watcher.ts`.
- Produces: `GET /api/projects/:id/events` (SSE stream, one `data: <relFile>\n\n` message per change); `ProjectEventsProvider({ projectId, children })`, `useProjectFileEvents(file: string, onChange: () => void): void`.

- [ ] **Step 1: Write `app/api/projects/[id]/events/route.ts`**

```ts
import { NextRequest } from "next/server";
import { findProject } from "@/lib/server/registry";
import { subscribe } from "@/lib/server/watcher";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await findProject(params.id);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const unsubscribe = subscribe(params.id, project.path, (file) => {
        controller.enqueue(encoder.encode(`data: ${file}\n\n`));
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Write `hooks/useProjectEvents.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type Listener = (file: string) => void;

interface EventsContextValue {
  subscribe: (file: string, listener: Listener) => () => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function ProjectEventsProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  useEffect(() => {
    const source = new EventSource(`/api/projects/${projectId}/events`);
    source.onmessage = (event) => {
      const file = event.data;
      const listeners = listenersRef.current.get(file);
      if (listeners) {
        for (const listener of listeners) listener(file);
      }
    };
    return () => source.close();
  }, [projectId]);

  const subscribe = (file: string, listener: Listener) => {
    if (!listenersRef.current.has(file)) {
      listenersRef.current.set(file, new Set());
    }
    listenersRef.current.get(file)!.add(listener);
    return () => {
      listenersRef.current.get(file)?.delete(listener);
    };
  };

  return <EventsContext.Provider value={{ subscribe }}>{children}</EventsContext.Provider>;
}

export function useProjectFileEvents(file: string, onChange: () => void): void {
  const context = useContext(EventsContext);
  useEffect(() => {
    if (!context) return;
    return context.subscribe(file, onChange);
  }, [context, file, onChange]);
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`
Run: `curl -N http://localhost:3000/api/projects/<id>/events` (leave it running)
In another terminal, edit `<project>/.tracker/requirements.json` directly (append a space and save).
Expected: the curl connection prints a `data: .tracker/requirements.json` line within a couple of seconds.

Stop both processes.

- [ ] **Step 4: Commit**

```bash
git add "app/api/projects/[id]/events/route.ts" hooks/useProjectEvents.tsx
git commit -m "feat: add SSE events route and client events hook"
```

---

## Task 10: Project picker home page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/projects`; `RegisteredProject` from `lib/types.ts`.
- Produces: the app's `/` route.

- [ ] **Step 1: Rewrite `app/page.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { RegisteredProject } from "@/lib/types";

export default function HomePage() {
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add project");
      }
      setNewPath("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold">SRS Tracker</h1>

      <ul className="mb-10 space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/project/${project.id}`}
              className="block rounded-lg border border-slate-800 px-4 py-3 hover:border-slate-600"
            >
              <div className="font-medium">{project.name}</div>
              <div className="text-sm text-slate-400">{project.path}</div>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-slate-400">No projects yet. Add one below.</li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          placeholder="Absolute path to a project folder"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || newPath.trim() === ""}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Add project
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: the project added in earlier tasks' smoke tests appears in the list, and adding a brand-new folder path via the form creates it and shows it in the list without a page reload.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build project picker home page"
```

---

## Task 11: Project shell, nav, and default-page redirect

**Files:**
- Create: `components/ProjectShell.tsx`
- Create: `app/project/[id]/layout.tsx`
- Create: `app/project/[id]/page.tsx`

**Interfaces:**
- Consumes: `findProject` from `lib/server/registry.ts`; `readDataFile` from `lib/server/trackerFs.ts`; `ProjectMeta` from `lib/types.ts`; `ProjectEventsProvider` from `hooks/useProjectEvents.tsx`.
- Produces: `ProjectShell({ projectId, meta, children })`; every project route under `/project/[id]/...` is wrapped in this shell.

- [ ] **Step 1: Write `components/ProjectShell.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { ProjectMeta } from "@/lib/types";
import { ProjectEventsProvider } from "@/hooks/useProjectEvents";

function labelFor(pageId: string, label?: string): string {
  if (label) return label;
  return pageId.charAt(0).toUpperCase() + pageId.slice(1);
}

export function ProjectShell({
  projectId,
  meta,
  children,
}: {
  projectId: string;
  meta: ProjectMeta;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ProjectEventsProvider projectId={projectId}>
      <div className="flex min-h-screen">
        <nav className="w-56 shrink-0 border-r border-slate-800 p-4">
          <Link href="/" className="mb-6 block text-sm text-slate-400 hover:text-slate-200">
            &larr; All projects
          </Link>
          <div className="mb-4 text-lg font-semibold">{meta.name}</div>
          <ul className="space-y-1">
            {meta.pages.map((page) => {
              const href = `/project/${projectId}/${page.id}`;
              const active = pathname === href;
              return (
                <li key={page.id}>
                  <Link
                    href={href}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {labelFor(page.id, page.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex-1 p-8">{children}</div>
      </div>
    </ProjectEventsProvider>
  );
}
```

- [ ] **Step 2: Write `app/project/[id]/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { findProject } from "@/lib/server/registry";
import { readDataFile } from "@/lib/server/trackerFs";
import type { ProjectMeta } from "@/lib/types";
import { ProjectShell } from "@/components/ProjectShell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const project = await findProject(params.id);
  if (!project) notFound();

  const meta = await readDataFile<ProjectMeta>(project.path, "meta.json");

  return (
    <ProjectShell projectId={params.id} meta={meta}>
      {children}
    </ProjectShell>
  );
}
```

- [ ] **Step 3: Write `app/project/[id]/page.tsx`**

```tsx
import { redirect, notFound } from "next/navigation";
import { findProject } from "@/lib/server/registry";
import { readDataFile } from "@/lib/server/trackerFs";
import type { ProjectMeta } from "@/lib/types";

export default async function ProjectIndexPage({ params }: { params: { id: string } }) {
  const project = await findProject(params.id);
  if (!project) notFound();

  const meta = await readDataFile<ProjectMeta>(project.path, "meta.json");
  const firstPage = meta.pages[0];
  if (!firstPage) notFound();

  redirect(`/project/${params.id}/${firstPage.id}`);
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, click into the test project from the home page.
Expected: redirected to `/project/<id>/overview` (a 404 page for now, built in Task 13), with the sidebar nav showing Overview, Requirements, Task Board, Documents, and the project name at top.

- [ ] **Step 5: Commit**

```bash
git add components/ProjectShell.tsx "app/project/[id]/layout.tsx" "app/project/[id]/page.tsx"
git commit -m "feat: add project shell, nav, and default-page redirect"
```

---

## Task 12: `useProjectData` hook

**Files:**
- Create: `hooks/useProjectData.ts`

**Interfaces:**
- Consumes: `useProjectFileEvents` from `hooks/useProjectEvents.tsx`; `DataFileName` from `lib/types.ts`.
- Produces: `useProjectData<T>(projectId, file, fallback): { data: T; setData; save: (next: T) => Promise<void>; loading: boolean }`.

- [ ] **Step 1: Write `hooks/useProjectData.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useProjectFileEvents } from "./useProjectEvents";
import type { DataFileName } from "@/lib/types";

export function useProjectData<T>(projectId: string, file: DataFileName, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/data/${file}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [projectId, file]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useProjectFileEvents(`.tracker/${file}`, refetch);

  const save = useCallback(
    async (next: T) => {
      setData(next);
      await fetch(`/api/projects/${projectId}/data/${file}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    },
    [projectId, file]
  );

  return { data, setData, save, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useProjectData.ts
git commit -m "feat: add useProjectData hook"
```

(Verified indirectly by Tasks 13–20, which all depend on this hook rendering real data.)

---

## Task 13: Overview page

**Files:**
- Create: `app/project/[id]/overview/page.tsx`

**Interfaces:**
- Consumes: `useProjectData` (Task 12); `Requirement`, `Task` from `lib/types.ts`.
- Produces: the `/project/[id]/overview` route.

- [ ] **Step 1: Write `app/project/[id]/overview/page.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import type { Requirement, Task } from "@/lib/types";

const COLUMNS = ["planning", "implementation", "testing", "bugs", "done"] as const;

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: requirements } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const { data: tasks } = useProjectData<Task[]>(id, "tasks.json", []);

  const stats = useMemo(() => {
    const critical = requirements.filter((r) => r.critical).length;
    const done = requirements.filter((r) => r.status === "done").length;
    const byColumn = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.column] = (acc[task.column] ?? 0) + 1;
      return acc;
    }, {});
    return { totalRequirements: requirements.length, critical, done, byColumn };
  }, [requirements, tasks]);

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Requirements" value={stats.totalRequirements} />
        <StatCard label="Critical" value={stats.critical} />
        <StatCard label="Requirements done" value={stats.done} />
        <StatCard label="Tasks total" value={tasks.length} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-medium">Task board</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {COLUMNS.map((column) => (
          <StatCard key={column} label={column} value={stats.byColumn[column] ?? 0} />
        ))}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm capitalize text-slate-400">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open a project's Overview page.
Expected: stat cards for requirements/critical/done/tasks render with the seeded data's real counts; editing `.tracker/requirements.json` on disk updates the counts within a couple of seconds without a manual refresh.

- [ ] **Step 3: Commit**

```bash
git add "app/project/[id]/overview/page.tsx"
git commit -m "feat: build overview page"
```

---

## Task 14: Requirements Explorer page

**Files:**
- Create: `app/project/[id]/requirements/page.tsx`

**Interfaces:**
- Consumes: `useProjectData` (Task 12); `Requirement` from `lib/types.ts`.
- Produces: the `/project/[id]/requirements` route.

- [ ] **Step 1: Write `app/project/[id]/requirements/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import type { Requirement } from "@/lib/types";

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: requirements, loading } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(requirements.map((r) => r.category)))],
    [requirements]
  );

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (criticalOnly && !r.critical) return false;
      if (category !== "all" && r.category !== category) return false;
      if (query.trim() === "") return true;
      const q = query.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      );
    });
  }, [requirements, query, category, criticalOnly]);

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold">Requirements</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search id, text, section..."
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(event) => setCriticalOnly(event.target.checked)}
          />
          Critical only
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Section</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Text</th>
              <th className="py-2 pr-4">Critical</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => (
              <tr key={req.id} className="border-b border-slate-900">
                <td className="py-2 pr-4 font-mono text-xs">{req.id}</td>
                <td className="py-2 pr-4 text-slate-400">{req.section}</td>
                <td className="py-2 pr-4">{req.category}</td>
                <td className="py-2 pr-4">{req.text}</td>
                <td className="py-2 pr-4">{req.critical ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`. Seed a project's `requirements.json` (via the PUT endpoint or by editing the file directly) with a handful of varied entries, then open its Requirements page.
Expected: table lists them; search narrows by id/text/section; the category dropdown filters correctly; "Critical only" hides non-critical rows.

- [ ] **Step 3: Commit**

```bash
git add "app/project/[id]/requirements/page.tsx"
git commit -m "feat: build requirements explorer page"
```

---

## Task 15: Task board columns and drag-and-drop

**Files:**
- Create: `components/board/TaskBoard.tsx`
- Create: `components/board/BoardColumn.tsx`
- Create: `components/board/TaskCard.tsx`
- Create: `app/project/[id]/board/page.tsx`

**Interfaces:**
- Consumes: `Task`, `TaskColumn` from `lib/types.ts`; `useProjectData` (Task 12).
- Produces: `TaskBoard({ tasks, onChange })`, rendered at `/project/[id]/board`. `onChange` is called with the full reordered/recolumned `Task[]`.

- [ ] **Step 1: Write `components/board/TaskCard.tsx`**

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-slate-700 bg-slate-900 p-3 text-sm"
    >
      <div className="font-medium">{task.title}</div>
      {task.priority && <div className="mt-1 text-xs uppercase text-slate-500">{task.priority}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/board/BoardColumn.tsx`**

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function BoardColumn({
  column,
  tasks,
}: {
  column: { id: TaskColumn; label: string };
  tasks: Task[];
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div ref={setNodeRef} className="rounded-lg border border-slate-800 p-3">
      <div className="mb-3 text-sm font-medium text-slate-400">
        {column.label} <span className="text-slate-600">({tasks.length})</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/board/TaskBoard.tsx`**

```tsx
"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";

const COLUMNS: { id: TaskColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "implementation", label: "Implementation" },
  { id: "testing", label: "Testing" },
  { id: "bugs", label: "Bugs" },
  { id: "done", label: "Done" },
];

export function TaskBoard({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange: (next: Task[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function tasksForColumn(column: TaskColumn): Task[] {
    return tasks.filter((t) => t.column === column).sort((a, b) => a.order - b.order);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetColumn: TaskColumn = overTask ? overTask.column : (over.id as TaskColumn);

    if (activeTask.column === targetColumn && overTask) {
      const columnTasks = tasksForColumn(targetColumn);
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
      const newIndex = columnTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, index) => ({
        ...t,
        order: index,
      }));
      const rest = tasks.filter((t) => t.column !== targetColumn);
      onChange([...rest, ...reordered]);
      return;
    }

    const destinationTasks = tasksForColumn(targetColumn);
    const updatedActive: Task = {
      ...activeTask,
      column: targetColumn,
      order: destinationTasks.length,
      updatedAt: new Date().toISOString(),
    };
    onChange([...tasks.filter((t) => t.id !== activeTask.id), updatedActive]);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Task Board</h1>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {COLUMNS.map((column) => (
            <BoardColumn key={column.id} column={column} tasks={tasksForColumn(column.id)} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 4: Write `app/project/[id]/board/page.tsx`**

```tsx
"use client";

import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { TaskBoard } from "@/components/board/TaskBoard";
import type { Task } from "@/lib/types";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tasks, save } = useProjectData<Task[]>(id, "tasks.json", []);

  return <TaskBoard tasks={tasks} onChange={save} />;
}
```

- [ ] **Step 5: Verify manually**

Seed sample tasks so there's something to drag:

`curl -s -X PUT http://localhost:3000/api/projects/<id>/data/tasks.json -H "Content-Type: application/json" -d "[{\"id\":\"t1\",\"title\":\"Design schema\",\"column\":\"planning\",\"order\":0,\"createdAt\":\"2026-08-15T00:00:00.000Z\",\"updatedAt\":\"2026-08-15T00:00:00.000Z\"},{\"id\":\"t2\",\"title\":\"Build API\",\"column\":\"implementation\",\"order\":0,\"createdAt\":\"2026-08-15T00:00:00.000Z\",\"updatedAt\":\"2026-08-15T00:00:00.000Z\"}]"`

Run: `npm run dev`, open the Task Board page.
Expected: two cards in Planning/Implementation columns; dragging a card to another column moves it (persisted — reload the page and it's still there); dragging within a column reorders it.

- [ ] **Step 6: Commit**

```bash
git add components/board "app/project/[id]/board/page.tsx"
git commit -m "feat: build task board with drag-and-drop"
```

---

## Task 16: Task creation dialog

**Files:**
- Create: `components/board/NewTaskDialog.tsx`
- Modify: `components/board/TaskBoard.tsx`

**Interfaces:**
- Consumes: `Task` from `lib/types.ts`; `nanoid`.
- Produces: `NewTaskDialog({ onCreate, onClose })`. `TaskBoard` gains a "New task" button that opens it.

- [ ] **Step 1: Write `components/board/NewTaskDialog.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import type { Task } from "@/lib/types";

export function NewTaskDialog({
  onCreate,
  onClose,
}: {
  onCreate: (task: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "") return;
    const now = new Date().toISOString();
    onCreate({
      id: nanoid(),
      title: title.trim(),
      description: description.trim() || undefined,
      column: "planning",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-6"
      >
        <h2 className="mb-4 text-lg font-medium">New task</h2>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Modify `components/board/TaskBoard.tsx`** to add the button, dialog state, and creation handler

Add near the top of the file:

```tsx
import { useState } from "react";
import { NewTaskDialog } from "./NewTaskDialog";
```

Inside the `TaskBoard` function body, add:

```tsx
const [dialogOpen, setDialogOpen] = useState(false);

function handleCreate(task: Task) {
  onChange([...tasks, task]);
  setDialogOpen(false);
}
```

Replace the `<h1 className="mb-4 text-2xl font-semibold">Task Board</h1>` line with:

```tsx
<div className="mb-4 flex items-center justify-between">
  <h1 className="text-2xl font-semibold">Task Board</h1>
  <button
    onClick={() => setDialogOpen(true)}
    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium"
  >
    New task
  </button>
</div>
```

Add just before the component's closing `</div>`:

```tsx
{dialogOpen && <NewTaskDialog onCreate={handleCreate} onClose={() => setDialogOpen(false)} />}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, open the Task Board, click "New task", fill in a title, submit.
Expected: a new card appears in Planning immediately, and `tasks.json` on disk contains it after the save completes.

- [ ] **Step 4: Commit**

```bash
git add components/board/NewTaskDialog.tsx components/board/TaskBoard.tsx
git commit -m "feat: add task creation dialog"
```

---

## Task 17: Documents page

**Files:**
- Create: `app/project/[id]/documents/page.tsx`

**Interfaces:**
- Consumes: `useProjectData` (Task 12); `useProjectFileEvents` (Task 9); `DocumentEntry` from `lib/types.ts`; `GET /api/projects/:id/doc/:path`.
- Produces: the `/project/[id]/documents` route.

- [ ] **Step 1: Write `app/project/[id]/documents/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectData } from "@/hooks/useProjectData";
import { useProjectFileEvents } from "@/hooks/useProjectEvents";
import type { DocumentEntry } from "@/lib/types";

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: documents } = useProjectData<DocumentEntry[]>(id, "documents.json", []);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!selected && documents.length > 0) {
      setSelected(documents[0].path);
    }
  }, [documents, selected]);

  async function loadDoc(path: string) {
    const res = await fetch(`/api/projects/${id}/doc/${path}`);
    if (res.ok) {
      const body = await res.json();
      setContent(body.content);
    }
  }

  useEffect(() => {
    if (selected) loadDoc(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, id]);

  useProjectFileEvents(selected ?? "", () => {
    if (selected) loadDoc(selected);
  });

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0">
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li key={doc.path}>
              <button
                onClick={() => setSelected(doc.path)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                  selected === doc.path ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {doc.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <article className="prose prose-invert max-w-none flex-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Ensure the test project's `documents.json` lists `notes.md` (from Task 7's smoke test). Run: `npm run dev`, open the Documents page.
Expected: `notes.md` renders as formatted markdown; editing the file on disk updates the rendered content within a couple of seconds.

- [ ] **Step 3: Commit**

```bash
git add "app/project/[id]/documents/page.tsx"
git commit -m "feat: build documents page with live markdown viewer"
```

---

## Task 18: Block renderer and simple content blocks

**Files:**
- Create: `components/blocks/MarkdownBlockView.tsx`
- Create: `components/blocks/KeyValueBlockView.tsx`
- Create: `components/blocks/ListBlockView.tsx`
- Create: `components/blocks/CalloutBlockView.tsx`
- Create: `components/blocks/QuoteBlockView.tsx`
- Create: `components/blocks/LinkListBlockView.tsx`
- Create: `components/blocks/ImageBlockView.tsx`
- Create: `components/blocks/StatGridBlockView.tsx`
- Create: `lib/blocks/registry.tsx`
- Create: `components/sections/BlockRenderer.tsx`

**Interfaces:**
- Consumes: the 14 block types from `lib/types.ts`.
- Produces: `blockRegistry: Record<BlockType, ComponentType>`; `BlockRenderer({ block })`.

- [ ] **Step 1: Write `components/blocks/MarkdownBlockView.tsx`**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MarkdownBlock } from "@/lib/types";

export function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content.text}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/blocks/KeyValueBlockView.tsx`**

```tsx
import type { KeyValueBlock } from "@/lib/types";

export function KeyValueBlockView({ block }: { block: KeyValueBlock }) {
  const { dense, items } = block.content;
  return (
    <dl className={dense ? "grid grid-cols-2 gap-x-6 gap-y-1 text-sm" : "space-y-3"}>
      {items.map((item, index) => (
        <div key={index} className={dense ? "contents" : ""}>
          <dt className="text-slate-400">{item.label}</dt>
          <dd className={dense ? "" : "mt-0.5"}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 3: Write `components/blocks/ListBlockView.tsx`**

```tsx
import type { ListBlock } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  done: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  none: "text-slate-300",
};

export function ListBlockView({ block }: { block: ListBlock }) {
  const Tag = block.content.ordered ? "ol" : "ul";
  return (
    <Tag className={block.content.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
      {block.content.items.map((item, index) => (
        <li key={index} className={STATUS_COLOR[item.status ?? "none"]}>
          {item.text}
        </li>
      ))}
    </Tag>
  );
}
```

- [ ] **Step 4: Write `components/blocks/CalloutBlockView.tsx`**

```tsx
import type { CalloutBlock } from "@/lib/types";

const TONE_CLASSES: Record<CalloutBlock["content"]["tone"], string> = {
  info: "border-sky-700 bg-sky-950 text-sky-100",
  warning: "border-amber-700 bg-amber-950 text-amber-100",
  danger: "border-red-700 bg-red-950 text-red-100",
  success: "border-emerald-700 bg-emerald-950 text-emerald-100",
};

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[block.content.tone]}`}>
      {block.content.text}
    </div>
  );
}
```

- [ ] **Step 5: Write `components/blocks/QuoteBlockView.tsx`**

```tsx
import type { QuoteBlock } from "@/lib/types";

export function QuoteBlockView({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className="border-l-4 border-slate-700 pl-4 italic text-slate-300">
      <p>&ldquo;{block.content.text}&rdquo;</p>
      {block.content.attribution && (
        <footer className="mt-2 text-sm not-italic text-slate-500">
          &mdash; {block.content.attribution}
        </footer>
      )}
    </blockquote>
  );
}
```

- [ ] **Step 6: Write `components/blocks/LinkListBlockView.tsx`**

```tsx
import type { LinkListBlock } from "@/lib/types";

export function LinkListBlockView({ block }: { block: LinkListBlock }) {
  return (
    <ul className="space-y-2">
      {block.content.links.map((link, index) => (
        <li key={index}>
          <a href={link.href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
            {link.label}
          </a>
          {link.description && <p className="text-sm text-slate-500">{link.description}</p>}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Write `components/blocks/ImageBlockView.tsx`**

```tsx
import type { ImageBlock } from "@/lib/types";

export function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.content.src} alt={block.content.alt} className="rounded-lg border border-slate-800" />
      {block.content.caption && (
        <figcaption className="mt-2 text-sm text-slate-500">{block.content.caption}</figcaption>
      )}
    </figure>
  );
}
```

- [ ] **Step 8: Write `components/blocks/StatGridBlockView.tsx`**

```tsx
import type { StatGridBlock } from "@/lib/types";

export function StatGridBlockView({ block }: { block: StatGridBlock }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {block.content.stats.map((stat, index) => (
        <div key={index} className="rounded-lg border border-slate-800 p-4">
          <div className="text-2xl font-semibold">{stat.value}</div>
          <div className="text-sm text-slate-400">{stat.label}</div>
          {stat.sublabel && <div className="text-xs text-slate-600">{stat.sublabel}</div>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Write `lib/blocks/registry.tsx`**

(This imports the remaining six block views built in Tasks 19–20 too — the file is completed by those tasks. For now it references what exists so far and is finished at the end of Task 20.)

```tsx
import type { ComponentType } from "react";
import type { ContentBlock } from "@/lib/types";
import { MarkdownBlockView } from "@/components/blocks/MarkdownBlockView";
import { KeyValueBlockView } from "@/components/blocks/KeyValueBlockView";
import { ListBlockView } from "@/components/blocks/ListBlockView";
import { CalloutBlockView } from "@/components/blocks/CalloutBlockView";
import { QuoteBlockView } from "@/components/blocks/QuoteBlockView";
import { LinkListBlockView } from "@/components/blocks/LinkListBlockView";
import { ImageBlockView } from "@/components/blocks/ImageBlockView";
import { StatGridBlockView } from "@/components/blocks/StatGridBlockView";

type BlockComponent = ComponentType<{ block: ContentBlock }>;

export const blockRegistry: Record<ContentBlock["type"], BlockComponent> = {
  markdown: MarkdownBlockView as BlockComponent,
  keyvalue: KeyValueBlockView as BlockComponent,
  list: ListBlockView as BlockComponent,
  callout: CalloutBlockView as BlockComponent,
  quote: QuoteBlockView as BlockComponent,
  "link-list": LinkListBlockView as BlockComponent,
  image: ImageBlockView as BlockComponent,
  "stat-grid": StatGridBlockView as BlockComponent,
  table: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  comparison: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  progress: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  timeline: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
  diagram: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
  code: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
};
```

- [ ] **Step 10: Write `components/sections/BlockRenderer.tsx`**

```tsx
import type { ContentBlock } from "@/lib/types";
import { blockRegistry } from "@/lib/blocks/registry";

export function BlockRenderer({ block }: { block: ContentBlock }) {
  const Component = blockRegistry[block.type];
  return (
    <section className="mb-8">
      {block.title && <h2 className="mb-3 text-lg font-medium">{block.title}</h2>}
      <Component block={block} />
    </section>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add components/blocks lib/blocks/registry.tsx components/sections/BlockRenderer.tsx
git commit -m "feat: add block renderer and 8 simple content blocks"
```

(The placeholder entries in `blockRegistry` are corrected in Tasks 19 and 20 — this task is independently testable by rendering a `markdown`, `keyvalue`, `list`, `callout`, `quote`, `link-list`, `image`, or `stat-grid` block through `BlockRenderer` once a `sections`-type page exists, which lands in Task 20.)

---

## Task 19: Structured content blocks (table, comparison, progress)

**Files:**
- Create: `components/blocks/TableBlockView.tsx`
- Create: `components/blocks/ComparisonBlockView.tsx`
- Create: `components/blocks/ProgressBlockView.tsx`
- Modify: `lib/blocks/registry.tsx`

**Interfaces:**
- Consumes: `TableBlock`, `ComparisonBlock`, `ProgressBlock` from `lib/types.ts`.
- Produces: real entries for `table`, `comparison`, `progress` in `blockRegistry`.

- [ ] **Step 1: Write `components/blocks/TableBlockView.tsx`**

```tsx
import type { TableBlock } from "@/lib/types";

export function TableBlockView({ block }: { block: TableBlock }) {
  const { columns, rows } = block.content;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-slate-400">
            {columns.map((col) => (
              <th key={col} className="py-2 pr-4">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-900">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">
                  {cell.kind === "link" && cell.href ? (
                    <a href={cell.href} className="text-indigo-400 hover:underline">
                      {cell.value}
                    </a>
                  ) : cell.kind === "badge" ? (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{cell.value}</span>
                  ) : (
                    cell.value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/blocks/ComparisonBlockView.tsx`**

```tsx
import type { ComparisonBlock } from "@/lib/types";

export function ComparisonBlockView({ block }: { block: ComparisonBlock }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {block.content.cards.map((card, index) => (
        <div
          key={index}
          className={`rounded-lg border p-4 ${card.recommended ? "border-indigo-500" : "border-slate-800"}`}
        >
          <div className="mb-2 font-medium">
            {card.title}
            {card.recommended && (
              <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs">Recommended</span>
            )}
          </div>
          <dl className="space-y-1 text-sm">
            {card.attributes.map((attr, attrIndex) => (
              <div key={attrIndex} className="flex justify-between gap-4">
                <dt className="text-slate-400">{attr.label}</dt>
                <dd className="text-right">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/blocks/ProgressBlockView.tsx`**

```tsx
import type { ProgressBlock } from "@/lib/types";

export function ProgressBlockView({ block }: { block: ProgressBlock }) {
  return (
    <div className="space-y-3">
      {block.content.items.map((item, index) => (
        <div key={index}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="text-slate-400">{item.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Modify `lib/blocks/registry.tsx`**

Add these imports near the top:

```tsx
import { TableBlockView } from "@/components/blocks/TableBlockView";
import { ComparisonBlockView } from "@/components/blocks/ComparisonBlockView";
import { ProgressBlockView } from "@/components/blocks/ProgressBlockView";
```

Replace the three placeholder lines with:

```tsx
  table: TableBlockView as BlockComponent,
  comparison: ComparisonBlockView as BlockComponent,
  progress: ProgressBlockView as BlockComponent,
```

- [ ] **Step 5: Commit**

```bash
git add components/blocks/TableBlockView.tsx components/blocks/ComparisonBlockView.tsx components/blocks/ProgressBlockView.tsx lib/blocks/registry.tsx
git commit -m "feat: add table, comparison, and progress content blocks"
```

---

## Task 20: Rich content blocks (timeline, diagram, code) and the sections page

**Files:**
- Create: `components/blocks/TimelineBlockView.tsx`
- Create: `components/blocks/DiagramBlockView.tsx`
- Create: `components/blocks/CodeBlockView.tsx`
- Modify: `lib/blocks/registry.tsx`
- Create: `app/project/[id]/[pageId]/page.tsx`

**Interfaces:**
- Consumes: `TimelineBlock`, `DiagramBlock`, `CodeBlock` from `lib/types.ts`; `BlockRenderer` (Task 18); `useProjectData` (Task 12).
- Produces: the final three `blockRegistry` entries; the `/project/[id]/[pageId]` route that renders any `sections`-type page.

- [ ] **Step 1: Write `components/blocks/TimelineBlockView.tsx`**

```tsx
import type { TimelineBlock } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  active: "bg-indigo-500",
  planned: "bg-slate-600",
  blocked: "bg-red-500",
};

export function TimelineBlockView({ block }: { block: TimelineBlock }) {
  return (
    <ol className="space-y-4 border-l border-slate-800 pl-4">
      {block.content.entries.map((entry, index) => (
        <li key={index} className="relative">
          <span
            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
              STATUS_DOT[entry.status ?? "planned"]
            }`}
          />
          <div className="font-medium">{entry.title}</div>
          {entry.date && <div className="text-xs text-slate-500">{entry.date}</div>}
          {entry.description && <p className="mt-1 text-sm text-slate-400">{entry.description}</p>}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Write `components/blocks/DiagramBlockView.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { DiagramBlock } from "@/lib/types";

export function DiagramBlockView({ block }: { block: DiagramBlock }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      try {
        const { svg } = await mermaid.render(`diagram-${block.id}`, block.content.mermaid);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [block.id, block.content.mermaid]);

  if (error) {
    return <p className="text-sm text-red-400">Diagram error: {error}</p>;
  }

  return <div ref={containerRef} className="overflow-x-auto" />;
}
```

- [ ] **Step 3: Write `components/blocks/CodeBlockView.tsx`**

```tsx
import type { CodeBlock } from "@/lib/types";

export function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">
      <code>{block.content.code}</code>
    </pre>
  );
}
```

- [ ] **Step 4: Modify `lib/blocks/registry.tsx`**

Add these imports:

```tsx
import { TimelineBlockView } from "@/components/blocks/TimelineBlockView";
import { DiagramBlockView } from "@/components/blocks/DiagramBlockView";
import { CodeBlockView } from "@/components/blocks/CodeBlockView";
```

Replace the last three placeholder lines with:

```tsx
  timeline: TimelineBlockView as BlockComponent,
  diagram: DiagramBlockView as BlockComponent,
  code: CodeBlockView as BlockComponent,
```

- [ ] **Step 5: Write `app/project/[id]/[pageId]/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { BlockRenderer } from "@/components/sections/BlockRenderer";
import type { ContentBlock, DataFileName, ProjectMeta } from "@/lib/types";

export default function SectionsPage() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>();
  const [source, setSource] = useState<DataFileName | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      const res = await fetch(`/api/projects/${id}/data/meta.json`);
      const meta: ProjectMeta = await res.json();
      const page = meta.pages.find((p) => p.id === pageId);
      if (cancelled) return;
      if (!page || page.type !== "sections" || !page.source) {
        setNotFound(true);
        return;
      }
      setSource(page.source as DataFileName);
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [id, pageId]);

  if (notFound) return <p className="text-slate-400">Page not found.</p>;
  if (!source) return <p className="text-slate-400">Loading...</p>;

  return <SectionsBody projectId={id} source={source} />;
}

function SectionsBody({ projectId, source }: { projectId: string; source: DataFileName }) {
  const { data: blocks } = useProjectData<ContentBlock[]>(projectId, source, []);

  return (
    <main>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}
```

- [ ] **Step 6: Verify manually**

Add an `architecture` page to the test project's `meta.json` pages array (`{"id":"architecture","type":"sections","source":"architecture.json","label":"Architecture"}`), then seed `architecture.json` with one block of each of the 14 types (a compact example set is in the JSON creation guide written in Task 21 — write a small ad hoc version now covering at least `table`, `diagram`, `timeline`, and `comparison` to confirm the newer renderers work).

Run: `npm run dev`, open the Architecture page.
Expected: every block renders without console errors; the mermaid diagram produces an SVG; editing the file on disk live-updates the page.

- [ ] **Step 7: Commit**

```bash
git add components/blocks/TimelineBlockView.tsx components/blocks/DiagramBlockView.tsx components/blocks/CodeBlockView.tsx lib/blocks/registry.tsx "app/project/[id]/[pageId]/page.tsx"
git commit -m "feat: add remaining content blocks and generic sections page"
```

---

## Task 21: JSON creation guide

**Files:**
- Create: `docs/tracker-json-guide.md`

**Interfaces:**
- Consumes: nothing (documentation).
- Produces: the canonical reference used to generate any project's `.tracker` data from its planning docs.

- [ ] **Step 1: Write `docs/tracker-json-guide.md`**

```markdown
# Tracker JSON Creation Guide

This is the reference for generating a project's `.tracker/` data files from
its planning documents (an SRS, a design doc, notes — whatever the project
has). Read this before creating or editing any `.tracker` file by hand.

## File layout

Every tracked project has a `.tracker/` folder at its root:

- `meta.json` — project identity and page manifest
- `requirements.json` — flat requirement records
- `tasks.json` — task board items
- `documents.json` — pointers to real `.md` files at the project root
- `architecture.json`, `strategy.json`, `roadmap.json` (optional) — free-form
  `sections` pages made of content blocks. A project only has the ones it
  needs — add more, rename, or drop these freely by editing `meta.json`'s
  `pages` array; the file name just needs to end in `.json` and live in
  `.tracker/`.

All files are pretty-printed JSON (`JSON.stringify(data, null, 2)`), written
through the tracker's API or directly to disk. IDs are short, kebab-case,
stable strings — once used in a URL or a link from another block, don't
change them.

## `meta.json`

```json
{
  "id": "nexus",
  "name": "Nexus",
  "description": "Self-hosted, AI-augmented personal life management system",
  "pages": [
    { "id": "overview", "type": "overview", "label": "Overview" },
    { "id": "requirements", "type": "requirements-explorer", "source": "requirements.json", "label": "Requirements" },
    { "id": "board", "type": "task-board", "source": "tasks.json", "label": "Task Board" },
    { "id": "architecture", "type": "sections", "source": "architecture.json", "label": "Architecture" },
    { "id": "strategy", "type": "sections", "source": "strategy.json", "label": "Strategy" },
    { "id": "roadmap", "type": "sections", "source": "roadmap.json", "label": "Roadmap" },
    { "id": "documents", "type": "documents", "source": "documents.json", "label": "Documents" }
  ]
}
```

`type` must be one of `overview`, `requirements-explorer`, `task-board`,
`documents`, `sections`. `overview` and `task-board`/`requirements-explorer`/
`documents` are purpose-built and don't strictly need a `source` (task-board
and requirements-explorer and documents do, pointing at their data file);
`sections` pages always need `source`.

## `requirements.json`

An array of:

```json
{
  "id": "DC-1",
  "section": "2.4 Design Constraints",
  "category": "Constraint",
  "text": "The system must be fully functional with the agent layer entirely absent.",
  "critical": true,
  "status": "not-started"
}
```

`status` is optional (`not-started` | `in-progress` | `done`) — omit it if
the source document doesn't track completion at the requirement level.

**Mapping from an SRS:** every requirement-table row (the tables with an ID
column like `FR-*`, `NFR-*`, `DC-*`, `AR-*`, `DR-*`, `SEC-*`) becomes one
entry. `section` is the containing heading (e.g. "4.2.1 `items`"). `category`
is a short label for the table's theme (e.g. "Constraint", "Architecture",
"Security"). `critical: true` for rows the doc marks as blocking/must-have
(bolded IDs, "hard cap", "must never" language).

## `tasks.json`

An array of:

```json
{
  "id": "t_8f2ka1",
  "title": "Implement context assembler budget enforcement",
  "description": "Enforce FR-CTX-1's 12,120 token cap per turn.",
  "column": "implementation",
  "requirementIds": ["FR-CTX-1", "FR-CTX-2"],
  "priority": "high",
  "notes": "",
  "order": 0,
  "createdAt": "2026-08-15T00:00:00.000Z",
  "updatedAt": "2026-08-15T00:00:00.000Z"
}
```

`column` is one of `planning`, `implementation`, `testing`, `bugs`, `done`.
Tasks are work items, not requirements — don't auto-generate one task per
requirement; create tasks as work is actually planned, and link back to the
requirement(s) it satisfies via `requirementIds`.

## `documents.json`

```json
[
  { "label": "SRS v2.0", "path": "nexus-srs-v2.md" },
  { "label": "Addendum C: Model Selection", "path": "nexus-srs-addendum-c-model-selection-v1.1.md" }
]
```

`path` is relative to the project root (not `.tracker/`), and must point at
a real file — the Documents page renders it live, never a copy.

## Content blocks (for `sections` pages)

Every block is `{ "id": string, "title"?: string, "type": ..., "content": ... }`.
`title` renders as a heading above the block; omit it for a block that flows
directly under the previous one's heading.

| Type | `content` shape | Example use |
|---|---|---|
| `markdown` | `{ text: string }` | Prose paragraphs, product descriptions |
| `table` | `{ columns: string[], rows: Cell[][] }`, `Cell = { value: string, kind?: "text"\|"badge"\|"link"\|"date"\|"number", href?: string }` | Tech stack, pricing tables |
| `keyvalue` | `{ dense?: boolean, items: { label: string, value: string }[] }` | Glossary, project facts |
| `stat-grid` | `{ stats: { label: string, value: string, sublabel?: string }[] }` | Headline numbers |
| `list` | `{ ordered?: boolean, items: { text: string, icon?: string, status?: "none"\|"done"\|"warning"\|"error" }[] }` | Checklists, requirement summaries |
| `timeline` | `{ entries: { title: string, description?: string, status?: "done"\|"active"\|"planned"\|"blocked", date?: string }[] }` | Release plan phases, revision history |
| `diagram` | `{ mermaid: string }` | Architecture/flow diagrams (mermaid syntax) |
| `code` | `{ language: string, code: string }` | Config snippets, ASCII diagrams |
| `comparison` | `{ cards: { title: string, attributes: { label: string, value: string }[], recommended?: boolean }[] }` | Considered-and-rejected options, trade-offs |
| `progress` | `{ items: { label: string, percent: number }[] }` | Per-module completion |
| `callout` | `{ tone: "info"\|"warning"\|"danger"\|"success", text: string }` | Volatility notices, warnings |
| `link-list` | `{ links: { label: string, href: string, description?: string }[] }` | References section |
| `quote` | `{ text: string, attribution?: string }` | Product thesis, pull-quotes |
| `image` | `{ src: string, alt: string, caption?: string }` | Screenshots, external diagrams |

### Example: a `table` block from Nexus's tech stack

```json
{
  "id": "tech-stack",
  "title": "Technology Stack",
  "type": "table",
  "content": {
    "columns": ["Layer", "Choice", "Rationale"],
    "rows": [
      [{ "value": "Backend" }, { "value": "Python 3.12, FastAPI" }, { "value": "Author default, MCP SDK support" }],
      [{ "value": "Database" }, { "value": "PostgreSQL 16 + pgvector" }, { "value": "Single instance, schemas atlas and nexus" }]
    ]
  }
}
```

### Example: a `comparison` block from Nexus's "Considered and Rejected"

```json
{
  "id": "muse-spark-rejected",
  "title": "Considered and Rejected",
  "type": "comparison",
  "content": {
    "cards": [
      {
        "title": "Muse Spark 1.2 (Meta)",
        "attributes": [
          { "label": "Pricing", "value": "$1.25 / $4.25 per 1M tokens" },
          { "label": "Verdict", "value": "Rejected — priced above budget bracket, wrong task fit" }
        ]
      }
    ]
  }
}
```

## Mapping SRS content to blocks — cheat sheet

| SRS content | Block |
|---|---|
| A requirements/architecture table | `table` |
| An ASCII architecture diagram | `code` (language: `text`) or redrawn as `diagram` (mermaid) |
| A "considered and rejected" or trade-off writeup | `comparison` |
| A revision history or release plan | `timeline` |
| A glossary/definitions table | `keyvalue` (`dense: true`) |
| A pull-quote or product thesis | `quote` |
| A references/citations list | `link-list` |
| A warning or "treat this as a snapshot" notice | `callout` |
| Free prose (introduction, rationale paragraphs) | `markdown` |
| Headline numbers (token budgets, cost targets) | `stat-grid` |
| Per-module or per-phase completion | `progress` |

## Naming conventions

- `meta.json`'s `id` matches the project's registry id (kebab-case, derived
  from the folder name).
- Block `id`s are kebab-case and describe the content, not the position
  (`tech-stack`, not `block-1`).
- Requirement `id`s are copied verbatim from the source document (`FR-CTX-1`,
  `DC-9`) — they're the join key back to the source, don't invent new ones.
```

- [ ] **Step 2: Commit**

```bash
git add docs/tracker-json-guide.md
git commit -m "docs: add tracker JSON creation guide"
```
