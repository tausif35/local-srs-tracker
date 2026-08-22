---
description: Enforces SRS Tracker discipline, verification before done, and session state maintenance.
always_on: true
---

# SRS Tracker Operating Discipline

When operating in any repository containing a `.tracker/` directory:

1. **Inspect State First**:
   - Check `.tracker/state.json` before starting work to identify current focus, blockers, and next actions.
   - Use `python <plugin_path>/scripts/tracker.py get-packet <task_id>` to load isolated context instead of reading full JSON files.

2. **The Two-Speed Discipline**:
   - **Feature Tasks**: Move through `planning` -> `implementation` -> `testing` -> `done` with verification evidence.
   - **Chore Tasks**: Use fast-track logging for minor UI/styling tweaks without requiring heavy blocker trees.

3. **Strict Verification for Core Work**:
   - Non-chore tasks cannot move to `done` without repeatable verification commands (`verification.commands`) and passing status with recorded evidence.

4. **Append-Only Decisions**:
   - Log architectural choices, trade-offs, and resolved open items to `.tracker/decisions.json`.
   - Never rewrite or delete historical decisions; append superseding entries if a decision is reversed.

5. **Zero Manual JSON Editing**:
   - Never manually author raw JSON; always execute edits via `tracker.py` CLI commands.
