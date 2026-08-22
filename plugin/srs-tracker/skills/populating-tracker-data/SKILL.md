---
name: Populating-Tracker-Data
description: Use when converting a project's SRS or planning docs into SRS Tracker's `.tracker/*.json` data files — setting up or updating a project's requirements, tasks, architecture, strategy, or roadmap data for the SRS Tracker app.
---

# Populating Tracker Data

## Overview

SRS Tracker tracks a project's requirements, tasks, and free-form content as JSON files inside that project's own `.tracker/` folder — never in a database, never in the tool's own repo. This skill converts an SRS or planning doc into those files correctly.

## Before you write anything

- The canonical schema reference is bundled with this plugin at `./references/tracker-json-guide.md`. Read it in full first — it defines every file's shape and all 14 content-block types, each with a real example.
- If that file isn't at that path, search for `tracker-json-guide.md` before proceeding. Don't improvise a schema from anything else you find.
- **`Z:\Projects\Progress-Tracker\nexus-spec-data.json` and `bundle_1.html` are not the schema.** They're an early hardcoded mockup that predates the real tool — a single flat JSON file, no `.tracker/` folder, no content blocks, incompatible with what SRS Tracker actually reads today. If you encounter them while exploring the filesystem, they are not a reference for this task.

## The Interactive Discovery & Clarification Protocol (Pre-Ingestion)

When an initial SRS is vague, brief, or missing architectural details, do not hallucinate architectures or generate empty, unhelpful JSON structures. Instead, act as a collaborative product architect:

1. **Scan for Gaps:** Check for missing data models, auth boundaries, API protocols, state management, or edge cases.
2. **Present Clarification Matrix:** If critical gaps exist, STOP and present the user with structured clarification options before writing JSON.
   Format:
   ```markdown
   ### ❓ Clarification Needed: [Feature / Architecture Area]

   **Context / Ambiguity**: [Brief 1-line explanation of what is missing]

   #### Option 1: [Name of Approach 1]
   - **How it works**: [Brief description]
   - **Pros / Cons**: [Key trade-offs]

   #### Option 2: [Name of Approach 2] (Recommended)
   - **How it works**: [Brief description]
   - **Pros**: [Key benefits]
   - **Cons**: [Trade-offs]
   - **Why Recommended**: [Specific rationale]

   👉 **Decision**: Would you like to proceed with **Option 2 (Recommended)** or an alternative?
   ```
3. **Log the Decision:** Once the user confirms an option, automatically record it in `decisions.json` with the rationale, date, and `timestamp`. Synthesize the requirements and add them to `requirements.json`.

## Where output goes

Every file goes inside **`<target-project-root>\.tracker\`** — the root of the project the SRS describes. Not the srs-tracker tool's own repo. Not whatever directory happens to be the current working directory. If the target project root isn't given explicitly, the SRS file's own containing folder is normally the project root — **unless** the SRS lives inside a docs subfolder (`.docs/`, `docs/`, `specs/`, etc.), in which case walk up to that subfolder's parent. An existing `.tracker/` folder anywhere in an ancestor directory is the strongest signal of the real root — prefer it over any containing-folder guess.

## Procedure

1. Read the guide (above).
2. Read the source SRS/planning doc(s) in full.
3. Determine the target project root (see above).
4. **Interactive Clarification:** Apply the protocol above if gaps exist.
3a. **If `.tracker/` already exists, this is an update, not a fresh run — check for source identity changes first.** Compare the source file(s) you just read against `documents.json`'s existing entries. A version bump (filename or version header changed), a merge (multiple prior source docs consolidated into one, e.g. an addendum folded into the main SRS), a split, or a move (different path, same content) all count as identity changes, distinct from ordinary content edits to the same file. When one is found:
   - Update `documents.json` to point at the new, real, current file(s) — remove entries for files that no longer exist. Never leave a dangling path pointing at a file that was renamed away or deleted.
   - Diff the new source against what's already in `requirements.json`/the `sections` files by ID and content, not by re-running the whole procedure blind — added requirement IDs get new entries, changed requirement text gets updated in place (same ID, don't duplicate), removed IDs get flagged to the user rather than silently deleted (a requirement disappearing from a spec is a decision worth surfacing, not a diff to apply quietly). Same logic for architecture/strategy/roadmap content sourced from a section that changed.
   - If a prior version's content was itself extended with tracker-only additions (e.g. a design-review open-items table, resolved-decision notes) that aren't in the new source, preserve those additions — a source re-sync should never silently drop content the tracker holds that the source never had in the first place.
4. Create or update `.tracker/`:
   - `meta.json` — page manifest; include a `sections` page (`architecture`, `strategy`, `roadmap`, ...) only if the source doc actually has content for it. An empty page is worse than no page.
   - `requirements.json` — one entry per ID'd requirement-table row, IDs copied verbatim from the source. Mark `critical: true` only where the doc's own language signals it (absolute/"must never" phrasing, explicit blocking language) — never from your own judgment of what seems important.
   - **If the source has no ID'd requirement rows, or only partial coverage**: generate the remaining requirement entries by deriving them from the project's own already-populated `sections` files instead — `architecture.json`, `strategy.json`, `roadmap.json`, `ui-ux.json`, `modules.json`, whichever exist and actually contain the constraint/behavior. Read those files, not the raw source doc again, and pick only the ones that actually contributed. **Format synthesized IDs as zero-padded codes** (e.g. `REQ-AR-001` from `architecture.json`, `REQ-ST-001` from `strategy.json`) to ensure clean lexical sorting. Note in the entry's `text` which block it was derived from if not obvious. Still grounded, never invented — every generated requirement must trace to a real block in a real `sections` file. When reporting what was created, name the actual `sections` files the entries were derived from, not a vague "relevant json files."
   - `tasks.json` — `[]`. Never generate one task per requirement; tasks are planned work, not a mirror of the requirements list.
   - `documents.json` — pointers to the real source file(s), path relative to the project root, so the Documents page always renders the live file.
   - Any `sections` files, built from the guide's block-type mapping cheat sheet (tables → `table`, structural/flow content → `diagram` (Mermaid), trade-off writeups → `comparison`, release plans/changelogs → `timeline`, glossaries → `keyvalue`, warnings → `callout`, references → `link-list`, pull-quotes → `quote`).
   - Diagrams: read the guide's "Diagrams" section and generate `diagram` blocks (Mermaid) for the architecture overview plus any data model, key-flow, or lifecycle content the source supports — ground every diagram in the source, hard limit 15 per project. Don't leave an architecture diagram as ASCII art in a `code` block if it can be redrawn as `diagram`. **Always double-quote Mermaid node labels containing parentheses, brackets, colons, or quotes (e.g., `id["User (Admin)"]`, `db[("PostgreSQL (pg16)")]`). Never output unquoted parentheses in node text as this crashes the renderer.**
5. Don't invent block types, page types, or fields outside what the guide defines.
6. **Completeness pass before reporting** — the goal is that someone can work from the JSONs alone without opening the source doc again. Before finishing, check the source for each of these and fold in what's present (skip any the source doesn't have — don't fabricate):
   - **Glossary/definitions table** → a `keyvalue` block (`dense: true`) in whichever `sections` file fits best (usually `architecture.json`). This is just the cheat sheet's own "glossary → keyvalue" rule — easy to miss because definitions tables don't announce themselves as tables.
   - **Full data model, not just the diagrammed subset** — if the source lists supporting tables/entities beyond what fits legibly in the ER diagram (high-volume tables, audit/log tables, registry tables, etc.), add a `table` block enumerating all of them (name, key columns, purpose) so the ER diagram's simplification doesn't silently drop entities from the tracker entirely.
   - **Principle/rationale-to-requirement traceability table**, if the source has one (a table mapping design principles or goals to the requirement IDs that enforce them) → `table` block, usually in `roadmap.json` or `architecture.json`.
   - **Per-module grouping**, if the source's requirements are organized under per-module/per-feature-area headers (as most SRS FR sections are): add a `modules.json` `sections` page (registered in `meta.json`) with one `table` or block per module, mapping module name → its requirement IDs → the data-model entities it touches → a one-line description from the source's own module intro (if any). This sits above the flat `requirements.json` join-key list and gives a "what is this module, what governs it" view without re-deriving it from scattered rows. Only add it if the source's structure actually supports grouping — don't invent module boundaries it doesn't state.
   - Do **not** add implementation plans, task breakdowns, or "how to build this" guidance — that's a separate, deliberately-out-of-scope activity (planning skills, done per-module when work on it actually starts), not something this skill pre-generates. `tasks.json` stays `[]` regardless of how much of the above is added.
7. Report what you created: file paths, plus counts (requirements, blocks per sections file, diagrams generated, and modules captured if a `modules.json` was created).

## Common mistakes

| Mistake | Fix |
|---|---|
| Writing output next to the srs-tracker tool, or into the current working directory, instead of the target project's own `.tracker/` | Confirm the target project root before writing anything |
| Copying `nexus-spec-data.json`'s flat shape instead of the real per-file `.tracker` schema | Read `./references/tracker-json-guide.md`; it is the only schema source |
| Marking requirements critical from your own judgment | Only mark critical where the source doc's own wording says so |
| Adding a `sections` page (e.g. architecture) with nothing real to put in it | Only include pages the source doc actually supports |
| Fabricating tasks from the requirements list | `tasks.json` starts empty; tasks are planned separately |
| Leaving an architecture diagram as ASCII art in a `code` block | Redraw it as a `diagram` (Mermaid) block instead |
| Inventing diagram content (components, entities, steps) not stated in the source | Every diagram must be grounded in the source doc; skip a diagram type if the source lacks the structure for it |
| Generating diagrams past the point the source supports them, just to add more | Hard limit is 15 per project, but most projects need far fewer — stop once the source's real structure is covered |
| Unquoted parentheses in Mermaid node text crashing the app | Always double-quote Mermaid labels with special characters (e.g., `id["Label (Info)"]`) |
| Leaving a definitions/acronyms table untranscribed because it doesn't look like the rest of the requirements content | It's a glossary — same as any other glossary table, becomes a `keyvalue` block |
| ER diagram becomes the only record of the data model, silently dropping tables that didn't fit the drawing | Add a `table` block enumerating every table/entity the source lists, not just the diagrammed ones |
| Requirements only ever exposed as one flat join-key list, with no per-module view | If the source's requirements are organized under per-module headers, add a `modules.json` grouping requirement IDs by module — still sourced, not invented |
| Treating "make the JSONs complete" as license to add task breakdowns or build plans | Completeness means transcribing more of what the source states, never authoring new planning content; `tasks.json` stays `[]` |
| Assuming the SRS's containing folder is the project root, when it actually lives in a docs subfolder | Walk up past `.docs/`, `docs/`, `specs/`, etc.; an ancestor `.tracker/` folder is the strongest root signal |
| `documents.json` left pointing at a source file that was renamed, merged away, or deleted when the SRS was updated | On every update, verify each `documents.json` path still resolves to a real file; replace or remove stale entries |
| `requirements.json` left empty because the source doc has no ID'd requirement table, even though `architecture.json`/`strategy.json`/etc. already describe plenty of real constraints and behaviors | Derive requirement entries from those `sections` files with zero-padded synthesized IDs instead of leaving the page empty |
