import { NextRequest, NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { readDataFile, writeDataFile } from "@/lib/server/trackerFs";
import { schemaForFile } from "@/lib/server/validation";
import {
  synchronizeRequirementStatuses,
  validateTaskGraph,
  validateTaskTransition,
} from "@/lib/taskWorkflow";
import { isSafeJsonFilename, type ProjectMeta, type Requirement, type Task } from "@/lib/types";

/**
 * A data file is readable/writable if it's meta.json itself, or if it's declared as some
 * page's `source` in the project's own meta.json manifest. This lets projects define custom
 * "sections" pages (e.g. "modules.json") without the app needing to know about them ahead
 * of time, while still preventing arbitrary filesystem access.
 */
async function isDeclaredDataFile(projectPath: string, file: string): Promise<boolean> {
  if (file === "meta.json") return true;
  try {
    const meta = await readDataFile<ProjectMeta>(projectPath, "meta.json");
    return meta.pages.some((page) => page.source === file);
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isSafeJsonFilename(params.file)) {
    return NextResponse.json({ error: "Invalid data file name" }, { status: 400 });
  }
  if (!(await isDeclaredDataFile(project.path, params.file))) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const data = await readDataFile(project.path, params.file);
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isSafeJsonFilename(params.file)) {
    return NextResponse.json({ error: "Invalid data file name" }, { status: 400 });
  }
  if (!(await isDeclaredDataFile(project.path, params.file))) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const body = await request.json();
  const schema = schemaForFile(params.file);
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  if (params.file === "tasks.json") {
    const nextTasks = result.data as Task[];
    const graphIssues = validateTaskGraph(nextTasks);
    const currentTasks = await readDataFile<Task[]>(project.path, "tasks.json");
    const currentById = new Map(currentTasks.map((task) => [task.id, task]));
    const transitionIssues = nextTasks.flatMap((task) => {
      const current = currentById.get(task.id);
      if (current && current.column !== task.column) {
        return validateTaskTransition(current, task.column, nextTasks);
      }
      if (!current && task.column !== "planning") {
        return [`New task ${task.id} must start in planning.`];
      }
      return [];
    });
    const issues = [...graphIssues, ...transitionIssues];
    if (issues.length > 0) {
      return NextResponse.json({ error: "Invalid task workflow", issues }, { status: 400 });
    }

    const requirements = await readDataFile<Requirement[]>(project.path, "requirements.json");
    const syncedRequirements = synchronizeRequirementStatuses(requirements, nextTasks);
    await writeDataFile(project.path, "tasks.json", nextTasks);
    await writeDataFile(project.path, "requirements.json", syncedRequirements);
    return NextResponse.json({ ok: true });
  }

  await writeDataFile(project.path, params.file, result.data);
  return NextResponse.json({ ok: true });
}
