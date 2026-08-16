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
