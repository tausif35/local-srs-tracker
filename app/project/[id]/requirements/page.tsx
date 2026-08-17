"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import Link from "next/link";
import { colorForCategory } from "@/lib/categoryColor";
import type { Requirement, Task } from "@/lib/types";

const STATUS_ORDER: NonNullable<Requirement["status"]>[] = ["not-started", "in-progress", "done"];
const PAGE_SIZE = 50;

const STATUS_META: Record<NonNullable<Requirement["status"]>, { label: string; dot: string }> = {
  "not-started": { label: "Not started", dot: "bg-slate-300" },
  "in-progress": { label: "In progress", dot: "bg-amber-500" },
  done: { label: "Done", dot: "bg-emerald-500" },
};

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: requirements, loading } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | NonNullable<Requirement["status"]>>("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Support deep-linking from elsewhere in the app, e.g. /requirements?q=FR-MT-2 from a task's
  // linked-requirement chip.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  const { data: tasks } = useProjectData<Task[]>(id, "tasks.json", []);
  const tasksByRequirement = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      for (const reqId of task.requirementIds ?? []) {
        if (!map.has(reqId)) map.set(reqId, []);
        map.get(reqId)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(requirements.map((r) => r.category)))],
    [requirements]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: requirements.length };
    for (const status of STATUS_ORDER) result[status] = 0;
    for (const r of requirements) result[r.status ?? "not-started"] += 1;
    return result;
  }, [requirements]);

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (criticalOnly && !r.critical) return false;
      if (category !== "all" && r.category !== category) return false;
      if (statusFilter !== "all" && (r.status ?? "not-started") !== statusFilter) return false;
      if (query.trim() === "") return true;
      const q = query.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      );
    });
  }, [requirements, query, category, statusFilter, criticalOnly]);

  useEffect(() => {
    setPage(1);
  }, [query, category, statusFilter, criticalOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRequirements = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const sections = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, Requirement[]>();
    for (const r of visibleRequirements) {
      if (!groups.has(r.section)) {
        groups.set(r.section, []);
        order.push(r.section);
      }
      groups.get(r.section)!.push(r);
    }
    return order.map((section) => ({ section, items: groups.get(section)! }));
  }, [visibleRequirements]);

  return (
    <main>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Requirements</h1>
      <p className="mb-6 text-sm text-slate-500">
        {requirements.length} requirement{requirements.length === 1 ? "" : "s"} · statuses reflect linked task progress
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...STATUS_ORDER] as const).map((status) => {
          const active = statusFilter === status;
          const label = status === "all" ? "All" : STATUS_META[status].label;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                active
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label} <span className="text-slate-400">{counts[status] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search id, text, section..."
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(event) => setCriticalOnly(event.target.checked)}
          />
          Critical only
        </label>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No requirements match these filters.</p>
      ) : (
        <div className="space-y-6">
          {sections.map(({ section, items }) => (
            <div key={section}>
              <div className="sticky top-0 z-10 -mx-2 mb-2 bg-white/95 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 backdrop-blur">
                {section}
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {items.map((req) => {
                  const status = req.status ?? "not-started";
                  const color = colorForCategory(req.category);
                  const linkedTasks = tasksByRequirement.get(req.id) ?? [];
                  return (
                    <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        title={STATUS_META[status].label}
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[status].dot}`}
                      />
                      <span className="mt-0.5 shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                        {req.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800">{req.text}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${color.bg} ${color.text} ${color.border}`}
                          >
                            {req.category}
                          </span>
                          {req.critical && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              Critical
                            </span>
                          )}
                        </div>
                        {linkedTasks.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-slate-400">Tasks:</span>
                            {linkedTasks.map((task) => (
                              <Link
                                key={task.id}
                                href={`/project/${id}/board?task=${task.id}`}
                                title={task.title}
                                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                              >
                                {task.title.length > 40 ? `${task.title.slice(0, 40)}…` : task.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
              <span className="text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button>
                <span className="px-2 py-1.5 text-slate-500">{page} / {pageCount}</span>
                <button disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
