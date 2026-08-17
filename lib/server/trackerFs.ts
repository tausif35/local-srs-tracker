import { promises as fs } from "node:fs";
import path from "node:path";
import { ALLOWED_DATA_FILES, type DataFileName } from "@/lib/types";

interface CachedJson {
  mtimeMs: number;
  size: number;
  data: unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var __trackerJsonCache: Map<string, CachedJson> | undefined;
}

function getJsonCache(): Map<string, CachedJson> {
  if (!globalThis.__trackerJsonCache) globalThis.__trackerJsonCache = new Map();
  return globalThis.__trackerJsonCache;
}

export function getTrackerDir(projectPath: string): string {
  return path.join(projectPath, ".tracker");
}

export async function readDataFile<T>(projectPath: string, file: DataFileName): Promise<T> {
  const filePath = path.join(getTrackerDir(projectPath), file);
  const stat = await fs.stat(filePath);
  const cached = getJsonCache().get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.data as T;
  }
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as T;
  getJsonCache().set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, data });
  return data;
}

export async function writeDataFile(
  projectPath: string,
  file: DataFileName,
  data: unknown
): Promise<void> {
  const filePath = path.join(getTrackerDir(projectPath), file);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  getJsonCache().delete(filePath);
}

export function resolveDocPath(projectPath: string, relPath: string): string {
  const resolvedRoot = path.resolve(projectPath);
  const resolved = path.resolve(projectPath, relPath);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Path escapes project root");
  }
  return resolved;
}

export async function readDocFile(projectPath: string, relPath: string): Promise<string> {
  const filePath = resolveDocPath(projectPath, relPath);
  return fs.readFile(filePath, "utf-8");
}

export async function scaffoldTrackerDir(
  projectPath: string,
  projectId: string,
  projectName: string
): Promise<void> {
  const trackerDir = getTrackerDir(projectPath);
  await fs.mkdir(trackerDir, { recursive: true });

  const defaultMeta = {
    id: projectId,
    name: projectName,
    description: "",
    pages: [
      { id: "overview", type: "overview", label: "Overview" },
      { id: "requirements", type: "requirements-explorer", source: "requirements.json", label: "Requirements" },
      { id: "board", type: "task-board", source: "tasks.json", label: "Task Board" },
      { id: "state", type: "sections", source: "state.json", label: "Current State" },
      { id: "decisions", type: "sections", source: "decisions.json", label: "Decisions" },
      { id: "documents", type: "documents", source: "documents.json", label: "Documents" },
      { id: "health", type: "health", label: "Tracker Health" },
    ],
  };

  const defaults: [DataFileName, unknown][] = [
    ["meta.json", defaultMeta],
    ["requirements.json", []],
    ["tasks.json", []],
    ["state.json", []],
    ["decisions.json", []],
    ["documents.json", []],
  ];

  for (const [file, content] of defaults) {
    const filePath = path.join(trackerDir, file);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(content, null, 2) + "\n", "utf-8");
    }
  }
}

export { ALLOWED_DATA_FILES };
export type { DataFileName };
