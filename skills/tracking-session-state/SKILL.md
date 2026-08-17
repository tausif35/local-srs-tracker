---
name: tracking-session-state
description: Use when work in an SRS Tracker project changes a task column, resolves or creates a blocker, makes a decision, changes a gating environment fact, or identifies immediate follow-up work.
---

# Tracking Session State

Keep two project records current without duplicating the backlog:

- `state.json` is a rewritten snapshot of what is true now.
- `decisions.json` is an append-only record of why choices were made.

Both files use the `sections` content-block schema documented in `docs/tracker-json-guide.md`.

## Update current state

Rewrite `state.json` after meaningful state changes. Include only non-empty blocks that describe the present:

- `current-focus`: one or two sentences naming the active phase or task.
- `in-progress`: a short list referencing active task IDs.
- `blocked`: only blockers that remain active.
- `environment-status`: verified environment facts that currently gate work.
- `next`: one to three immediate actions.

Remove resolved blockers instead of preserving them as recent history. Do not copy the full task backlog, completed-work history, general project facts, or old snapshots into this file. Git and `decisions.json` provide history.

## Append decisions

Keep `decisions.json` as one `timeline` block such as:

```json
[
  {
    "id": "decision-log",
    "title": "Decision Log",
    "type": "timeline",
    "content": {
      "entries": [
        {
          "title": "Use database row-level security",
          "status": "done",
          "date": "2026-08-17",
          "description": "Use PostgreSQL RLS instead of application-only checks for SEC-4 because authorization must also hold outside the application process."
        }
      ]
    }
  }
]
```

Append only real decisions, not routine progress updates or restated specification facts. Reference relevant task, requirement, architecture, or open-item IDs in the description. On reversal, preserve the original entry and append a new entry that states it supersedes the earlier choice.

## Coordinate tracker files

- Record task-column and verification changes in `tasks.json`; summarize only the current focus in `state.json`.
- Update `state.json` when a blocker or gating environment fact changes.
- Register `state.json` and `decisions.json` as `sections` pages in `meta.json` if absent.
- Use `working-from-tracker` for planning or implementation; this skill owns state and decision maintenance.
- Run Tracker Health after direct JSON edits.

At handoff, report the state blocks rewritten, decisions appended, active blockers, and immediate next actions.
