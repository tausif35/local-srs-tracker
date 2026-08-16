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
