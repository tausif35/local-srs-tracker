"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import type { Requirement, Task } from "@/lib/types";

const COLUMNS = ["planning", "implementation", "testing", "bugs", "done"] as const;

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: requirements } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const { data: tasks } = useProjectData<Task[]>(id, "tasks.json", []);

  const stats = useMemo(() => {
    const critical = requirements.filter((r) => r.critical).length;
    const done = requirements.filter((r) => r.status === "done").length;
    const byColumn = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.column] = (acc[task.column] ?? 0) + 1;
      return acc;
    }, {});
    return { totalRequirements: requirements.length, critical, done, byColumn };
  }, [requirements, tasks]);

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Requirements" value={stats.totalRequirements} />
        <StatCard label="Critical" value={stats.critical} />
        <StatCard label="Requirements done" value={stats.done} />
        <StatCard label="Tasks total" value={tasks.length} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-medium">Task board</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {COLUMNS.map((column) => (
          <StatCard key={column} label={column} value={stats.byColumn[column] ?? 0} />
        ))}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm capitalize text-slate-400">{label}</div>
    </div>
  );
}
