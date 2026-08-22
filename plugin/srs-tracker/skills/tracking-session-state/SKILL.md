---
name: Tracking-Session-State
description: Use when work happens on a project tracked by SRS Tracker (a task moves columns, a decision gets made, an open item gets resolved, an environment/setup fact changes) — keeps `.tracker/decisions.json` (append-only decision log) and `.tracker/state.json` (rewritten current-state snapshot) current so a new session can resume without re-deriving context. Companion to populating-tracker-data, not a replacement for it.
---

# Tracking Session State

## Overview

SRS Tracker projects (`.tracker/*.json`, see `populating-tracker-data`) hold what a project *is*: requirements, architecture, roadmap. They don't hold what's actually *happening*: which task is in progress, what got decided in conversation and why, what's blocked. That gap is exactly what many SRS documents' own maintainability requirements ask for (e.g. Nexus's `NFR-M-5`: "`DECISIONS.md` and `STATE.md` updated each session") — this skill is how that requirement gets satisfied inside the tracker, not as separate untracked files.

Two files, two different update disciplines:

- **`decisions.json`** — append-only. Every real decision gets a new entry; nothing already written is edited or removed. This is the project's memory of *why*.
- **`state.json`** — rewritten snapshot. Reflects *only* the current moment (what's in progress, what's blocked, what just finished). No history lives here — that's what `decisions.json` and git are for. Every update replaces the file's content, it doesn't append to it.

Keeping these separate is deliberate: a reader asking "what's happening right now" wants `state.json` and nothing else; a reader asking "why did we do X" wants `decisions.json`. Merging them into one file makes both questions slower to answer.

## When to update

Update **as work happens**, not just at a session boundary:

- A task in `tasks.json` changes `column` (planning → implementation → testing → done, or into `bugs`) → update `state.json`.
- A decision gets made — an open item gets resolved, a design choice gets picked among options, a blocker gets identified — → append to `decisions.json`, and if it changes what's actionable right now, also update `state.json`.
- An environment/setup fact becomes true (dependency installed, service verified running, credential configured) that changes whether blocked work can proceed → update `state.json`.
- A session's work wraps up with follow-ups identified → update `state.json`'s "next" section.

Don't update for exploratory discussion that didn't land anywhere, or for restating something already correctly reflected in the tracker.

## `decisions.json` shape

A `sections`-type page (see `tracker-json-guide.md` for the block schema this reuses). Content is one `timeline` block, entries added in chronological order, newest last (matches how `roadmap.json`'s own revision-history timeline reads). **Every timeline decision entry must explicitly include `requirementIds: string[]` and `timestamp: string` (ISO format).**

```json
[
  {
    "id": "decision-log",
    "title": "Decision Log",
    "type": "timeline",
    "content": {
      "entries": [
        {
          "title": "Short label for the decision",
          "status": "done",
          "date": "2026-08-16",
          "timestamp": "2026-08-16T12:00:00Z",
          "model": "Gemini",
          "requirementIds": ["FR-1"],
          "description": "What was decided and the one-line reason why. Link requirement/open-item IDs inline where relevant (e.g. \"DR-5 enforced as Postgres RLS, resolving DR-OI-1\")."
        }
      ]
    }
  }
]
```

Rules:
- Every entry needs a real decision behind it — not a status update (that's `state.json`'s job) and not a restatement of something the SRS already said.
- Reference the requirement/open-item ID the decision resolves or touches, so it's traceable back to `requirements.json`/`roadmap.json`'s open-items tables.
- Never edit or delete a past entry to reflect a later reversal — append a new entry that supersedes it and says so. The log is a record of what was decided when, including decisions later reversed.
- One block, one file. Don't split decisions across multiple blocks or files as the log grows — a long timeline is fine; `tracker-json-guide.md` diagram/block limits don't apply here since this isn't a diagram.

## `state.json` shape

Also a `sections`-type page. Rebuilt in full on every update — no stale entries carried forward from a prior state. Suggested blocks (adapt to what's actually true for the project; omit any that would be empty):

- **Atomic CLI Execution**: Always execute state updates via `tracker.py update-state` to eliminate the risk of partial JSON truncation. Never edit `state.json` manually.

```json
[
  {
    "id": "current-focus",
    "title": "Current Focus",
    "type": "markdown",
    "content": { "text": "One or two sentences: what phase/release, what's actively being worked on." }
  },
  {
    "id": "in-progress",
    "title": "In Progress",
    "type": "list",
    "content": {
      "items": [
        { "text": "t_r1_003: items table + RLS — schema drafted, RLS policies not yet written", "status": "warning" }
      ]
    }
  },
  {
    "id": "blocked",
    "title": "Blocked",
    "type": "list",
    "content": {
      "items": [
        { "text": "t_r1_013 NL parsing — waiting on OI-4 local model selection", "status": "error" }
      ]
    }
  },
  {
    "id": "environment-status",
    "title": "Environment Status",
    "type": "keyvalue",
    "content": {
      "dense": true,
      "items": [
        { "label": "Docker daemon", "value": "Running, verified 2026-08-16" },
        { "label": "pgvector/pgvector:pg16", "value": "Pulled" }
      ]
    }
  },
  {
    "id": "next",
    "title": "Next",
    "type": "list",
    "content": {
      "ordered": true,
      "items": [
        { "text": "Write RLS policies for items table (t_r1_003)" }
      ]
    }
  }
]
```

Rules:
- Omit any block with nothing real to put in it — an empty "Blocked" list is worse than no block (same principle as `populating-tracker-data`'s page-inclusion rule).
- `in-progress`/`blocked` items should name the `tasks.json` task ID they refer to, so a reader can cross-reference.
- Don't duplicate `tasks.json`'s full task list here — `state.json` is a thin, current-moment lens on top of it, not a second copy of the backlog.
- Environment status only tracks facts that gate work (toolchain installed, service running, credential configured) — not general project trivia.

## Registering the pages

Both files need entries in `meta.json`'s `pages` array, same as any other `sections` page:

```json
{ "id": "decisions", "type": "sections", "source": "decisions.json", "label": "Decisions" },
{ "id": "state", "type": "sections", "source": "state.json", "label": "Current State" }
```

If `meta.json` doesn't have these yet on a project adopting this skill for the first time, add them once, then update the underlying files freely without touching `meta.json` again.

## Relationship to `populating-tracker-data`

`populating-tracker-data` is one-directional: source doc → tracker. It's the tool for (re)syncing `requirements.json`/`architecture.json`/`strategy.json`/`roadmap.json`/`modules.json` against an SRS, and it explicitly does not touch `tasks.json` beyond leaving it `[]` on a fresh run.

This skill is the other direction: conversation/work → tracker, continuously, for the two files SRS content doesn't drive at all. It never touches SRS-sourced files (`requirements.json`, `architecture.json`, `strategy.json`, the SRS-derived rows of `roadmap.json`) — decisions and state are downstream of *work*, not of the spec. The one exception: appending a note to `decisions.json` when an SRS-sourced open item (`roadmap.json`'s open-items table) gets resolved is expected and correct — the resolution itself may also get written back into that open-item's row, same as `populating-tracker-data`'s existing "mark resolved in place" pattern.

## Common mistakes

| Mistake | Fix |
|---|---|
| Treating `state.json` as a log and appending to it | It's a snapshot — rewrite it in full each update via `tracker.py update-state` |
| Treating `decisions.json` as a snapshot and editing/removing past entries | It's append-only — a reversed decision gets a new entry that says so, the old one stays |
| Writing a `state.json`/`decisions.json` update for routine status noise | Only decisions and real state changes qualify — not every message in a conversation |
| Duplicating `tasks.json`'s full backlog into `state.json` | Reference task IDs, don't copy task content |
| Updating only at explicit user request, missing decisions made in passing | Update as work happens — a resolved open item or a task column change is itself the trigger, not a reminder to write one down |
| Forgetting to register `decisions`/`state` pages in `meta.json` on first adoption | Both are `sections` pages like any other — need a `meta.json` entry once |
