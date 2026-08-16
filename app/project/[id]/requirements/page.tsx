"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import type { Requirement } from "@/lib/types";

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: requirements, loading } = useProjectData<Requirement[]>(id, "requirements.json", []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(requirements.map((r) => r.category)))],
    [requirements]
  );

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (criticalOnly && !r.critical) return false;
      if (category !== "all" && r.category !== category) return false;
      if (query.trim() === "") return true;
      const q = query.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      );
    });
  }, [requirements, query, category, criticalOnly]);

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold">Requirements</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search id, text, section..."
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(event) => setCriticalOnly(event.target.checked)}
          />
          Critical only
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Section</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Text</th>
              <th className="py-2 pr-4">Critical</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => (
              <tr key={req.id} className="border-b border-slate-900">
                <td className="py-2 pr-4 font-mono text-xs">{req.id}</td>
                <td className="py-2 pr-4 text-slate-400">{req.section}</td>
                <td className="py-2 pr-4">{req.category}</td>
                <td className="py-2 pr-4">{req.text}</td>
                <td className="py-2 pr-4">{req.critical ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
