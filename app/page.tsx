"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { RegisteredProject } from "@/lib/types";

export default function HomePage() {
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProjects() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add project");
      }
      setNewPath("");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold">SRS Tracker</h1>

      <ul className="mb-10 space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/project/${project.id}`}
              className="block rounded-lg border border-slate-800 px-4 py-3 hover:border-slate-600"
            >
              <div className="font-medium">{project.name}</div>
              <div className="text-sm text-slate-400">{project.path}</div>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-slate-400">No projects yet. Add one below.</li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          placeholder="Absolute path to a project folder"
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || newPath.trim() === ""}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Add project
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </main>
  );
}
