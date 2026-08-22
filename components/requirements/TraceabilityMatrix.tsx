"use client";

import Link from "next/link";
import type { Requirement, Task } from "@/lib/types";

export function TraceabilityMatrix({ requirements, tasks, projectId }: { requirements: Requirement[]; tasks: Task[]; projectId: string }) {
  const columns = ["planning", "implementation", "testing", "bugs", "done"];
  
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100/50 backdrop-blur text-xs uppercase text-slate-500 font-semibold tracking-wider">
          <tr>
            <th className="px-4 py-3 border-b border-slate-200/60 w-1/3">Requirement</th>
            {columns.map(col => <th key={col} className="px-4 py-3 border-b border-slate-200/60 text-center">{col}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/60">
          {requirements.map((req) => {
            const reqTasks = tasks.filter(t => t.requirementIds?.includes(req.id));
            const hasNoTasks = reqTasks.length === 0;
            
            return (
              <tr key={req.id} className={`hover:bg-slate-50/50 transition-colors ${hasNoTasks ? 'bg-rose-50/20' : ''}`}>
                <td className="px-4 py-3 align-top border-r border-slate-100/50">
                  <div className="font-mono text-xs text-slate-500 mb-1">{req.id}</div>
                  <div className="text-slate-800 font-medium mb-1.5 leading-snug">{req.text}</div>
                  {hasNoTasks && <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">⚠️ UNCOVERED</span>}
                </td>
                {columns.map(col => {
                  const tasksInCol = reqTasks.filter(t => t.column === col);
                  return (
                    <td key={col} className="px-3 py-3 align-top border-r border-slate-100/50 last:border-r-0">
                      <div className="flex flex-col gap-1.5">
                        {tasksInCol.map(t => (
                          <Link 
                            key={t.id} 
                            href={`/project/${projectId}/board?task=${t.id}`}
                            className={`block p-2 rounded-lg border text-xs transition-transform hover:-translate-y-0.5
                              ${col === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' : 
                                col === 'bugs' ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm' : 
                                'bg-white border-slate-200 text-slate-700 shadow-sm'}`}
                          >
                            <div className="font-medium truncate" title={t.title}>{t.title}</div>
                            {t.metadata?.implementedBy && <div className="text-[9px] mt-1 text-slate-500 font-medium">⚡ {t.metadata.implementedBy}</div>}
                          </Link>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
