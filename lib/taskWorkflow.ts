import type { Requirement, Task, TaskColumn } from "./types";

function hasMeaningfulText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasMeaningfulEntry(values: string[] | undefined): boolean {
  return Boolean(values?.some((value) => value.trim().length > 0));
}

/** Returns the reasons a task cannot move from planning into implementation. */
export function taskImplementationReadiness(task: Task): string[] {
  const issues: string[] = [];

  if (!hasMeaningfulText(task.description) && !hasMeaningfulText(task.scope)) {
    issues.push(`Task ${task.id} needs a meaningful description or scope before implementation.`);
  }
  if (!hasMeaningfulEntry(task.acceptanceCriteria)) {
    issues.push(`Task ${task.id} needs at least one acceptance criterion before implementation.`);
  }
  if (!hasMeaningfulEntry(task.verification?.commands)) {
    issues.push(`Task ${task.id} needs at least one verification command before implementation.`);
  }

  return issues;
}

/** Returns deterministic dependency issues for a proposed complete task set. */
export function validateTaskGraph(tasks: Task[]): string[] {
  const issues: string[] = [];
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  for (const task of tasks) {
    for (const blockerId of task.blockedBy ?? []) {
      if (blockerId === task.id) {
        issues.push(`Task ${task.id} cannot block itself.`);
      } else if (!taskById.has(blockerId)) {
        issues.push(`Task ${task.id} references unknown blocker ${blockerId}.`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  function visit(task: Task): void {
    visiting.add(task.id);
    path.push(task.id);

    for (const blockerId of task.blockedBy ?? []) {
      if (blockerId === task.id || !taskById.has(blockerId)) continue;

      if (visiting.has(blockerId)) {
        const cycleStart = path.indexOf(blockerId);
        const cycle = [...path.slice(cycleStart), blockerId];
        issues.push(`Task dependency cycle: ${cycle.join(" -> ")}.`);
        continue;
      }

      if (!visited.has(blockerId)) {
        visit(taskById.get(blockerId)!);
      }
    }

    path.pop();
    visiting.delete(task.id);
    visited.add(task.id);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) visit(task);
  }

  return issues;
}

/** Returns the reasons a task cannot move to the requested board column. */
export function validateTaskTransition(task: Task, target: TaskColumn, tasks: Task[]): string[] {
  if (task.column === target || target === "planning") return [];

  if (task.column === "planning" && target === "implementation") {
    const issues = taskImplementationReadiness(task);
    const taskById = new Map(tasks.map((candidate) => [candidate.id, candidate]));

    for (const blockerId of task.blockedBy ?? []) {
      const blocker = taskById.get(blockerId);
      if (!blocker) {
        issues.push(`Task ${task.id} cannot move to implementation because blocker ${blockerId} is unknown.`);
      } else if (blocker.column !== "done") {
        issues.push(`Task ${task.id} cannot move to implementation while blocker ${blockerId} is not done.`);
      }
    }

    return issues;
  }

  if (task.column === "testing" && target === "done") {
    const issues: string[] = [];
    if (!hasMeaningfulEntry(task.acceptanceCriteria)) {
      issues.push(`Task ${task.id} cannot move to done without acceptance criteria.`);
    }
    if (task.verification?.status !== "passed") {
      issues.push(`Task ${task.id} cannot move to done until verification has passed.`);
    }
    return issues;
  }

  const allowedTargets: Partial<Record<TaskColumn, TaskColumn[]>> = {
    implementation: ["testing", "bugs"],
    testing: ["bugs"],
    bugs: ["implementation", "testing"],
  };

  if (allowedTargets[task.column]?.includes(target)) return [];

  return [`Task ${task.id} cannot move from ${task.column} to ${target}.`];
}

/** Returns copied requirements with status derived from every linked task. */
export function synchronizeRequirementStatuses(requirements: Requirement[], tasks: Task[]): Requirement[] {
  return requirements.map((requirement) => {
    const linkedTasks = tasks.filter((task) => task.requirementIds?.includes(requirement.id));
    const status =
      linkedTasks.length === 0 || linkedTasks.every((task) => task.column === "planning")
        ? "not-started"
        : linkedTasks.every((task) => task.column === "done")
          ? "done"
          : "in-progress";

    return { ...requirement, status };
  });
}
