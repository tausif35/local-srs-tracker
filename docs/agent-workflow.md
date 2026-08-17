# Coding-Agent Workflow

SRS Tracker keeps structured project knowledge in a repository-owned `.tracker/` directory. The web application and coding agents read and write the same files, while Git records their history.

This guide describes the optional agent skills shipped in `skills/` and a practical workflow for using them inside another project.

## Install the skills

Cloning SRS Tracker does not automatically install its skills. Copy each skill folder into a directory recognized by your coding agent. The cross-runtime `.agents/skills` location is a convenient default.

From the SRS Tracker repository in PowerShell:

```powershell
$skillsTarget = Join-Path $HOME ".agents\skills"
New-Item -ItemType Directory -Force -Path $skillsTarget | Out-Null
Copy-Item -Recurse -Force ".\skills\populating-tracker-data" $skillsTarget
Copy-Item -Recurse -Force ".\skills\working-from-tracker" $skillsTarget
Copy-Item -Recurse -Force ".\skills\tracking-session-state" $skillsTarget
```

Restart or reload the coding agent if it discovers skills only at startup. Consult that agent's documentation if it uses a different personal skill directory.

## Choose the right skill

| Situation | Skill |
| --- | --- |
| Import an SRS for the first time | `populating-tracker-data` |
| Explicitly synchronize tracker data after the source specification changes | `populating-tracker-data` |
| Plan, implement, test, debug, or resume a tracked task | `working-from-tracker` |
| Record a task transition, decision, blocker, environment change, or immediate next action | `tracking-session-state` |

Do not run ingestion during ordinary implementation. The specification-derived files should change only during an explicit synchronization; live work belongs in tasks, state, decisions, code, and Git history.

## Set up a project

1. Start SRS Tracker and register the project directory.
2. Allow the application to scaffold `.tracker/`, or invoke `populating-tracker-data` with the project's SRS.
3. Review the generated records and run Tracker Health.
4. Commit `.tracker/` with the project so collaborators and later sessions receive the same requirements, tasks, state, and decisions.

The SRS Tracker application's `data/registry.json` is machine-local and should remain ignored. It stores paths to registered projects; it is not project data.

Example ingestion prompt:

```text
Use populating-tracker-data to create this project's .tracker files from docs/product-srs.md. Read the tracker JSON guide, preserve source requirement IDs, leave tasks.json empty, and run Tracker Health afterward.
```

## Add project instructions

Place durable tracker rules in the target project's `AGENTS.md` or equivalent instruction file. Adapt this example to the agent you use:

```markdown
## SRS Tracker

- Treat `.tracker/` as versioned project data and keep it synchronized with meaningful work.
- Use `populating-tracker-data` only for initial ingestion or an explicit source-specification synchronization.
- Use `working-from-tracker` when planning, implementing, testing, debugging, or resuming a tracked task.
- Use `tracking-session-state` whenever a task moves, a decision lands, a blocker changes, or immediate next actions change.
- Keep `state.json` as a current snapshot and `decisions.json` append-only.
- Requirement status is derived from linked tasks; do not override it manually.
- Run Tracker Health after direct edits to `.tracker/*.json`.
```

## Daily workflow

### 1. Select and prepare a task

Ask the agent to use `working-from-tracker` for a specific task ID. The agent should load a focused context packet rather than the complete SRS and backlog.

Before implementation, the task needs bounded scope, exclusions, completed blockers, linked requirements and architecture, acceptance criteria, and repeatable verification commands.

```text
Use working-from-tracker to prepare and implement task t_api_14. Stop if its blockers or acceptance criteria are incomplete.
```

### 2. Implement and verify

The normal lifecycle is:

```text
planning -> implementation -> testing -> done
                    bugs <-> implementation/testing
```

Verification must actually pass before a task moves to `done`. If verification fails, retain concise evidence and move the task to `bugs` when appropriate.

### 3. Keep state and decisions current

Use `tracking-session-state` as meaningful changes occur:

- Rewrite `state.json` around the active focus, remaining blockers, gating environment facts, and one to three next actions.
- Append real design or product choices to `decisions.json`.
- Preserve reversed decisions and append a superseding entry instead of rewriting history.

### 4. Run Tracker Health and commit

Use the Tracker Health page after direct JSON edits. Resolve schema errors, missing references, dependency cycles, invalid task readiness, and document fingerprint drift before handoff.

Commit tracker updates with the code change they describe when practical. This keeps task state, verification evidence, decisions, and implementation history aligned.

## Source-of-truth boundaries

| Information | Source of truth |
| --- | --- |
| Requirements and architecture imported from the SRS | Source document, synchronized explicitly into `.tracker/` |
| Planned and active work | `.tracker/tasks.json` |
| Current focus and blockers | `.tracker/state.json` |
| Why a choice was made | `.tracker/decisions.json` |
| Implementation history | Git |
| Registered project paths | SRS Tracker's local `data/registry.json` |

See [tracker-json-guide.md](tracker-json-guide.md) for every supported file and content-block schema.
