import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import {
  synchronizeRequirementStatuses,
  taskImplementationReadiness,
  validateTaskGraph,
  validateTaskTransition,
} from "@/lib/taskWorkflow";
import {
  isSafeJsonFilename,
  type DocumentEntry,
  type PageManifestEntry,
  type Requirement,
  type Task,
  type TrackerHealthIssue,
  type TrackerHealthReport,
} from "@/lib/types";
import { getTrackerDir, resolveDocPath } from "./trackerFs";
import {
  documentsFileSchema,
  projectMetaSchema,
  requirementsFileSchema,
  schemaForFile,
  tasksFileSchema,
} from "./validation";

type JsonSchema = z.ZodTypeAny;

interface LoadedFile<T> {
  data?: T;
  raw?: unknown;
}

class PathOutsideRootError extends Error {
  constructor() {
    super("Path resolves outside its permitted root.");
  }
}

function issue(
  issues: TrackerHealthIssue[],
  severity: TrackerHealthIssue["severity"],
  code: string,
  message: string,
  file?: string,
  identifier?: string
): void {
  issues.push({ severity, code, message, ...(identifier ? { identifier } : {}), ...(file ? { file } : {}) });
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      if (!duplicates.includes(value)) duplicates.push(value);
    } else {
      seen.add(value);
    }
  }

  return duplicates;
}

function schemaFailureMessage(error: z.ZodError): string {
  const first = error.issues[0];
  const location = first.path.length > 0 ? ` at ${first.path.join(".")}` : "";
  return `${first.message}${location}`;
}

function isPathWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function isPathStrictlyWithin(root: string, target: string): boolean {
  return root !== target && isPathWithin(root, target);
}

async function resolveExistingPathWithin(root: string, target: string): Promise<string> {
  const [realRoot, realTarget] = await Promise.all([fs.realpath(root), fs.realpath(target)]);
  if (!isPathWithin(realRoot, realTarget)) throw new PathOutsideRootError();
  return realTarget;
}

async function resolveApprovedTrackerDir(projectPath: string, trackerDir: string): Promise<string> {
  const [realProjectRoot, realTrackerDir] = await Promise.all([fs.realpath(projectPath), fs.realpath(trackerDir)]);
  if (!isPathStrictlyWithin(realProjectRoot, realTrackerDir)) throw new PathOutsideRootError();
  return realTrackerDir;
}

function reportFor(issues: TrackerHealthIssue[]): TrackerHealthReport {
  return {
    summary: {
      errors: issues.filter((entry) => entry.severity === "error").length,
      warnings: issues.filter((entry) => entry.severity === "warning").length,
    },
    issues,
  };
}

async function loadJsonFile<T>(
  trackerDir: string,
  file: string,
  schema: JsonSchema,
  issues: TrackerHealthIssue[],
  missingCode: "missing-tracker-file" | "missing-manifest-source" = "missing-tracker-file",
  missingIdentifier = file
): Promise<LoadedFile<T>> {
  const candidatePath = path.join(trackerDir, file);
  let filePath: string;
  let rawText: string;

  try {
    filePath = await resolveExistingPathWithin(trackerDir, candidatePath);
    rawText = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof PathOutsideRootError) {
      issue(
        issues,
        "error",
        "unsafe-manifest-source",
        `Tracker data source ${file} resolves outside the .tracker directory.`,
        file,
        file
      );
      return {};
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      issue(
        issues,
        "error",
        missingCode,
        `Tracker data source ${file} is missing.`,
        file,
        missingIdentifier
      );
      return {};
    }
    issue(issues, "error", "unreadable-tracker-file", `Tracker data source ${file} cannot be read.`, file, file);
    return {};
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    issue(issues, "error", "invalid-json", `Tracker data source ${file} contains invalid JSON.`, file, file);
    return {};
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    issue(
      issues,
      "error",
      "schema-invalid",
      `Tracker data source ${file} fails schema validation: ${schemaFailureMessage(parsed.error)}.`,
      file,
      file
    );
    return { raw };
  }

  return { raw, data: parsed.data as T };
}

function addDuplicateIssues(
  issues: TrackerHealthIssue[],
  values: string[],
  code: string,
  kind: string,
  file: string,
  identifierPrefix = ""
): void {
  for (const value of duplicateValues(values)) {
    const identifier = `${identifierPrefix}${value}`;
    issue(issues, "error", code, `Duplicate ${kind} ID ${identifier}.`, file, identifier);
  }
}

function addTaskHealthIssues(issues: TrackerHealthIssue[], tasks: Task[], requirementIds?: Set<string>): void {
  addDuplicateIssues(issues, tasks.map((task) => task.id), "duplicate-task-id", "task", "tasks.json");

  if (requirementIds) {
    for (const task of tasks) {
      for (const requirementId of task.requirementIds ?? []) {
        if (!requirementIds.has(requirementId)) {
          const identifier = `${task.id} -> ${requirementId}`;
          issue(
            issues,
            "error",
            "unknown-requirement-link",
            `Task ${task.id} references unknown requirement ${requirementId}.`,
            "tasks.json",
            identifier
          );
        }
      }
    }
  }

  for (const graphIssue of validateTaskGraph(tasks)) {
    if (graphIssue.includes("references unknown blocker")) {
      const match = /^Task (.+) references unknown blocker (.+)\.$/.exec(graphIssue);
      const identifier = match ? `${match[1]} -> ${match[2]}` : undefined;
      issue(issues, "error", "unknown-task-blocker", graphIssue, "tasks.json", identifier);
    } else if (graphIssue.includes("cannot block itself")) {
      const match = /^Task (.+) cannot block itself\.$/.exec(graphIssue);
      issue(issues, "error", "task-self-dependency", graphIssue, "tasks.json", match?.[1]);
    } else if (graphIssue.startsWith("Task dependency cycle:")) {
      const identifier = graphIssue.slice("Task dependency cycle: ".length, -1);
      issue(issues, "error", "task-dependency-cycle", graphIssue, "tasks.json", identifier);
    }
  }

  for (const task of tasks) {
    if (task.column === "implementation") {
      for (const readinessIssue of taskImplementationReadiness(task)) {
        issue(issues, "error", "task-not-ready", readinessIssue, "tasks.json", task.id);
      }
    }

    if (task.column === "done") {
      const completionIssues = validateTaskTransition({ ...task, column: "testing" }, "done", tasks);
      for (const completionIssue of completionIssues) {
        issue(issues, "error", "task-not-complete", completionIssue, "tasks.json", task.id);
      }
    }
  }
}

function addRequirementStatusIssues(
  issues: TrackerHealthIssue[],
  requirements: Requirement[],
  tasks: Task[]
): void {
  for (const expected of synchronizeRequirementStatuses(requirements, tasks)) {
    const actual = requirements.find((requirement) => requirement.id === expected.id);
    if (actual?.status !== undefined && actual.status !== expected.status) {
      issue(
        issues,
        "warning",
        "requirement-status-drift",
        `Requirement ${expected.id} has status ${actual.status} but derived status is ${expected.status}.`,
        "requirements.json",
        expected.id
      );
    }
  }
}

async function addDocumentHealthIssues(
  issues: TrackerHealthIssue[],
  projectPath: string,
  documents: DocumentEntry[]
): Promise<void> {
  for (const document of documents) {
    let documentPath: string | undefined;
    try {
      const candidatePath = resolveDocPath(projectPath, document.path);
      documentPath = await resolveExistingPathWithin(projectPath, candidatePath);
      await fs.access(documentPath);
    } catch (error) {
      const code =
        error instanceof PathOutsideRootError || (error as Error).message === "Path escapes project root"
          ? "unsafe-document-path"
          : "missing-document";
      const message =
        code === "unsafe-document-path"
          ? `Registered document ${document.path} resolves outside the project root.`
          : `Registered document ${document.path} is missing or cannot be accessed.`;
      issue(
        issues,
        "error",
        code,
        message,
        "documents.json",
        document.path
      );
      documentPath = undefined;
    }

    if (!document.sourceSha256) {
      issue(
        issues,
        "warning",
        "missing-fingerprint",
        `Registered document ${document.path} has no source SHA-256 fingerprint.`,
        "documents.json",
        document.path
      );
    } else if (documentPath) {
      try {
        const actual = await sha256File(documentPath);
        if (actual !== document.sourceSha256) {
          issue(
            issues,
            "warning",
            "fingerprint-drift",
            `Registered document ${document.path} differs from its synchronized source fingerprint.`,
            "documents.json",
            document.path
          );
        }
      } catch {
        issue(
          issues,
          "error",
          "unreadable-document",
          `Registered document ${document.path} cannot be fingerprinted.`,
          "documents.json",
          document.path
        );
      }
    }
  }
}

/** Computes the lowercase SHA-256 fingerprint of a file without changing it. */
export async function sha256File(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

/**
 * Validates every reachable tracker data source, returning all actionable issues in
 * deterministic traversal order. Filesystem and schema failures are reported rather
 * than thrown so callers can show a complete project-health report.
 */
export async function validateTrackerProject(projectPath: string): Promise<TrackerHealthReport> {
  const issues: TrackerHealthIssue[] = [];
  let trackerDir = getTrackerDir(projectPath);

  try {
    trackerDir = await resolveApprovedTrackerDir(projectPath, trackerDir);
  } catch (error) {
    if (error instanceof PathOutsideRootError) {
      issue(
        issues,
        "error",
        "unsafe-tracker-directory",
        "The .tracker directory resolves outside the project root.",
        ".tracker",
        ".tracker"
      );
      return reportFor(issues);
    }
  }

  const meta = await loadJsonFile<{ pages: PageManifestEntry[] }>(trackerDir, "meta.json", projectMetaSchema, issues);
  const requirements = await loadJsonFile<Requirement[]>(
    trackerDir,
    "requirements.json",
    requirementsFileSchema,
    issues
  );
  const tasks = await loadJsonFile<Task[]>(trackerDir, "tasks.json", tasksFileSchema, issues);
  const documents = await loadJsonFile<DocumentEntry[]>(
    trackerDir,
    "documents.json",
    documentsFileSchema,
    issues
  );

  if (meta.data) {
    addDuplicateIssues(issues, meta.data.pages.map((page) => page.id), "duplicate-page-id", "page", "meta.json");

    const checkedSources = new Set<string>();
    for (const page of meta.data.pages) {
      const sourceRequired = page.type !== "overview" && page.type !== "health";
      if (sourceRequired && !page.source) {
        issue(
          issues,
          "error",
          "missing-manifest-source",
          `Manifest page ${page.id} requires a JSON source.`,
          "meta.json",
          page.id
        );
        continue;
      }
      if (!page.source || checkedSources.has(page.source)) continue;
      checkedSources.add(page.source);

      if (!isSafeJsonFilename(page.source)) {
        issue(
          issues,
          "error",
          "unsafe-manifest-source",
          `Manifest page ${page.id} has unsafe source ${page.source}.`,
          "meta.json",
          page.source
        );
        continue;
      }

      const loaded = await loadJsonFile<unknown>(
        trackerDir,
        page.source,
        schemaForFile(page.source),
        issues,
        "missing-manifest-source",
        page.id
      );
      if (!loaded.data || !Array.isArray(loaded.data)) continue;

      if (page.source !== "requirements.json" && page.source !== "tasks.json" && page.source !== "documents.json") {
        addDuplicateIssues(
          issues,
          (loaded.data as { id?: string }[]).map((block) => block.id ?? ""),
          "duplicate-block-id",
          "block",
          page.source,
          `${page.source}:`
        );
      }
    }
  }

  if (requirements.data) {
    addDuplicateIssues(
      issues,
      requirements.data.map((requirement) => requirement.id),
      "duplicate-requirement-id",
      "requirement",
      "requirements.json"
    );
  }

  if (tasks.data) {
    addTaskHealthIssues(
      issues,
      tasks.data,
      requirements.data ? new Set(requirements.data.map((requirement) => requirement.id)) : undefined
    );
  }

  if (requirements.data && tasks.data) {
    addRequirementStatusIssues(issues, requirements.data, tasks.data);
  }

  if (documents.data) await addDocumentHealthIssues(issues, projectPath, documents.data);

  return reportFor(issues);
}
