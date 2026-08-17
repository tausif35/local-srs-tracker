"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";

export function TaskCard({
  task,
  onOpen,
  incompleteBlockers,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  /** Titles of not-yet-done tasks this one is blocked by, if any. */
  incompleteBlockers: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isBlocked = incompleteBlockers.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      className={`cursor-grab rounded-md border bg-white p-3 text-sm shadow-sm hover:border-indigo-300 ${
        isBlocked ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-1.5">
        {isBlocked && (
          <span title={`Blocked by: ${incompleteBlockers.join(", ")}`} className="mt-0.5 shrink-0 text-amber-500">
            ⛔
          </span>
        )}
        <div className="font-medium text-slate-900">{task.title}</div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {task.priority && <span className="text-xs uppercase text-slate-400">{task.priority}</span>}
        {(task.requirementIds?.length ?? 0) > 0 && (
          <span className="text-xs text-slate-400">
            &middot; {task.requirementIds!.length} requirement{task.requirementIds!.length === 1 ? "" : "s"}
          </span>
        )}
        {task.verification && (
          <span className={`text-xs ${task.verification.status === "passed" ? "text-emerald-600" : task.verification.status === "failed" ? "text-rose-600" : "text-slate-400"}`}>
            · verification {task.verification.status}
          </span>
        )}
      </div>
    </div>
  );
}
