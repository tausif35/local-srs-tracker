---
name: working-from-tracker
description: Use when planning, implementing, testing, debugging, or resuming a task in a project managed by SRS Tracker `.tracker/*.json` files.
---

# Working From Tracker

Use `.tracker` as an index. Work on one task or one tightly related batch without loading the complete tracker dataset or SRS.

## Build the focused context packet

Load in this order and stop when the task is clear:

1. `meta.json`
2. `state.json`
3. The selected task from `tasks.json`
4. Only tasks referenced by `blockedBy`
5. Only requirements referenced by `requirementIds`
6. Only blocks referenced by `architectureRefs` or directly matching linked IDs
7. Only decision entries mentioning relevant task, requirement, architecture, module, or unresolved-decision IDs
8. The original SRS section only when structured context is missing, contradictory, or ambiguous

Use targeted searches or parsers. A request to "load everything" does not justify placing the full SRS, backlog, requirements list, section files, or decision history into routine task context.

## Make the task ready

Before moving from `planning` to `implementation`, require:

- A clear objective, scope, and exclusions
- Linked requirements and architecture references
- Completed blockers
- Testable acceptance criteria
- Repeatable verification commands with `status: pending`
- Any unresolved decisions identified explicitly

Plan only the selected task.

## Execute the lifecycle

1. Move the ready task to `implementation` and rewrite `state.json` around the active work.
2. Implement only the recorded scope. Append a real design choice to `decisions.json` when one is made.
3. Move the task to `testing` and run its verification commands.
4. Record `passed` with concise evidence, or `failed` with an actionable failure and move to `bugs` when appropriate.
5. Move to `done` only after acceptance criteria are satisfied and verification passed.
6. Synchronize linked requirement statuses from all linked tasks.
7. Rewrite `state.json` with the current focus, immediate blockers, and one to three next actions.

Keep `state.json` a current snapshot and `decisions.json` append-only. Put implementation history in Git, not tracker prose. Run Tracker Health after direct JSON edits.

## Handoff

Report the task ID, final column, verification evidence, requirement changes, decisions appended, blockers, and next task. Never report verification as passed unless it ran during the current work.
