---
name: populating-tracker-data
description: Use when initially converting an SRS or planning document into SRS Tracker `.tracker/*.json` files, or explicitly synchronizing those files after the source specification changes. Do not use for routine task planning or implementation.
---

# Populating Tracker Data

Convert source specifications into addressable tracker data. Write every output to `<target-project-root>/.tracker/`, never to the SRS Tracker application repository.

## Prepare

1. Find and read `docs/tracker-json-guide.md` from the SRS Tracker repository. Treat it as the canonical schema.
2. Read the source specification completely.
3. Resolve the target project root. Prefer an ancestor already containing `.tracker/`; otherwise walk above common documentation folders such as `docs/` or `specs/`.
4. If `.tracker/` exists, compare the current source identity with `documents.json` before editing.

## Populate or synchronize

- `meta.json`: Declare only pages supported by real source content. Use stable, kebab-case page and block IDs.
- `requirements.json`: Create one record per explicitly identified requirement. Copy IDs and requirement text faithfully. Mark `critical` only when the source explicitly signals it.
- `tasks.json`: Use `[]` for a fresh import. Do not invent implementation tasks or create one task per requirement.
- `documents.json`: Reference real source files relative to the project root. Record `syncedAt` and a lowercase SHA-256 `sourceSha256`.
- Section files: Map source content using the guide. Use tables for structured data, key-value blocks for glossaries, timelines for plans/history, comparisons for trade-offs, and Mermaid diagrams for source-grounded structure and flows.

Preserve full requirement text but summarize supporting prose. Include the full source-stated data model even when a diagram shows only a subset. Add a module page only when the source defines meaningful module boundaries. Never invent page types, block types, entities, decisions, or architecture.

## Update existing data

Diff by stable ID and content instead of regenerating blindly:

- Add new source records and update changed records in place.
- Surface removed requirement IDs to the user; do not silently delete them.
- Preserve tasks, decisions, current state, resolved notes, and other tracker-owned additions.
- Update renamed, moved, split, or merged document entries and remove dangling document paths.
- Change an ID only when its underlying concept was removed or replaced.

## Verify and report

Run Tracker Health after writing. Correct schema, reference, and document-sync errors. Report created or updated files plus requirement, block, diagram, and module counts.

For routine project work after ingestion, use `working-from-tracker` rather than reloading or resynchronizing the complete specification.
