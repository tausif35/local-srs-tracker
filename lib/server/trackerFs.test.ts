import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scaffoldTrackerDir, readDataFile, writeDataFile, resolveDocPath } from "./trackerFs";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-fs-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("scaffoldTrackerDir", () => {
  it("creates the default .tracker files", async () => {
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    const meta = await readDataFile<{ id: string; pages: unknown[] }>(tmpDir, "meta.json");
    expect(meta.id).toBe("demo");
    expect(meta.pages.length).toBeGreaterThan(0);

    const requirements = await readDataFile<unknown[]>(tmpDir, "requirements.json");
    expect(requirements).toEqual([]);
  });

  it("does not overwrite an existing file", async () => {
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    await writeDataFile(tmpDir, "requirements.json", [{ id: "R-1" }]);
    await scaffoldTrackerDir(tmpDir, "demo", "Demo Project");
    const requirements = await readDataFile<unknown[]>(tmpDir, "requirements.json");
    expect(requirements).toEqual([{ id: "R-1" }]);
  });
});

describe("resolveDocPath", () => {
  it("resolves a path inside the project root", () => {
    const resolved = resolveDocPath(tmpDir, "notes.md");
    expect(resolved).toBe(path.join(tmpDir, "notes.md"));
  });

  it("throws when the path escapes the project root", () => {
    expect(() => resolveDocPath(tmpDir, "../../etc/passwd")).toThrow();
  });
});
