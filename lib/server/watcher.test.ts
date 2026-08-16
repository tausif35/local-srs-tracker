import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { subscribe } from "./watcher";

let tmpDir: string;
let projectId: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-watch-"));
  projectId = path.basename(tmpDir);
  await fs.mkdir(path.join(tmpDir, ".tracker"), { recursive: true });
  await fs.writeFile(path.join(tmpDir, ".tracker", "requirements.json"), "[]\n");
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Timed out waiting for condition"));
      }
    }, 50);
  });
}

describe("subscribe", () => {
  it("notifies listeners when a watched file changes", async () => {
    const changed: string[] = [];
    const unsubscribe = subscribe(projectId, tmpDir, (file) => {
      changed.push(file);
    });

    await new Promise((resolve) => setTimeout(resolve, 300)); // let the initial scan settle
    await fs.writeFile(path.join(tmpDir, ".tracker", "requirements.json"), '[{"id":"R-1"}]\n');

    await waitFor(() => changed.includes(".tracker/requirements.json"));
    unsubscribe();
  }, 10000);
});
