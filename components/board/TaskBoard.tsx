"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { validateTaskGraph, validateTaskTransition } from "@/lib/taskWorkflow";
import { BoardColumn } from "./BoardColumn";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailModal } from "./TaskDetailModal";

const COLUMNS: { id: TaskColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "implementation", label: "Implementation" },
  { id: "testing", label: "Testing" },
  { id: "bugs", label: "Bugs" },
  { id: "done", label: "Done" },
];

export function TaskBoard({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange: (next: Task[]) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { id: projectId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Support deep-linking to a specific task, e.g. from a requirement's linked-task chip.
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId) setOpenTaskId(taskId);
  }, [searchParams]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  async function persist(next: Task[]) {
    setError(null);
    try {
      await onChange(next);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save tasks.");
      return false;
    }
  }

  async function handleCreate(task: Task) {
    if (await persist([...tasks, task])) setDialogOpen(false);
  }

  async function handleUpdateTask(updated: Task) {
    const current = tasks.find((task) => task.id === updated.id);
    const next = tasks.map((task) => (task.id === updated.id ? updated : task));
    const issues = [
      ...validateTaskGraph(next),
      ...(current ? validateTaskTransition(current, updated.column, next) : []),
    ];
    if (issues.length > 0) {
      setError(issues.join(" "));
      return;
    }
    if (await persist(next)) setOpenTaskId(null);
  }

  async function handleDeleteTask(taskId: string) {
    if (await persist(tasks.filter((task) => task.id !== taskId))) setOpenTaskId(null);
  }

  function tasksForColumn(column: TaskColumn): Task[] {
    return tasks.filter((t) => t.column === column).sort((a, b) => a.order - b.order);
  }

  function incompleteBlockersFor(task: Task): string[] {
    if (!task.blockedBy || task.blockedBy.length === 0) return [];
    return task.blockedBy
      .map((blockerId) => tasks.find((t) => t.id === blockerId))
      .filter((blocker): blocker is Task => !!blocker && blocker.column !== "done")
      .map((blocker) => blocker.title);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetColumn: TaskColumn = overTask ? overTask.column : (over.id as TaskColumn);

    if (activeTask.column === targetColumn && overTask) {
      const columnTasks = tasksForColumn(targetColumn);
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
      const newIndex = columnTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, index) => ({
        ...t,
        order: index,
      }));
      const rest = tasks.filter((t) => t.column !== targetColumn);
      await persist([...rest, ...reordered]);
      return;
    }

    const destinationTasks = tasksForColumn(targetColumn);
    const updatedActive: Task = {
      ...activeTask,
      column: targetColumn,
      order: destinationTasks.length,
      updatedAt: new Date().toISOString(),
    };
    const next = [...tasks.filter((t) => t.id !== activeTask.id), updatedActive];
    const issues = validateTaskTransition(activeTask, targetColumn, next);
    if (issues.length > 0) {
      setError(issues.join(" "));
      return;
    }
    await persist(next);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Task Board</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          New task
        </button>
      </div>
      {error && <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksForColumn(column.id)}
              onOpenTask={(task) => setOpenTaskId(task.id)}
              incompleteBlockersFor={incompleteBlockersFor}
            />
          ))}
        </div>
      </DndContext>
      {dialogOpen && <NewTaskDialog onCreate={(task) => void handleCreate(task)} onClose={() => setDialogOpen(false)} />}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          allTasks={tasks}
          projectId={projectId}
          onSave={(task) => void handleUpdateTask(task)}
          onDelete={(taskId) => void handleDeleteTask(taskId)}
          onClose={() => setOpenTaskId(null)}
          onJumpToTask={(taskId) => setOpenTaskId(taskId)}
        />
      )}
    </div>
  );
}
