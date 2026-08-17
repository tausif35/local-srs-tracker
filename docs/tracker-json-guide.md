# Tracker JSON Creation Guide

This is the reference for generating a project's `.tracker/` data files from
its planning documents (an SRS, a design doc, notes — whatever the project
has). Read this before creating or editing any `.tracker` file by hand.

## File layout

Every tracked project has a `.tracker/` folder at its root:

- `meta.json` — project identity and page manifest
- `requirements.json` — flat requirement records
- `tasks.json` — task board items
- `documents.json` — pointers to real project documents, including nested paths
- `state.json` and `decisions.json` — focused current state and append-only decisions
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
    { "id": "documents", "type": "documents", "source": "documents.json", "label": "Documents" },
    { "id": "health", "type": "health", "label": "Tracker Health" }
  ]
}
```

`type` must be one of `overview`, `requirements-explorer`, `task-board`,
`documents`, `health`, `sections`. `overview`, `health`, and `task-board`/`requirements-explorer`/
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
  "blockedBy": ["t_foundation"],
  "scope": "Implement the budget calculation and enforcement boundary.",
  "exclusions": ["Prompt-selection ranking changes"],
  "architectureRefs": ["context-budget-allocation"],
  "acceptanceCriteria": ["Requests over 12,120 tokens are rejected before model invocation."],
  "verification": {
    "commands": ["pytest -k context_budget"],
    "status": "pending"
  },
  "unresolvedDecisions": [],
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

A task may enter `implementation` only when its blockers are done and it has
scope, acceptance criteria, and verification commands. It may enter `done`
only after verification is marked `passed`. Requirement status is derived
from linked tasks: all planning (or none) is `not-started`, all done is `done`,
and every mixed state is `in-progress`.

## `documents.json`

```json
[
  {
    "label": "SRS v2.1",
    "path": ".docs/nexus_srs_v2.1.md",
    "syncedAt": "2026-08-16T00:00:00Z",
    "sourceSha256": "62ac57f98e25d945468c3c6ac675a245a7de305da658273b3766ef124355fd74"
  }
]
```

`path` is relative to the project root (not `.tracker/`), and must point at
a real file — the Documents page renders it live, never a copy.
`sourceSha256` is the lowercase SHA-256 fingerprint from the last explicit
SRS synchronization; Tracker Health warns when it is absent or has drifted.

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
| `timeline` | `{ entries: { title: string, description?: string, status?: "done"\|"active"\|"planned"\|"blocked", date?: string, items?: string[], exit?: string }[] }` | Release plan phases, revision history. `items` is an optional bullet breakdown of what the phase covers; `exit` is an optional exit criterion, rendered as a highlighted callout. Both are best for release-plan-style timelines with real scope per phase — a simple `description` is enough for revision history. |
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
| An ASCII architecture diagram, or any structural/flow content (components, data model, key flows, lifecycle) | `diagram` (mermaid) — see "Diagrams" below. Reserve `code` (language: `text`) for literal text art that isn't really structural (rare) |
| A "considered and rejected" or trade-off writeup | `comparison` |
| A revision history or release plan | `timeline` |
| A glossary/definitions table | `keyvalue` (`dense: true`) |
| A pull-quote or product thesis | `quote` |
| A references/citations list | `link-list` |
| A warning or "treat this as a snapshot" notice | `callout` |
| Free prose (introduction, rationale paragraphs) | `markdown` |
| Headline numbers (token budgets, cost targets) | `stat-grid` |
| Per-module or per-phase completion | `progress` |

## Diagrams

`diagram` blocks render live with Mermaid — prefer them over ASCII art in a
`code` block for anything structural. An SRS rarely ships with more than one
ASCII box diagram, but most SRS documents contain enough structured
information to support several more. Look for:

| Diagram type | Mermaid syntax | Build it from |
|---|---|---|
| Component / architecture | `flowchart TD` (or `graph TD`) | An architectural overview section, even if the source only has an ASCII box diagram — redraw it as a real diagram instead of copying the ASCII art into a `code` block |
| Data model / entity relationships | `erDiagram` | A data model / schema table listing entities, their fields, and how they reference each other |
| Key flow, multi-actor interaction | `sequenceDiagram` | A functional requirements section that describes a multi-step process between two or more parties (e.g. request → confirm → fulfill) |
| Lifecycle / status field with named states | `stateDiagram-v2` | Any entity whose data model row documents a `status` enum, or a functional requirement that describes state transitions |

Rules:
- **Ground every diagram in the source document.** A diagram is a redrawing
  of structure the SRS already states (an architecture section, a data model
  table, a numbered flow, a status enum) — never invent components, entities,
  or steps the source doesn't support. If a project's SRS doesn't have enough
  structure for a given diagram type, skip that type rather than fabricate
  one.
- **Hard limit: 15 diagrams per project.** Most projects will use far fewer —
  one architecture diagram, one data model diagram, and a handful of key-flow
  or lifecycle diagrams only where the source genuinely describes a flow or a
  state machine. Don't pad toward the limit.
- Put diagrams in whichever `sections` file already covers that content (an
  architecture diagram belongs in `architecture.json` alongside the
  architecture rules and tech stack table; a diagram of a functional flow
  belongs in the `sections` file that covers that area, or `architecture.json`
  if there's no better home).
- Give each diagram a title that names what it shows, not its type (`Reservation
  Lifecycle`, not `State Diagram`).
- Node/label line breaks: Mermaid does not treat `\n` inside a label as a line
  break — it renders literally. Keep labels on one line, or use `<br/>`.

### Example: a `diagram` block (data model, from a schema table)

```json
{
  "id": "data-model-diagram",
  "title": "Data Model Relationships",
  "type": "diagram",
  "content": {
    "mermaid": "erDiagram\n    GROUP ||--o{ MEMBER : has\n    MEMBER ||--o{ LISTING : owns\n    LISTING ||--o{ RESERVATION : \"reserved via\"\n\n    GROUP {\n        string name\n    }\n    MEMBER {\n        string name\n        string email\n    }\n    LISTING {\n        string title\n    }"
  }
}
```

## Naming conventions

- `meta.json`'s `id` matches the project's registry id (kebab-case, derived
  from the folder name).
- Block `id`s are kebab-case and describe the content, not the position
  (`tech-stack`, not `block-1`).
- Requirement `id`s are copied verbatim from the source document (`FR-CTX-1`,
  `DC-9`) — they're the join key back to the source, don't invent new ones.
