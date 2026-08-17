import { describe, expect, it } from "vitest";
import { requirementsFileSchema, tasksFileSchema, contentBlockSchema, schemaForFile } from "./validation";

describe("requirementsFileSchema", () => {
  it("accepts a valid requirement list", () => {
    const result = requirementsFileSchema.safeParse([
      { id: "DC-1", section: "2.4", category: "Constraint", text: "Must work.", critical: true },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects a requirement missing required fields", () => {
    const result = requirementsFileSchema.safeParse([{ id: "DC-1" }]);
    expect(result.success).toBe(false);
  });
});

describe("tasksFileSchema", () => {
  const baseTask = {
    id: "t-1",
    title: "Implement workflow",
    column: "planning",
    order: 0,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };

  it("preserves the optional workflow fields and verification evidence", () => {
    const result = tasksFileSchema.safeParse([
      {
        ...baseTask,
        scope: "Task lifecycle rules",
        exclusions: ["Board UI"],
        architectureRefs: ["ARC-4"],
        acceptanceCriteria: ["Reject invalid transitions"],
        verification: {
          commands: ["npm test -- lib/taskWorkflow.test.ts"],
          status: "passed",
          evidence: "All focused tests pass.",
        },
        unresolvedDecisions: ["OI-7"],
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]).toMatchObject({
      scope: "Task lifecycle rules",
      exclusions: ["Board UI"],
      architectureRefs: ["ARC-4"],
      acceptanceCriteria: ["Reject invalid transitions"],
      verification: {
        commands: ["npm test -- lib/taskWorkflow.test.ts"],
        status: "passed",
        evidence: "All focused tests pass.",
      },
      unresolvedDecisions: ["OI-7"],
    });
  });

  it("rejects verification without commands and a recognized status", () => {
    expect(
      tasksFileSchema.safeParse([
        { ...baseTask, verification: { commands: [], status: "unknown" } },
      ]).success
    ).toBe(false);
  });

  it("preserves legacy task metadata that the workflow does not interpret", () => {
    const result = tasksFileSchema.safeParse([
      {
        ...baseTask,
        legacyEstimate: 3,
        migrationMetadata: { importedBy: "tracker-v1", labels: ["legacy"] },
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]).toMatchObject({
      legacyEstimate: 3,
      migrationMetadata: { importedBy: "tracker-v1", labels: ["legacy"] },
    });
  });

  it("rejects whitespace-only workflow entries", () => {
    const invalidEntries = [
      { exclusions: [" \t "] },
      { architectureRefs: [" \t "] },
      { acceptanceCriteria: [" \t "] },
      { verification: { commands: [" \t "], status: "pending" } },
      { unresolvedDecisions: [" \t "] },
    ];

    for (const entry of invalidEntries) {
      expect(tasksFileSchema.safeParse([{ ...baseTask, ...entry }]).success).toBe(false);
    }
  });
});

describe("contentBlockSchema", () => {
  it("accepts a valid table block", () => {
    const result = contentBlockSchema.safeParse({
      id: "tech-stack",
      type: "table",
      content: { columns: ["Layer", "Choice"], rows: [[{ value: "Backend" }, { value: "Next.js" }]] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a block with an unknown type", () => {
    const result = contentBlockSchema.safeParse({ id: "x", type: "not-a-type", content: {} });
    expect(result.success).toBe(false);
  });
});

describe("schemaForFile", () => {
  it("maps tasks.json to the tasks schema", () => {
    expect(schemaForFile("tasks.json")).toBe(tasksFileSchema);
  });

  it("maps architecture.json to the sections schema", () => {
    expect(schemaForFile("architecture.json")).toBe(schemaForFile("strategy.json"));
  });
});
