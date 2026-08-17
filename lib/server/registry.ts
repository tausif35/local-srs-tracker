import { promises as fs } from "node:fs";
import path from "node:path";
import { scaffoldTrackerDir } from "./trackerFs";
import type { RegisteredProject } from "@/lib/types";

export function getRegistryPath(): string {
  return process.env.TRACKER_REGISTRY_PATH ?? path.join(process.cwd(), "data", "registry.json");
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "project";
}

export async function readRegistry(): Promise<RegisteredProject[]> {
  try {
    const raw = await fs.readFile(getRegistryPath(), "utf-8");
    return JSON.parse(raw) as RegisteredProject[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeRegistry(projects: RegisteredProject[]): Promise<void> {
  const registryPath = getRegistryPath();
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(projects, null, 2) + "\n", "utf-8");
}

export async function findProject(id: string): Promise<RegisteredProject | null> {
  const projects = await readRegistry();
  return projects.find((p) => p.id === id) ?? null;
}

export async function projectDirectoryExists(project: RegisteredProject): Promise<boolean> {
  const stat = await fs.stat(project.path).catch(() => null);
  return Boolean(stat?.isDirectory());
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<RegisteredProject, "name" | "pinned" | "lastOpenedAt">>
): Promise<RegisteredProject> {
  const projects = await readRegistry();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) throw new Error(`Project not found: ${id}`);

  const current = projects[index];
  const name = updates.name === undefined ? current.name : updates.name.trim();
  if (name === "") throw new Error("Project name cannot be empty");

  const updated: RegisteredProject = {
    ...current,
    name,
    pinned: updates.pinned ?? current.pinned,
    lastOpenedAt: updates.lastOpenedAt ?? current.lastOpenedAt,
  };
  projects[index] = updated;
  await writeRegistry(projects);
  return updated;
}

/** Removes only the machine-local registration. Project files are never touched. */
export async function removeProject(id: string): Promise<RegisteredProject> {
  const projects = await readRegistry();
  const project = projects.find((candidate) => candidate.id === id);
  if (!project) throw new Error(`Project not found: ${id}`);
  await writeRegistry(projects.filter((candidate) => candidate.id !== id));
  return project;
}

export async function addProject(dirPath: string): Promise<RegisteredProject> {
  const resolvedPath = path.resolve(dirPath);
  const stat = await fs.stat(resolvedPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Not a directory: ${resolvedPath}`);
  }

  const projects = await readRegistry();
  const existing = projects.find((p) => path.resolve(p.path) === resolvedPath);
  if (existing) return existing;

  const name = path.basename(resolvedPath);
  const usedIds = new Set(projects.map((p) => p.id));
  let id = slugify(name);
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${slugify(name)}-${suffix}`;
    suffix += 1;
  }

  await scaffoldTrackerDir(resolvedPath, id, name);

  const project: RegisteredProject = { id, name, path: resolvedPath };
  await writeRegistry([...projects, project]);
  return project;
}
