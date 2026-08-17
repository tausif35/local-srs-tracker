"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { TrackerHealthReport } from "@/lib/types";

export default function TrackerHealthPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<TrackerHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/projects/${id}/health`, { cache: "no-store" });
    if (!response.ok) {
      setError(`Health check failed (${response.status})`);
      return;
    }
    setReport(await response.json());
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tracker Health</h1>
          <p className="mt-1 text-sm text-slate-500">Schema, references, dependencies, and SRS synchronization.</p>
        </div>
        <button onClick={() => void refresh()} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          Refresh
        </button>
      </div>
      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!report && !error && <p className="text-sm text-slate-500">Checking project…</p>}
      {report && (
        <>
          <div className="mb-5 flex gap-3">
            <Summary label="Errors" value={report.summary.errors} tone="rose" />
            <Summary label="Warnings" value={report.summary.warnings} tone="amber" />
          </div>
          {report.issues.length === 0 ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              No tracker-health issues found.
            </p>
          ) : (
            <div className="space-y-2">
              {report.issues.map((issue, index) => (
                <div key={`${issue.code}-${issue.identifier ?? index}`} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${issue.severity === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                      {issue.severity}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{issue.code}</span>
                    {issue.identifier && <span className="font-mono text-xs text-slate-400">{issue.identifier}</span>}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{issue.message}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" }) {
  return (
    <div className={`rounded-md border px-4 py-3 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
