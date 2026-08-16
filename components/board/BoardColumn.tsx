"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function BoardColumn({
  column,
  tasks,
}: {
  column: { id: TaskColumn; label: string };
  tasks: Task[];
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div ref={setNodeRef} className="rounded-lg border border-slate-800 p-3">
      <div className="mb-3 text-sm font-medium text-slate-400">
        {column.label} <span className="text-slate-600">({tasks.length})</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
