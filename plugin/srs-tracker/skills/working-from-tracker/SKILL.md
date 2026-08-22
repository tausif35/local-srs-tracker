---
name: working-from-tracker
description: Use when planning, implementing, testing, debugging, or resuming a task in a project managed by SRS Tracker `.tracker/*.json` files. Builds a small task-specific context packet and keeps task, requirement, decision, and current-state records synchronized without loading the full SRS or tracker dataset.
---

# Working From Tracker

Use `.tracker` as an index, not as one large prompt. Work on one task or one tightly related batch at a time.

## Load the focused context packet

Load in this order and stop when the task is clear:

1. **MANDATORY:** Use `python <plugin_path>/scripts/tracker.py get-packet <task_id>` to fetch the target task, its linked requirements, and active blockers in one clean isolated context.
2. `meta.json`
3. `state.json`
4. Only architecture/module blocks named by `architectureRefs` or directly matching linked IDs
5. Only decision entries mentioning those task, requirement, architecture, module, or unresolved-decision IDs
6. The specific original SRS section only when structured context is missing, contradictory, or ambiguous

Use targeted commands or parsers to select records. Do not print the full SRS, complete requirements list, all section files, full task backlog, or complete decision history into context during routine work.

## Make a task implementation-ready

Before moving from `planning` to `implementation`, ensure the task identifies its objective, scope, exclusions, requirements, completed dependencies, architecture references, testable acceptance criteria, repeatable verification commands with `status: pending`, and unresolved decisions.

Plan only the selected task. Do not expand an entire release into implementation detail.

## Execute the lifecycle

1. Confirm blockers are `done` and the task is implementation-ready.
2. Move it to `implementation` and rewrite `state.json` around it (using `tracker.py update-state`).
3. Implement only its scope; append a real design choice to `decisions.json` when one is made.
4. Move it to `testing` and run `verification.commands`.
5. Set verification to `passed` with concise evidence, or `failed` with the actionable failure and move to `bugs` when appropriate.
   - **Bug Resolution Flow**: A task in `bugs` transitions back to `implementation` with an updated sub-scope and new verification criteria; once implemented, it moves to `testing` for re-verification before `done`.
6. Move to `done` only when acceptance criteria are satisfied and verification passed.
7. Synchronize linked requirements: all linked tasks planning means `not-started`; all done means `done`; otherwise `in-progress`.
8. Rewrite `state.json` with current focus, immediate blockers, and one to three next actions.
   - **Multi-Turn State Sync**: For multi-turn tasks, update `state.json` (`current-focus` / `in-progress`) before ending any conversation turn where partial progress occurred.

## Editing discipline

- Keep `state.json` a snapshot, never a history.
- Keep `decisions.json` append-only; reversals append a superseding entry.
- Put implementation history in Git, not tracker prose.
- Do not duplicate SRS passages in tasks.
- Do not add `progress.json`, `session-log.json`, `notes.json`, `STATE.md`, or `DECISIONS.md`.
- Run Tracker Health (`tracker.py health`) after direct JSON edits and correct errors before handoff.

## Handoff

Report the task ID, resulting column, verification evidence, requirement-status changes, decisions appended, current blockers, and next task. Never claim a verification passed unless it was run in the current work.
