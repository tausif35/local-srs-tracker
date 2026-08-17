import { describe, expect, it } from "vitest";
import type { Requirement, Task } from "./types";
import {
  synchronizeRequirementStatuses,
  taskImplementationReadiness,
  validateTaskGraph,
  validateTaskTransition,
} from "./taskWorkflow";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Implement task workflow",
    column: "planning",
    order: 0,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("taskImplementationReadiness", () => {
  it("lists every missing implementation prerequisite", () => {
    expect(taskImplementationReadiness(task())).toEqual([
      "Task task-1 needs a meaningful description or scope before implementation.",
      "Task task-1 needs at least one acceptance criterion before implementation.",
      "Task task-1 needs at least one verification command before implementation.",
    ]);
  });

  it("accepts scope, criteria, and a verification command when description is absent", () => {
    expect(
      taskImplementationReadiness(
        task({
          scope: "Validate the task lifecycle.",
          acceptanceCriteria: ["Invalid transitions are rejected."],
          verification: { commands: ["npm test"], status: "pending" },
        })
      )
    ).toEqual([]);
  });
});

describe("validateTaskGraph", () => {
  it("reports unknown blockers, self-dependencies, and dependency cycles", () => {
    const issues = validateTaskGraph([
      task({ id: "task-1", blockedBy: ["missing", "task-1"] }),
      task({ id: "task-2", blockedBy: ["task-3"] }),
      task({ id: "task-3", blockedBy: ["task-2"] }),
    ]);

    expect(issues).toEqual([
      "Task task-1 references unknown blocker missing.",
      "Task task-1 cannot block itself.",
      "Task dependency cycle: task-2 -> task-3 -> task-2.",
    ]);
  });
});

describe("validateTaskTransition", () => {
  const readyTask = task({
    description: "Implement the lifecycle domain.",
    acceptanceCriteria: ["Rules are enforced."],
    verification: { commands: ["npm test"], status: "pending" },
  });

  it("prevents implementation while a blocker is not done", () => {
    expect(
      validateTaskTransition(
        readyTask,
        "implementation",
        [readyTask, task({ id: "blocker", column: "testing" }), task({ id: "done-blocker", column: "done" })]
      )
    ).toEqual([]);

    expect(
      validateTaskTransition(
        { ...readyTask, blockedBy: ["blocker", "done-blocker"] },
        "implementation",
        [readyTask, task({ id: "blocker", column: "testing" }), task({ id: "done-blocker", column: "done" })]
      )
    ).toEqual(["Task task-1 cannot move to implementation while blocker blocker is not done."]);
  });

  it("prevents implementation until the task is ready", () => {
    expect(validateTaskTransition(task(), "implementation", [])).toEqual([
      "Task task-1 needs a meaningful description or scope before implementation.",
      "Task task-1 needs at least one acceptance criterion before implementation.",
      "Task task-1 needs at least one verification command before implementation.",
    ]);
  });

  it("reports an unknown blocker before implementation", () => {
    expect(
      validateTaskTransition(
        { ...readyTask, blockedBy: ["missing-task"] },
        "implementation",
        [readyTask]
      )
    ).toEqual(["Task task-1 cannot move to implementation because blocker missing-task is unknown."]);
  });

  it("allows the declared lifecycle transitions and replanning", () => {
    expect(validateTaskTransition(readyTask, "implementation", [readyTask])).toEqual([]);
    expect(validateTaskTransition(task({ column: "implementation" }), "testing", [])).toEqual([]);
    expect(validateTaskTransition(task({ column: "implementation" }), "bugs", [])).toEqual([]);
    expect(validateTaskTransition(task({ column: "testing" }), "bugs", [])).toEqual([]);
    expect(validateTaskTransition(task({ column: "bugs" }), "implementation", [])).toEqual([]);
    expect(validateTaskTransition(task({ column: "bugs" }), "testing", [])).toEqual([]);
    expect(validateTaskTransition(task({ column: "done" }), "planning", [])).toEqual([]);
  });

  it("requires passed verification and criteria before completion", () => {
    expect(
      validateTaskTransition(task({ column: "testing" }), "done", [])
    ).toEqual([
      "Task task-1 cannot move to done without acceptance criteria.",
      "Task task-1 cannot move to done until verification has passed.",
    ]);
  });

  it("allows completion after passed verification and acceptance criteria", () => {
    expect(
      validateTaskTransition(
        task({
          column: "testing",
          acceptanceCriteria: ["Rules are enforced."],
          verification: { commands: ["npm test"], status: "passed" },
        }),
        "done",
        []
      )
    ).toEqual([]);
  });

  it("rejects undeclared forward transitions", () => {
    expect(validateTaskTransition(task({ column: "planning" }), "testing", [])).toEqual([
      "Task task-1 cannot move from planning to testing.",
    ]);
  });
});

describe("synchronizeRequirementStatuses", () => {
  it("derives statuses from every linked task without mutating the input requirements", () => {
    const requirements: Requirement[] = [
      { id: "REQ-1", section: "1", category: "Functional", text: "First", status: "done" },
      { id: "REQ-2", section: "1", category: "Functional", text: "Second" },
      { id: "REQ-3", section: "1", category: "Functional", text: "Third" },
      { id: "REQ-4", section: "1", category: "Functional", text: "Unlinked" },
    ];
    const result = synchronizeRequirementStatuses(requirements, [
      task({ id: "a", column: "planning", requirementIds: ["REQ-1"] }),
      task({ id: "b", column: "planning", requirementIds: ["REQ-1"] }),
      task({ id: "c", column: "done", requirementIds: ["REQ-2"] }),
      task({ id: "d", column: "implementation", requirementIds: ["REQ-3"] }),
    ]);

    expect(result.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "REQ-1", status: "not-started" },
      { id: "REQ-2", status: "done" },
      { id: "REQ-3", status: "in-progress" },
      { id: "REQ-4", status: "not-started" },
    ]);
    expect(requirements[0].status).toBe("done");
    expect(result[0]).not.toBe(requirements[0]);
  });
});
