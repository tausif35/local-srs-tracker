# SRS Tracker — Design Spec

**Date:** 2026-08-15
**Status:** Approved for implementation planning

## 1. Purpose

A local, lightweight SRS (Software Requirements Specification) manager and
progress tracker. It has two consumers of the same data:

- **Claude** (via Claude Code, working directly in a project's own folder)
  reads and writes a project's tracking data as plain JSON files on disk.
- **The user** views and edits the same data through an interactive local
  website.

Changes from either side are reflected in the other, without a database in
between. An example project (`C:\Projects\ExampleProject`) can be the first project this
tool will track, but the tool itself is generic — it must work for any
future project without code changes, only new data.

`bundle_1.html` (a hardcoded React bundle mocked up for one project) is
explicitly **not** the target architecture — it demonstrates the desired
look and interactivity, not the desired structure. The real tool must be
data-driven: a project's set of pages and their content come from its JSON
files, not from per-project code.

## 2. Non-goals

- No multi-user, no auth, no remote hosting in v1. This runs on the same
  machine Claude Code operates on, so Claude can read/write project files
  directly. (Binding the server to `0.0.0.0` so it's reachable over
  Tailscale from another device is a cheap option to leave open, not a
  requirement to build now.)
- No database. JSON files on disk are the only source of truth.
- No generic, code-free "build any page" engine (see §5 for why).
- No automated test suite for v1. This is a personal tool; manual use is
  the validation loop, matching Nexus's own SRS philosophy for itself.

## 3. Architecture

**Next.js (App Router), single process:**

- Route Handlers implement the REST API (§7) — reading and writing a
  project's JSON files and raw doc files.
- One Server-Sent Events (SSE) endpoint per active project streams
  file-change notifications to the browser. One-directional (server →
  client) is sufficient: UI-originated writes already go through normal
  POST/PUT calls, so a full WebSocket isn't needed.
- A `chokidar` watcher runs per active project, held as a module-level
  singleton persisted via `globalThis` (survives Next's dev-mode hot
  reload — a standard pattern for long-lived server state in Next dev).
  Watches `.tracker/*.json` and any doc files declared in `meta.json`;
  each change event is pushed over SSE, and the frontend refetches just
  the changed resource.
- Tailwind + shadcn/ui for the frontend — same visual family as
  `bundle_1.html`.
- One `npm run dev` (or `npm run build && npm start`) runs the whole tool.

## 4. Project registry and layout

The tracker tool lives in its own repository, separate
from any project it tracks. It maintains its own small local registry —
`{ id, name, path }[]` — stored in the tool's own app-data directory, not
inside any tracked project. This backs the project picker in the UI:
adding a project means browsing to a folder; if that folder has no
`.tracker/` directory yet, the tool scaffolds one with empty default files.

Each tracked project keeps its data in **`<project-root>/.tracker/`**,
analogous to `.git/`:

```
<project-root>/
  .tracker/
    meta.json
    requirements.json
    tasks.json
    architecture.json
    strategy.json
    roadmap.json
    documents.json
  nexus-srs-v2.md              <- real project files, referenced
  nexus-srs-addendum-c-...md      not duplicated, by documents.json
```

Because `.tracker/` lives inside the project's own folder, Claude Code
edits it directly while working in that project's workspace — no separate
sync step, no network hop.

## 5. Page system

Two kinds of page:

- **Purpose-built pages**: Overview, Requirements Explorer, Task Board,
  Documents. These have real, deeply interactive components (kanban
  drag-drop, filtering, search) that are worth hand-building well, and are
  needed by virtually every SRS-driven project — genericizing them into
  configurable widgets was considered and rejected as unnecessary
  engineering for a single-user tool that would likely produce a worse
  version of both.
- **Generic content pages**: Architecture, Strategy, Roadmap, and any
  future page whose *content* (not interaction model) varies per project.
  Each is an ordered list of typed **content blocks** (§6), rendered by a
  block-type-keyed component registry. Adding a new page of this kind, or
  reshaping an existing one, is a data change, not a code change.

`meta.json` declares, per project, which pages exist and what backs them:

```json
{
  "id": "nexus",
  "name": "Nexus",
  "description": "Self-hosted, AI-augmented personal life management system",
  "pages": [
    { "id": "overview",      "type": "overview" },
    { "id": "requirements",  "type": "requirements-explorer", "source": "requirements.json" },
    { "id": "board",         "type": "task-board",            "source": "tasks.json" },
    { "id": "architecture",  "type": "sections",              "source": "architecture.json" },
    { "id": "strategy",      "type": "sections",              "source": "strategy.json" },
    { "id": "roadmap",       "type": "sections",              "source": "roadmap.json" },
    { "id": "documents",     "type": "documents",             "source": "documents.json" }
  ]
}
```

A different project can list a different, shorter, or reordered set of
pages, drop the Strategy page entirely, add a second `sections` page, etc.
— all without touching tracker code.

## 6. Content block taxonomy

The block set for `sections`-type pages, chosen to be broad enough that a
new project's content rarely needs a new block type (verified against both
Nexus SRS documents — every table, diagram, glossary, changelog, and
callout in them maps onto one of these):

| Block | Renders | Notes |
|---|---|---|
| `markdown` | Free-form rich text | |
| `table` | Arbitrary columns/rows | Typed cells: text, badge, link, date, number |
| `keyvalue` | Label:value pairs | "dense" variant also covers glossaries/definitions |
| `stat-grid` | Big-number metric cards | e.g. "417 requirements", "$0.90–2.50/mo" |
| `list` | Bullet / numbered / checklist | Optional icon or status per item |
| `timeline` | Sequential entries, title/description/status | Release plans, revision history, changelogs |
| `diagram` | Mermaid text, rendered client-side | Architecture/flow diagrams |
| `code` | Syntax-highlighted code or config | Also covers preformatted ASCII diagrams |
| `comparison` | Side-by-side option cards, attributes/pros-cons | "Considered and rejected," trade-off tables |
| `progress` | Progress bars per item | |
| `callout` | Highlighted note/warning/info box | |
| `link-list` | External references/resources | |
| `quote` | Pull-quote | |
| `image` | Embedded image/screenshot | |

Each block is `{ id, title, type, content }`, where `content`'s shape is
defined per type. Exact per-type schemas are written out, with examples,
in the JSON creation guide (§9) rather than duplicated here.

## 7. Data schemas (core files)

- **`requirements.json`** — flat array of requirement records: `id`,
  `section`, `category`, `text`, `critical`, `status` (optional). Same
  shape as the existing `nexus-spec-data.json` `requirements` array.
- **`tasks.json`** — task board items: `id`, `title`, `description`,
  `column` (`planning` | `implementation` | `testing` | `bugs` | `done`),
  linked requirement IDs, `priority`, `notes`, `createdAt`/`updatedAt`,
  and an order value for manual reordering within a column. Distinct from
  requirements: requirements are reference material generated from the
  SRS; tasks are live work items with their own lifecycle.
- **`documents.json`** — array of `{ label, path }`, `path` relative to
  the project root, pointing at real `.md` files so Documents always
  renders the live file, never a copy.

Full schemas, including every block type's `content` shape, live in the
JSON creation guide (§9), which is the canonical reference — this spec
only fixes the top-level shape.

## 8. API surface

- `GET /api/projects` / `POST /api/projects` — list / register a project
- `GET /api/projects/:id/data/:file` / `PUT /api/projects/:id/data/:file`
  — read / write a `.tracker` JSON file (validated against its schema
  before write; malformed writes are rejected with a clear error, not
  silently accepted)
- `GET /api/projects/:id/doc/*path` — read a raw doc file for the
  Documents page
- `GET /api/projects/:id/events` — SSE stream of file-change
  notifications for the active project

## 9. Deliverable: JSON creation guide

Implementation must produce `docs/tracker-json-guide.md` in this repo,
documenting:

- Every `.tracker` file's schema, with a real example
- Every block type's exact `content` shape, with a real example
- ID and naming conventions
- Guidance for mapping SRS content into block types (the mapping
  demonstrated informally in §6 — tables → `table`, ASCII/text diagrams →
  `diagram`/`code`, "considered and rejected" sections → `comparison`,
  revision history → `timeline`, glossaries → `keyvalue`, pull-quotes →
  `quote`, etc.)

This guide is what Claude reads before generating a new project's
`.tracker` data from its planning docs — including regenerating Nexus's
own data properly once the tool exists.

## 10. Concurrency and error handling

- Both Claude (direct file writes) and the UI (API writes) touch the same
  files. Given single-user/local use, concurrency is handled with
  **last-write-wins, no locking** — an accepted trade-off, not an
  oversight. Worst case is a lost update, acceptable at this scale.
- Writes are validated (zod or equivalent) against the file's schema
  before hitting disk, so a bad write fails loudly rather than corrupting
  project data.

## 11. Open items

- Exact location for the tool is configurable and has no design impact.
- Nexus's own `.tracker` data does not exist yet; generating it is a
  follow-up task once the tool and JSON creation guide exist, not part of
  this build.
