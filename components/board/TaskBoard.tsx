"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Requirement, Task, TaskColumn } from "@/lib/types";
import { validateTaskGraph, validateTaskTransition } from "@/lib/taskWorkflow";
import { BoardColumn } from "./BoardColumn";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskDAG } from "./TaskDAG";

const COLUMNS: { id: TaskColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "implementation", label: "Implementation" },
  { id: "testing", label: "Testing" },
  { id: "bugs", label: "Bugs" },
  { id: "done", label: "Done" },
];

export function TaskBoard({
  projectId,
  tasks,
  requirements,
  saving,
  onChange,
}: {
  projectId: string;
  tasks: Task[];
  requirements: Requirement[];
  saving: boolean;
  onChange: (next: Task[]) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [undoTasks, setUndoTasks] = useState<Task[] | null>(null);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Task["priority"] | "all">("all");
  const [view, setView] = useState<"board" | "list" | "graph">("board");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`srs-tracker:board-view:${projectId}`);
    if (saved) try {
        const preference = JSON.parse(saved) as { query?: string; priority?: Task["priority"] | "all"; view?: "board" | "list" | "graph" };
        setQuery(preference.query ?? ""); setPriority(preference.priority ?? "all"); setView(preference.view ?? "board");
      } catch { /* Ignore invalid machine-local preferences. */ }
    setPreferencesLoaded(true);
  }, [projectId]);

  useEffect(() => {
    if (preferencesLoaded) window.localStorage.setItem(`srs-tracker:board-view:${projectId}`, JSON.stringify({ query, priority, view }));
  }, [preferencesLoaded, priority, projectId, query, view]);

  // Support deep-linking to a specific task, e.g. from a requirement's linked-task chip.
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId) setOpenTaskId(taskId);
  }, [searchParams]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  async function persist(next: Task[], undoSnapshot: Task[] = tasks) {
    setError(null);
    try {
      await onChange(next);
      setUndoTasks(undoSnapshot);
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
    return tasks.filter((task) => task.column === column).sort((a, b) => a.order - b.order);
  }

  function visibleTasksForColumn(column: TaskColumn): Task[] {
    const normalized = query.trim().toLowerCase();
    return tasksForColumn(column).filter((task) => (priority === "all" || task.priority === priority) && (!normalized || `${task.id} ${task.title} ${task.description ?? ""}`.toLowerCase().includes(normalized)));
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Task Board</h1>
        <div className="flex items-center gap-2"><span aria-live="polite" className="text-xs text-slate-400">{saving ? "Saving..." : "Saved"}</span><button
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          New task
        </button></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="task-search">Search tasks</label>
        <input id="task-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." className="min-w-48 flex-1 rounded-full border border-slate-300/60 bg-white/60 backdrop-blur px-4 py-2 text-sm shadow-sm transition-colors hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <label className="sr-only" htmlFor="task-priority">Priority</label>
        <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"] | "all")} className="rounded-full border border-slate-300/60 bg-white/60 backdrop-blur px-4 py-2 text-sm shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="flex rounded-full bg-slate-200/50 p-1 shadow-inner backdrop-blur">
          <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${view === "board" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Board</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${view === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>List</button>
          <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${view === "graph" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Graph</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {undoTasks && <div role="status" className="mb-4 flex items-center justify-between rounded-xl bg-indigo-50/80 backdrop-blur p-4 text-sm text-indigo-800 shadow-sm border border-indigo-100"><span>Task change saved.</span><button type="button" className="font-medium underline hover:text-indigo-900" onClick={() => { const snapshot = undoTasks; setUndoTasks(null); void onChange(snapshot).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to undo task change.")); }}>Undo</button></div>}
      
      {view === "list" ? (
        <TaskList tasks={COLUMNS.flatMap((column) => visibleTasksForColumn(column.id))} onOpen={(task) => setOpenTaskId(task.id)} />
      ) : view === "graph" ? (
        <TaskDAG tasks={tasks} onOpenTask={(task) => setOpenTaskId(task.id)} />
      ) : (
        <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {COLUMNS.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={visibleTasksForColumn(column.id)}
                onOpenTask={(task) => setOpenTaskId(task.id)}
                incompleteBlockersFor={incompleteBlockersFor}
              />
            ))}
          </div>
        </DndContext>
      )}
      {dialogOpen && <NewTaskDialog onCreate={(task) => void handleCreate(task)} onClose={() => setDialogOpen(false)} />}
      {openTask && (
        <TaskDetailModal
          key={openTask.id}
          task={openTask}
          allTasks={tasks}
          requirements={requirements}
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

function TaskList({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  if (tasks.length === 0) return <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No tasks match this view.</p>;
  return <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Task</th><th className="px-3 py-2">Column</th><th className="px-3 py-2">Priority</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-0"><button type="button" onClick={() => onOpen(task)} className="w-full px-3 py-3 text-left font-medium text-slate-900">{task.title}<span className="ml-2 font-mono text-xs font-normal text-slate-400">{task.id}</span></button></td><td className="px-3 py-3 capitalize text-slate-600">{task.column}</td><td className="px-3 py-3 capitalize text-slate-600">{task.priority ?? "None"}</td></tr>)}</tbody></table></div>;
}
