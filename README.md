# SRS Tracker

SRS Tracker is a local-first project dashboard and multi-agent coordination suite for turning software requirements into visible, traceable work. It keeps requirements, tasks, decisions, project state, and supporting documents in plain JSON and Markdown files inside each project's repository—no database or cloud service required.

The browser UI and coding agents work from the same `.tracker/` directory, so changes made on disk appear in the application in real time via Server-Sent Events (SSE), and changes made in the application remain instantly available to coding agents and CLI tools.

---

## ⚡ Quick Install: AI Agent Plugin

Install the full `srs-tracker` plugin (including **all 3 skills**, **`tracker.py` CLI**, **auto-discipline rules**, and **integrity hooks**) with a single command:

The installer (`scripts/install-plugin.py`) needs its sibling files from the repo, so clone first rather than piping a single script into your shell:

### Windows (PowerShell):
```powershell
git clone --depth 1 https://github.com/tausif35/local-srs-tracker.git
cd local-srs-tracker
scripts\install-plugin.ps1
```

### Linux / macOS (Bash / Zsh):
```bash
git clone --depth 1 https://github.com/tausif35/local-srs-tracker.git && cd local-srs-tracker
scripts/install-plugin.sh
```

*Compatible with Google Antigravity, Claude Code, Cursor, and generic `.agents/` workflows.*

---

## Features

### 📊 Web Dashboard & Visual Intelligence
- **Interactive Dependency DAG Graph**: Visual node-link map (`reactflow`) showing task blocker chains, critical paths, and interactive click-to-open modals.
- **Requirement Traceability Matrix**: Real-time matrix mapping requirements to task column buckets with `⚠️ UNCOVERED` detection for orphan requirements.
- **Drag-and-Drop Task Board**: Tri-mode view (**Board**, **List**, and **Graph**) with automated workflow boundaries, blocker checks, and undo support.
- **Multi-Agent Attribution Badges**: Visual model attribution pills (`📝 plannedBy`, `🛠️ implementedBy`) and milestone timestamps on Task cards.
- **Rich Content Blocks**: Render project documentation from 14 reusable block types (Markdown, Tables, Timelines, Mermaid diagrams, Stat grids, Key-Value tables, Comparisons, and Progress bars).
- **Live Sync**: Server-Sent Events hot-reload the UI automatically when agents or CLI commands modify `.tracker/` files.
- **Tracker Health Engine**: Validates Zod schemas, detects dependency cycles, uncompleted blockers, requirement status drift, and source document SHA-256 fingerprint drift.

### 🤖 Multi-Agent Plugin & Standalone CLI
- **Zero-Dependency Standalone CLI (`tracker.py`)**: Slices isolated context packets (`get-packet <id>` in < 800 tokens), logs 1-second chores (`quick-task`), and executes fast `<5ms` health checks headlessly without requiring the web app to be running.
- **The "Two-Speed" Solo Workflow**: High-rigor planning for core features vs. zero-friction fast-tracking for quick UI fixes and chores.
- **Unified Multi-LLM Protocol**: Cross-model handoffs across **Claude 3.7**, **Gemini 2.5**, and **GPT-4o** via standardized `agent-handoff` state blocks and synchronized `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` entrypoints.
- **Interactive Ingestion Protocol**: `populating-tracker-data` skill conducts structured clarification interviews (with trade-offs and recommendations) to turn even sparse/shallow SRS docs into a full-fledged project management suite.

---

## How It Works

Each tracked project owns its data in a version-controlled `.tracker/` folder:

```text
your-project/
├── .tracker/
│   ├── meta.json          # Project manifest & navigation
│   ├── requirements.json  # Ground truth specifications
│   ├── tasks.json         # Backlog, DAG dependencies & milestone metadata
│   ├── state.json         # Current focus, blockers & agent-handoff lens
│   ├── decisions.json     # Immutable Architecture Decision Record (ADR)
│   ├── documents.json     # Source document pointers & SHA-256 fingerprints
│   └── architecture.json  # Architecture blocks & Mermaid diagrams
├── AGENTS.md              # Universal multi-agent operating rules
└── docs/
    └── product-srs.md     # Source specification document
```

---

## Web App Quick Start

### 1. Run the Development Server

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select **Browse**, and register a project folder. If the folder does not already contain `.tracker/`, SRS Tracker creates default scaffold files without replacing existing data.

### 2. Production Server

```powershell
npm run build
npm start
```

---

## Portable Windows Build (Zero Node.js Required for Users)

Build a self-contained standalone distribution with an embedded Node.js runtime and desktop launcher:

```powershell
npm run package:win
```

The output is generated at:
```text
dist/SRS Tracker/
```

Double-click **`SRS Tracker.exe`**. The launcher boots the bundled server in the background and opens the dashboard at `http://127.0.0.1:3210`.

---

## Standalone Python CLI (`tracker.py`)

The CLI lives at `plugin/srs-tracker/scripts/tracker.py` and runs 100% server-free:

```bash
# Slices task + linked requirements + blockers + decisions (<800 tokens)
python tracker.py get-packet <task_id>

# Fast-Track 1-second chore logging (Two-Speed workflow)
python tracker.py quick-task "Fix navbar padding" --done --by "Gemini 2.5"

# Safe column move with state machine validation
python tracker.py move-task <task_id> implementation --by "Claude 3.7"

# Record verification evidence & timestamp
python tracker.py verify-task <task_id> --status passed --evidence "Unit tests passed"

# Append architectural decision to immutable ADR log
python tracker.py append-decision --title "Use Postgres RLS" --reason "Multi-tenant isolation" --req-id "REQ-01"

# Fast headless health check (<5ms, <20 tokens)
python tracker.py health
```

---

## Using with Coding Agents (Claude, Gemini, GPT)

The repository includes a complete plugin bundle at `plugin/srs-tracker`. Install it with `scripts/install-plugin.ps1` / `.sh` (see Quick Install above) — it detects Claude Code, Gemini/Antigravity, Codex, Cursor, and generic `.agents/` workspaces and copies the bundle into each.

### Skills Included:
* **`populating-tracker-data`**: AI ingestion with interactive clarification interviews and Mermaid syntax defense.
* **`working-from-tracker`**: Focused single-task execution packet loading and bug resolution lifecycles.
* **`tracking-session-state`**: Continuous ADR logging and `state.json` snapshot synchronization.

---

## Tracker Workflow State Machine

Tasks move through 5 validated columns:

```text
Planning ───────> Implementation ───────> Testing ───────> Done
                        │                    ▲
                        ▼                    │
                              Bugs ──────────┘
```

- **Implementation Entry**: Requires clear scope, acceptance criteria, verification commands, and completed blockers.
- **Done Entry**: Requires acceptance criteria and passing verification evidence.
- **Bugs Transition**: Failed verifications move to `bugs`, transitioning back to `implementation` with an updated sub-scope.
- **Requirement Status**: Automatically derived from linked tasks (`not-started` → `in-progress` → `done`).

---

## Project Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm test` | Run the Vitest test suite |
| `npm run package:win` | Build the standalone portable Windows distribution |

---

## Technology Stack

- **Framework**: Next.js 14 (App Router) & React 18
- **Language & Types**: TypeScript & Zod validation
- **Styling**: Tailwind CSS with custom glassmorphism & dot-matrix design system
- **Graph & Diagrams**: `reactflow` & `mermaid` / `react-markdown`
- **Board Drag & Drop**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **Live Sync**: `chokidar` & Server-Sent Events (SSE)
- **Testing**: Vitest
- **Launcher**: C# .NET desktop launcher with embedded Node.js runtime

---

## Security

SRS Tracker is designed for trusted local environments. It has no external authentication and interacts directly with local project files. Keep it bound to loopback (`127.0.0.1` / `localhost`). Do not expose the development or production server directly to the public internet.

---

## License

MIT License. Local-first, open, and private.
