"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { colorForCategory } from "@/lib/categoryColor";
import type { ContentBlock, ProjectMeta, Requirement, Task, TimelineBlock } from "@/lib/types";

const COLUMNS = ["planning", "implementation", "testing", "bugs", "done"] as const;

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meta } = useProjectData<ProjectMeta | null>(id, "meta.json", null);
  const { data: requirements } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const { data: tasks } = useProjectData<Task[]>(id, "tasks.json", []);
  const hasRoadmap = meta?.pages.some((p) => p.id === "roadmap") ?? false;
  const { data: roadmapBlocks } = useProjectData<ContentBlock[]>(id, "roadmap.json", []);

  const stats = useMemo(() => {
    const critical = requirements.filter((r) => r.critical).length;
    const done = requirements.filter((r) => r.status === "done").length;
    const byColumn = tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.column] = (acc[task.column] ?? 0) + 1;
      return acc;
    }, {});
    return { totalRequirements: requirements.length, critical, done, byColumn };
  }, [requirements, tasks]);

  const criticalRequirements = useMemo(
    () => requirements.filter((r) => r.critical).slice(0, 6),
    [requirements]
  );

  const currentPhase = useMemo(() => {
    if (!hasRoadmap) return null;
    const timelines = roadmapBlocks.filter((b): b is TimelineBlock => b.type === "timeline");
    const releasePlan =
      timelines.find((b) => !/revision|changelog|history/i.test(b.title ?? "")) ?? timelines[0];
    if (!releasePlan) return null;
    const entries = releasePlan.content.entries;
    return (
      entries.find((e) => e.status === "active") ?? entries.find((e) => e.status === "planned") ?? entries[0] ?? null
    );
  }, [roadmapBlocks, hasRoadmap]);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {meta?.name ?? "Overview"}
        </h1>
        {meta?.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{meta.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Requirements" value={stats.totalRequirements} />
        <StatCard label="Critical" value={stats.critical} accent="rose" />
        <StatCard label="Requirements done" value={stats.done} accent="emerald" />
        <StatCard label="Tasks total" value={tasks.length} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium text-slate-900">Critical constraints</h2>
          {criticalRequirements.length === 0 ? (
            <p className="text-sm text-slate-500">No requirements marked critical yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {criticalRequirements.map((req) => {
                const color = colorForCategory(req.category);
                return (
                  <div key={req.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                        {req.id}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${color.bg} ${color.text} ${color.border}`}
                      >
                        {req.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800">{req.text}</p>
                  </div>
                );
              })}
            </div>
          )}
          {stats.critical > criticalRequirements.length && (
            <Link
              href={`/project/${id}/requirements`}
              className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
            >
              View all {stats.critical} critical requirements &rarr;
            </Link>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium text-slate-900">Current phase</h2>
          {currentPhase ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="font-medium text-slate-900">{currentPhase.title}</div>
              {currentPhase.description && (
                <p className="mt-1.5 text-sm text-slate-600">{currentPhase.description}</p>
              )}
              <Link
                href={`/project/${id}/roadmap`}
                className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
              >
                View roadmap &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No roadmap defined yet.</p>
          )}

          <h2 className="mb-3 mt-6 text-lg font-medium text-slate-900">Task board</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <StatCard key={column} label={column} value={stats.byColumn[column] ?? 0} compact />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
  compact,
}: {
  label: string;
  value: number;
  accent?: "rose" | "emerald";
  compact?: boolean;
}) {
  const valueColor =
    accent === "rose" ? "text-rose-600" : accent === "emerald" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className={`rounded-lg border border-slate-200 ${compact ? "p-3" : "p-4"}`}>
      <div className={`${compact ? "text-lg" : "text-2xl"} font-semibold ${valueColor}`}>{value}</div>
      <div className="text-sm capitalize text-slate-500">{label}</div>
    </div>
  );
}
