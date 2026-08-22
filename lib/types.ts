/**
 * The core data files every project gets scaffolded with. Projects may also declare
 * additional custom "sections" pages (e.g. "modules.json") in their meta.json manifest —
 * those aren't listed here since the set is project-specific, but they're just as valid.
 * See isSafeJsonFilename + the data file route, which validates against a project's own
 * meta.json.pages[].source list rather than a fixed global list.
 */
export const ALLOWED_DATA_FILES = [
  "meta.json",
  "requirements.json",
  "tasks.json",
  "architecture.json",
  "strategy.json",
  "roadmap.json",
  "documents.json",
] as const;

/** Any project-relative JSON data filename, e.g. "requirements.json" or a custom "modules.json". */
export type DataFileName = string;

/** Basic filename safety: a bare ".json" filename with no path separators or traversal. */
export function isSafeJsonFilename(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.json$/.test(value);
}

export type PageType =
  | "overview"
  | "requirements-explorer"
  | "task-board"
  | "documents"
  | "health"
  | "sections";

export interface PageManifestEntry {
  id: string;
  type: PageType;
  source?: string;
  label?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description?: string;
  pages: PageManifestEntry[];
}

export interface Requirement {
  id: string;
  section: string;
  category: string;
  text: string;
  critical?: boolean;
  status?: "not-started" | "in-progress" | "done";
}

export type TaskColumn = "planning" | "implementation" | "testing" | "bugs" | "done";

export interface TaskVerification {
  commands: string[];
  status: "pending" | "passed" | "failed";
  evidence?: string;
}

export interface TaskMetadata {
  plannedBy?: string;
  implementedBy?: string;
  verifiedBy?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  column: TaskColumn;
  requirementIds?: string[];
  /** IDs of other tasks that must be done before this one can start. */
  blockedBy?: string[];
  scope?: string;
  exclusions?: string[];
  architectureRefs?: string[];
  acceptanceCriteria?: string[];
  verification?: TaskVerification;
  unresolvedDecisions?: string[];
  priority?: "low" | "medium" | "high";
  notes?: string;
  metadata?: TaskMetadata;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentEntry {
  label: string;
  path: string;
  /** When this registered source was last synchronized into tracker data. */
  syncedAt?: string;
  /** Lowercase SHA-256 fingerprint of the synchronized source document. */
  sourceSha256?: string;
}

export type TrackerHealthSeverity = "error" | "warning";

export interface TrackerHealthIssue {
  severity: TrackerHealthSeverity;
  code: string;
  message: string;
  /** A task, requirement, page, block, or project-relative path to correct. */
  identifier?: string;
  /** The tracker data file that contains the issue when applicable. */
  file?: string;
}

export interface TrackerHealthReport {
  summary: { errors: number; warnings: number };
  issues: TrackerHealthIssue[];
}

export interface RegisteredProject {
  id: string;
  name: string;
  path: string;
  pinned?: boolean;
  lastOpenedAt?: string;
  available?: boolean;
  healthSummary?: TrackerHealthReport["summary"];
}

export interface BlockBase {
  id: string;
  title?: string;
}

export interface TableCell {
  value: string;
  kind?: "text" | "badge" | "link" | "date" | "number";
  href?: string;
}

export interface MarkdownBlock extends BlockBase {
  type: "markdown";
  content: { text: string };
}

export interface TableBlock extends BlockBase {
  type: "table";
  content: { columns: string[]; rows: TableCell[][] };
}

export interface KeyValueBlock extends BlockBase {
  type: "keyvalue";
  content: { dense?: boolean; items: { label: string; value: string }[] };
}

export interface StatGridBlock extends BlockBase {
  type: "stat-grid";
  content: { stats: { label: string; value: string; sublabel?: string }[] };
}

export interface ListItem {
  text: string;
  icon?: string;
  status?: "none" | "done" | "warning" | "error";
}

export interface ListBlock extends BlockBase {
  type: "list";
  content: { ordered?: boolean; items: ListItem[] };
}

export interface TimelineEntry {
  title: string;
  description?: string;
  status?: "done" | "active" | "planned" | "blocked";
  date?: string;
  /** Optional bullet breakdown of what this entry covers. Renders as a list under the description. */
  items?: string[];
  /** Optional exit criterion / definition of done, highlighted separately from the description. */
  exit?: string;
}

export interface TimelineBlock extends BlockBase {
  type: "timeline";
  content: { entries: TimelineEntry[] };
}

export interface DiagramBlock extends BlockBase {
  type: "diagram";
  content: { mermaid: string };
}

export interface CodeBlock extends BlockBase {
  type: "code";
  content: { language: string; code: string };
}

export interface ComparisonCard {
  title: string;
  attributes: { label: string; value: string }[];
  recommended?: boolean;
}

export interface ComparisonBlock extends BlockBase {
  type: "comparison";
  content: { cards: ComparisonCard[] };
}

export interface ProgressBlock extends BlockBase {
  type: "progress";
  content: { items: { label: string; percent: number }[] };
}

export interface CalloutBlock extends BlockBase {
  type: "callout";
  content: { tone: "info" | "warning" | "danger" | "success"; text: string };
}

export interface LinkListBlock extends BlockBase {
  type: "link-list";
  content: { links: { label: string; href: string; description?: string }[] };
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  content: { text: string; attribution?: string };
}

export interface ImageBlock extends BlockBase {
  type: "image";
  content: { src: string; alt: string; caption?: string };
}

export type ContentBlock =
  | MarkdownBlock
  | TableBlock
  | KeyValueBlock
  | StatGridBlock
  | ListBlock
  | TimelineBlock
  | DiagramBlock
  | CodeBlock
  | ComparisonBlock
  | ProgressBlock
  | CalloutBlock
  | LinkListBlock
  | QuoteBlock
  | ImageBlock;

export type BlockType = ContentBlock["type"];
