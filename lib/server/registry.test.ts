import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { addProject, readRegistry, findProject, removeProject, updateProject } from "./registry";

let tmpProjectDir: string;
let tmpRegistryDir: string;

beforeEach(async () => {
  tmpProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-project-"));
  tmpRegistryDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-registry-"));
  process.env.TRACKER_REGISTRY_PATH = path.join(tmpRegistryDir, "registry.json");
});

afterEach(async () => {
  delete process.env.TRACKER_REGISTRY_PATH;
  await fs.rm(tmpProjectDir, { recursive: true, force: true });
  await fs.rm(tmpRegistryDir, { recursive: true, force: true });
});

describe("addProject", () => {
  it("registers a new project and scaffolds .tracker", async () => {
    const project = await addProject(tmpProjectDir);
    expect(project.path).toBe(path.resolve(tmpProjectDir));

    const stored = await findProject(project.id);
    expect(stored).not.toBeNull();

    const trackerStat = await fs.stat(path.join(tmpProjectDir, ".tracker"));
    expect(trackerStat.isDirectory()).toBe(true);
  });

  it("returns the existing entry when the same path is added twice", async () => {
    const first = await addProject(tmpProjectDir);
    const second = await addProject(tmpProjectDir);
    expect(second.id).toBe(first.id);

    const all = await readRegistry();
    expect(all.length).toBe(1);
  });

  it("rejects a path that is not a directory", async () => {
    const filePath = path.join(tmpProjectDir, "file.txt");
    await fs.writeFile(filePath, "hi");
    await expect(addProject(filePath)).rejects.toThrow();
  });
});

describe("project preferences", () => {
  it("updates machine-local display properties", async () => {
    const project = await addProject(tmpProjectDir);
    const updated = await updateProject(project.id, {
      name: "Renamed project",
      pinned: true,
      lastOpenedAt: "2026-08-17T12:00:00.000Z",
    });

    expect(updated).toMatchObject({
      name: "Renamed project",
      pinned: true,
      lastOpenedAt: "2026-08-17T12:00:00.000Z",
    });
    expect(await findProject(project.id)).toEqual(updated);
  });

  it("unregisters without deleting the project or tracker data", async () => {
    const project = await addProject(tmpProjectDir);
    const marker = path.join(tmpProjectDir, ".tracker", "marker.txt");
    await fs.writeFile(marker, "keep");

    await removeProject(project.id);

    expect(await findProject(project.id)).toBeNull();
    expect(await fs.readFile(marker, "utf-8")).toBe("keep");
  });
});
