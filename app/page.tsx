"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { RegisteredProject } from "@/lib/types";
import { FolderPickerDialog } from "@/components/FolderPickerDialog";

export default function HomePage() {
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-slate-900">SRS Tracker</h1>

      <ul className="mb-10 space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/project/${project.id}`}
              className="block rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{project.name}</div>
              <div className="text-sm text-slate-500">{project.path}</div>
            </Link>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-slate-500">No projects yet. Add one below.</li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newPath}
          onChange={(event) => setNewPath(event.target.value)}
          placeholder="Absolute path to a project folder"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Browse…
        </button>
        <button
          type="submit"
          disabled={loading || newPath.trim() === ""}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add project
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {pickerOpen && (
        <FolderPickerDialog
          onClose={() => setPickerOpen(false)}
          onSelect={(path) => {
            setNewPath(path);
            setPickerOpen(false);
          }}
        />
      )}
    </main>
  );
}
