"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-slate-700 bg-slate-900 p-3 text-sm"
    >
      <div className="font-medium">{task.title}</div>
      {task.priority && <div className="mt-1 text-xs uppercase text-slate-500">{task.priority}</div>}
    </div>
  );
}
