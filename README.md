# SRS Tracker

SRS Tracker is a local-first project dashboard for turning software requirements into visible, traceable work. It keeps requirements, tasks, decisions, project state, and supporting documents in plain JSON and Markdown files inside each project's repository—no database or cloud service required.

The browser UI and coding agents work from the same `.tracker/` directory, so changes made on disk appear in the application and changes made in the application remain available to other tools.

## Features

- Register and switch between multiple local projects
- Scaffold a `.tracker/` directory for new projects
- Browse and filter requirements by status, category, and criticality
- Manage tasks on a drag-and-drop board with dependency and workflow checks
- Link tasks back to the requirements they implement
- Render project pages from reusable content blocks, including Markdown, tables, timelines, Mermaid diagrams, comparisons, and progress views
- Read referenced Markdown documents directly from the project repository
- Search across project content
- Detect file changes through Server-Sent Events and refresh the UI automatically
- Check tracker health for schema errors, broken references, dependency issues, and source-document drift
- Build a self-contained Windows distribution with an embedded Node.js runtime
- Use repository-provided coding-agent skills for ingestion, focused task work, and session handoff

## How it works

Each tracked project owns its data:

```text
your-project/
├── .tracker/
│   ├── meta.json
│   ├── requirements.json
│   ├── tasks.json
│   ├── state.json
│   ├── decisions.json
│   └── documents.json
└── docs/
    └── requirements.md
```

`meta.json` defines the project's navigation and may declare additional JSON-backed content pages. SRS Tracker validates writes before saving them and watches the files for changes made by editors, scripts, or coding agents.

See [docs/tracker-json-guide.md](docs/tracker-json-guide.md) for the complete file formats, block schemas, naming conventions, and examples.

## Using with coding agents

The repository includes three optional, portable agent skills:

- [`populating-tracker-data`](skills/populating-tracker-data/SKILL.md) — create or explicitly resynchronize `.tracker` data from an SRS or planning document.
- [`working-from-tracker`](skills/working-from-tracker/SKILL.md) — plan, implement, test, debug, or resume one tracked task with focused context.
- [`tracking-session-state`](skills/tracking-session-state/SKILL.md) — keep current state and the append-only decision log synchronized as work changes.

Skills must be copied into a directory recognized by your coding agent before they can trigger automatically. See the [coding-agent workflow guide](docs/agent-workflow.md) for installation commands, recommended project instructions, example prompts, and the daily task lifecycle.

## Requirements

- Node.js 18.17 or newer
- npm

Creating the portable Windows package additionally requires:

- Windows PowerShell
- The 64-bit .NET Framework C# compiler at the standard Windows location

## Quick start

Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select **Browse**, and register a project folder. If the folder does not already contain `.tracker/`, SRS Tracker creates the default files without replacing existing tracker files.

For a production run:

```powershell
npm run build
npm start
```

Next.js uses port `3000` by default. Set `PORT` before starting if you need a different port.

## Portable Windows build

Build the standalone distribution:

```powershell
npm run package:win
```

The result is written to:

```text
dist/SRS Tracker/
```

Launch `SRS Tracker.exe` from that directory. The launcher starts the bundled server on `127.0.0.1:3210` and opens it in the default browser. Its registry and logs are stored under `%LOCALAPPDATA%\SRS Tracker`, keeping machine-specific state outside the distribution.

The entire `dist/SRS Tracker` directory must be copied when moving the application to another Windows machine; the executable is a launcher, not a single-file build.

## Tracker workflow

Tasks move through five columns:

```text
Planning → Implementation → Testing → Done
                 ↕           ↕
                       Bugs
```

The application enforces the main workflow boundaries:

- A task entering **Implementation** needs a meaningful description or scope, acceptance criteria, verification commands, and completed blockers.
- A task entering **Done** from **Testing** needs acceptance criteria and passed verification.
- Self-dependencies, missing blockers, and dependency cycles are rejected.
- Requirement status is derived from linked tasks.

## Project scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm test` | Run the Vitest test suite |
| `npm run package:win` | Build the portable Windows distribution |

## Technology

- Next.js 14 and React 18
- TypeScript
- Tailwind CSS
- Zod validation
- Vitest
- chokidar and Server-Sent Events for live updates
- dnd-kit for the task board
- react-markdown and Mermaid for project content

## Security

SRS Tracker is designed for a trusted local machine. It has no authentication and its server can read and update files in registered project directories. Keep it bound to loopback (`localhost` or `127.0.0.1`) unless you add an appropriate authentication and network-security layer.

Do not expose the development or production server directly to the public internet.

## Development

Run the focused checks before submitting changes:

```powershell
npm test
npm run build
```

The main application areas are:

```text
app/          Next.js pages and API routes
components/   Project views, board UI, and content-block renderers
hooks/        Project data and live-update hooks
lib/          Types, validation, workflow rules, and server utilities
docs/         Tracker schema guide and design documents
launcher/     Windows launcher source
scripts/      Packaging and launch scripts
skills/       Optional coding-agent workflow skills
```

When behavior changes, update or add focused Vitest coverage and keep [docs/tracker-json-guide.md](docs/tracker-json-guide.md) synchronized with any tracker schema changes.
