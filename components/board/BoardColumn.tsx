"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { TaskCard } from "./TaskCard";

export function BoardColumn({
  column,
  tasks,
  onOpenTask,
  incompleteBlockersFor,
}: {
  column: { id: TaskColumn; label: string };
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  incompleteBlockersFor: (task: Task) => string[];
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div ref={setNodeRef} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 text-sm font-medium text-slate-600">
        {column.label} <span className="text-slate-400">({tasks.length})</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={onOpenTask}
              incompleteBlockers={incompleteBlockersFor(task)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
