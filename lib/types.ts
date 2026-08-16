export const ALLOWED_DATA_FILES = [
  "meta.json",
  "requirements.json",
  "tasks.json",
  "architecture.json",
  "strategy.json",
  "roadmap.json",
  "documents.json",
] as const;

export type DataFileName = (typeof ALLOWED_DATA_FILES)[number];

export function isDataFileName(value: string): value is DataFileName {
  return (ALLOWED_DATA_FILES as readonly string[]).includes(value);
}

export type PageType =
  | "overview"
  | "requirements-explorer"
  | "task-board"
  | "documents"
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  column: TaskColumn;
  requirementIds?: string[];
  priority?: "low" | "medium" | "high";
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentEntry {
  label: string;
  path: string;
}

export interface RegisteredProject {
  id: string;
  name: string;
  path: string;
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
