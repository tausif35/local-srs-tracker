import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { documentsFileSchema } from "./validation";
import { sha256File, validateTrackerProject } from "./trackerHealth";

let projectPath: string;
let outsidePath: string;

const task = {
  id: "task-1",
  title: "Implement health validation",
  description: "Validate a tracker project.",
  column: "planning",
  acceptanceCriteria: ["Reports actionable issues."],
  verification: { commands: ["npm test"], status: "pending" },
  order: 0,
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
};

async function writeProject(files: Record<string, unknown | string>): Promise<void> {
  await fs.mkdir(path.join(projectPath, ".tracker"), { recursive: true });

  for (const [file, value] of Object.entries(files)) {
    const target = file.endsWith(".json")
      ? path.join(projectPath, ".tracker", file)
      : path.join(projectPath, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, typeof value === "string" ? value : JSON.stringify(value), "utf8");
  }
}

function validFiles(): Record<string, unknown | string> {
  return {
    "meta.json": {
      id: "demo",
      name: "Demo",
      pages: [
        { id: "overview", type: "overview" },
        { id: "requirements", type: "requirements-explorer", source: "requirements.json" },
        { id: "board", type: "task-board", source: "tasks.json" },
        { id: "architecture", type: "sections", source: "architecture.json" },
        { id: "documents", type: "documents", source: "documents.json" },
      ],
    },
    "requirements.json": [
      { id: "REQ-1", section: "1", category: "Functional", text: "Health must validate projects." },
    ],
    "tasks.json": [{ ...task, requirementIds: ["REQ-1"] }],
    "architecture.json": [{ id: "architecture-overview", type: "markdown", content: { text: "Architecture." } }],
    "documents.json": [
      {
        label: "Source",
        path: "docs/source.md",
        syncedAt: "2026-08-16T00:00:00.000Z",
        sourceSha256: createHash("sha256").update("Source document\n").digest("hex"),
      },
    ],
    "docs/source.md": "Source document\n",
  };
}

function issueCodes(report: Awaited<ReturnType<typeof validateTrackerProject>>): string[] {
  return report.issues.map((issue) => issue.code);
}

async function tryCreateFileLink(target: string, link: string): Promise<boolean> {
  try {
    await fs.symlink(target, link, "file");
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES" || code === "UNKNOWN") return false;
    throw error;
  }
}

async function tryCreateDirectoryLink(target: string, link: string): Promise<boolean> {
  try {
    await fs.symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES" || code === "UNKNOWN") return false;
    throw error;
  }
}

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-health-"));
  outsidePath = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-health-outside-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
  await fs.rm(outsidePath, { recursive: true, force: true });
});

describe("sha256File", () => {
  it("returns the lowercase SHA-256 fingerprint of file contents", async () => {
    const source = path.join(projectPath, "source.md");
    await fs.writeFile(source, "tracker source\n", "utf8");

    await expect(sha256File(source)).resolves.toBe(
      "216e117de0b01340df2731f73a12bbb74ac8d38e9fa2a3e4cc8ae32dc283d609"
    );
  });
});

describe("document source metadata", () => {
  it("preserves valid fingerprints and rejects fingerprints outside lowercase SHA-256", () => {
    const valid = documentsFileSchema.safeParse([
      {
        label: "SRS",
        path: "docs/srs.md",
        syncedAt: "2026-08-16T00:00:00.000Z",
        sourceSha256: "a".repeat(64),
      },
    ]);

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data[0]).toMatchObject({
        syncedAt: "2026-08-16T00:00:00.000Z",
        sourceSha256: "a".repeat(64),
      });
    }

    expect(
      documentsFileSchema.safeParse([
        { label: "SRS", path: "docs/srs.md", sourceSha256: "A".repeat(64) },
      ]).success
    ).toBe(false);
  });
});

describe("validateTrackerProject", () => {
  it("reports a clean project with a compact empty summary", async () => {
    await writeProject(validFiles());

    await expect(validateTrackerProject(projectPath)).resolves.toEqual({
      summary: { errors: 0, warnings: 0 },
      issues: [],
    });
  });

  it("accumulates parse, schema, manifest, and document failures instead of failing fast", async () => {
    const files = validFiles();
    files["tasks.json"] = "{ not json";
    files["requirements.json"] = [{ id: "REQ-1" }];
    files["meta.json"] = {
      id: "demo",
      name: "Demo",
      pages: [{ id: "missing-section", type: "sections", source: "missing.json" }],
    };
    files["documents.json"] = [{ label: "Missing source", path: "docs/missing.md" }];
    await writeProject(files);

    const report = await validateTrackerProject(projectPath);

    expect(issueCodes(report)).toEqual([
      "schema-invalid",
      "invalid-json",
      "missing-manifest-source",
      "missing-document",
      "missing-fingerprint",
    ]);
    expect(report.summary).toEqual({ errors: 4, warnings: 1 });
    expect(report.issues.map((issue) => issue.identifier)).toContain("missing-section");
    expect(report.issues.map((issue) => issue.identifier)).toContain("docs/missing.md");
  });

  it("keeps independent diagnostics but skips cross-file links and status derivation after a prerequisite parse failure", async () => {
    const invalidTasks = validFiles();
    invalidTasks["tasks.json"] = "{ not json";
    invalidTasks["requirements.json"] = [
      { id: "REQ-1", section: "1", category: "Functional", text: "One", status: "done" },
    ];
    await writeProject(invalidTasks);

    const taskFailureReport = await validateTrackerProject(projectPath);
    expect(issueCodes(taskFailureReport)).toContain("invalid-json");
    expect(issueCodes(taskFailureReport)).not.toContain("requirement-status-drift");

    const invalidRequirements = validFiles();
    invalidRequirements["requirements.json"] = [{ id: "REQ-1" }];
    invalidRequirements["tasks.json"] = [{ ...task, requirementIds: ["REQ-404"] }];
    await writeProject(invalidRequirements);

    const requirementFailureReport = await validateTrackerProject(projectPath);
    expect(issueCodes(requirementFailureReport)).toContain("schema-invalid");
    expect(issueCodes(requirementFailureReport)).not.toContain("unknown-requirement-link");
  });

  it("reports duplicate identifiers, workflow errors, and requirement status drift with actionable IDs", async () => {
    const files = validFiles();
    files["meta.json"] = {
      id: "demo",
      name: "Demo",
      pages: [
        { id: "overview", type: "overview" },
        { id: "overview", type: "sections", source: "architecture.json" },
      ],
    };
    files["requirements.json"] = [
      { id: "REQ-1", section: "1", category: "Functional", text: "One", status: "done" },
      { id: "REQ-1", section: "2", category: "Functional", text: "Duplicate" },
    ];
    files["tasks.json"] = [
      { ...task, id: "task-1", requirementIds: ["REQ-1", "REQ-404"], column: "implementation", description: undefined, scope: undefined, acceptanceCriteria: [], verification: undefined, blockedBy: ["task-2", "task-404"] },
      { ...task, id: "task-1", title: "Duplicate task", blockedBy: ["task-3"] },
      { ...task, id: "task-2", blockedBy: ["task-3"] },
      { ...task, id: "task-3", blockedBy: ["task-2"] },
      { ...task, id: "task-self", blockedBy: ["task-self"] },
      { ...task, id: "task-done", column: "done", acceptanceCriteria: ["Complete"], verification: { commands: ["npm test"], status: "failed" } },
    ];
    files["architecture.json"] = [
      { id: "architecture-overview", type: "markdown", content: { text: "One" } },
      { id: "architecture-overview", type: "markdown", content: { text: "Duplicate" } },
    ];
    await writeProject(files);

    const report = await validateTrackerProject(projectPath);
    const codes = issueCodes(report);

    expect(codes).toContain("duplicate-page-id");
    expect(codes).toContain("duplicate-requirement-id");
    expect(codes).toContain("duplicate-task-id");
    expect(codes).toContain("duplicate-block-id");
    expect(codes).toContain("unknown-requirement-link");
    expect(codes).toContain("unknown-task-blocker");
    expect(codes).toContain("task-self-dependency");
    expect(codes).toContain("task-dependency-cycle");
    expect(codes).toContain("task-not-ready");
    expect(codes).toContain("task-not-complete");
    expect(codes).toContain("requirement-status-drift");
    expect(report.issues.find((issue) => issue.code === "unknown-requirement-link")).toMatchObject({
      severity: "error",
      identifier: "task-1 -> REQ-404",
    });
    expect(report.issues.find((issue) => issue.code === "unknown-task-blocker")).toMatchObject({
      severity: "error",
      identifier: "task-1 -> task-404",
    });
    expect(report.issues.find((issue) => issue.code === "requirement-status-drift")?.message).toContain("REQ-1");
  });

  it("warns on legacy missing fingerprints and detects a changed synchronized source", async () => {
    const files = validFiles();
    files["documents.json"] = [
      { label: "Legacy", path: "docs/source.md" },
      { label: "Changed", path: "docs/changed.md", sourceSha256: "b".repeat(64) },
    ];
    files["docs/changed.md"] = "Changed source\n";
    await writeProject(files);

    const report = await validateTrackerProject(projectPath);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-fingerprint",
          severity: "warning",
          identifier: "docs/source.md",
        }),
        expect.objectContaining({
          code: "fingerprint-drift",
          severity: "warning",
          identifier: "docs/changed.md",
        }),
      ])
    );
  });

  it("does not fingerprint a document after access fails", async () => {
    const files = validFiles();
    files["documents.json"] = [
      { label: "Missing", path: "docs/missing.md", sourceSha256: "a".repeat(64) },
    ];
    await writeProject(files);

    const report = await validateTrackerProject(projectPath);

    expect(report.issues.filter((issue) => issue.identifier === "docs/missing.md")).toEqual([
      expect.objectContaining({ code: "missing-document", severity: "error" }),
    ]);
  });

  it("rejects lexical document escapes as a safe fallback", async () => {
    const files = validFiles();
    files["documents.json"] = [
      { label: "Escaped", path: "../escaped.md", sourceSha256: "a".repeat(64) },
    ];
    await writeProject(files);

    const report = await validateTrackerProject(projectPath);

    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "unsafe-document-path", identifier: "../escaped.md" })
    );
  });

  it("rejects manifest and document links that resolve outside their real roots", async () => {
    const files = validFiles();
    files["meta.json"] = {
      id: "demo",
      name: "Demo",
      pages: [{ id: "escaped", type: "sections", source: "escaped.json" }],
    };
    files["documents.json"] = [
      { label: "Escaped", path: "docs/escaped.md", sourceSha256: "a".repeat(64) },
    ];
    await writeProject(files);
    await fs.writeFile(path.join(outsidePath, "escaped.json"), "[]", "utf8");
    await fs.writeFile(path.join(outsidePath, "escaped.md"), "Outside project", "utf8");

    const linkedSource = await tryCreateFileLink(
      path.join(outsidePath, "escaped.json"),
      path.join(projectPath, ".tracker", "escaped.json")
    );
    const linkedDocument = await tryCreateFileLink(
      path.join(outsidePath, "escaped.md"),
      path.join(projectPath, "docs", "escaped.md")
    );

    if (!linkedSource) {
      files["meta.json"] = {
        id: "demo",
        name: "Demo",
        pages: [{ id: "escaped", type: "sections", source: "../escaped.json" }],
      };
    }
    if (!linkedDocument) {
      files["documents.json"] = [
        { label: "Escaped", path: "../escaped.md", sourceSha256: "a".repeat(64) },
      ];
    }
    if (!linkedSource || !linkedDocument) {
      await writeProject(files);
    }

    const report = await validateTrackerProject(projectPath);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unsafe-manifest-source", identifier: linkedSource ? "escaped.json" : "../escaped.json" }),
        expect.objectContaining({ code: "unsafe-document-path", identifier: linkedDocument ? "docs/escaped.md" : "../escaped.md" }),
      ])
    );
  });

  it("rejects a .tracker directory link whose real root is outside the project", async () => {
    await writeProject(validFiles());
    const externalTrackerPath = path.join(outsidePath, "tracker");
    await fs.mkdir(externalTrackerPath, { recursive: true });
    for (const [file, value] of Object.entries(validFiles())) {
      if (!file.endsWith(".json")) continue;
      await fs.writeFile(
        path.join(externalTrackerPath, file),
        typeof value === "string" ? value : JSON.stringify(value),
        "utf8"
      );
    }
    await fs.rm(path.join(projectPath, ".tracker"), { recursive: true, force: true });

    const linked = await tryCreateDirectoryLink(externalTrackerPath, path.join(projectPath, ".tracker"));
    if (!linked) return;

    const report = await validateTrackerProject(projectPath);

    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "unsafe-tracker-directory", identifier: ".tracker" })
    );
  });
});
