"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/types";
import { BlockedIcon } from "@/components/ui/Icons";

export function TaskCard({ task, onOpen, incompleteBlockers }: { task: Task; onOpen: (task: Task) => void; incompleteBlockers: string[] }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const isBlocked = incompleteBlockers.length > 0;
  
  const hasMetadata = task.metadata && (task.metadata.plannedBy || task.metadata.implementedBy);
  
  return (
    <div 
      ref={setNodeRef} 
      style={{ transform: CSS.Transform.toString(transform), transition }} 
      {...attributes} 
      {...listeners} 
      onClick={() => onOpen(task)} 
      className={`cursor-grab rounded-xl border bg-white/80 backdrop-blur-sm p-4 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-white ${isBlocked ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}
    >
      <div className="flex items-start gap-2">
        {isBlocked && (
          <span title={`Blocked by: ${incompleteBlockers.join(", ")}`} className="mt-0.5 shrink-0 text-amber-500 drop-shadow-sm">
            <BlockedIcon className="h-4 w-4" />
          </span>
        )}
        <div className="font-semibold text-slate-800 leading-tight">{task.title}</div>
      </div>
      
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {task.priority && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">{task.priority}</span>}
        {(task.requirementIds?.length ?? 0) > 0 && <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-300"></span> {task.requirementIds!.length} req{task.requirementIds!.length === 1 ? "" : "s"}</span>}
        {task.verification && <span className={`text-xs font-medium flex items-center gap-1 ${task.verification.status === "passed" ? "text-emerald-600" : task.verification.status === "failed" ? "text-rose-600" : "text-slate-400"}`}><span className={`w-1 h-1 rounded-full ${task.verification.status === "passed" ? "bg-emerald-400" : task.verification.status === "failed" ? "bg-rose-400" : "bg-slate-300"}`}></span> verification {task.verification.status}</span>}
      </div>

      {hasMetadata && (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100/60">
          {task.metadata?.plannedBy && (
              <span className="flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 ring-1 ring-inset ring-violet-500/20">
                 ✨ {task.metadata.plannedBy}
              </span>
          )}
          {task.metadata?.implementedBy && (
              <span className="flex items-center gap-1 rounded-md bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-600 ring-1 ring-inset ring-fuchsia-500/20">
                 ⚡ {task.metadata.implementedBy}
              </span>
          )}
        </div>
      )}
    </div>
  );
}
