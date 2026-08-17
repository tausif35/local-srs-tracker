"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import type { RegisteredProject } from "@/lib/types";
import { FolderPickerDialog } from "@/components/FolderPickerDialog";
import { Dialog } from "@/components/ui/Dialog";
import { CopyIcon, FolderIcon, MoreIcon, PencilIcon, PinIcon, StarIcon, TrashIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/ToastProvider";

export default function HomePage() {
  const router = useRouter();
  const { notify } = useToast();
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renameProject, setRenameProject] = useState<RegisteredProject | null>(null);
  const [removeProject, setRemoveProject] = useState<RegisteredProject | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load projects");
      const registered = (await response.json()) as RegisteredProject[];
      const enriched = await Promise.all(
        registered.map(async (project) => {
          if (!project.available) return project;
          try {
            const health = await fetch(`/api/projects/${project.id}/health`, { cache: "no-store" });
            if (!health.ok) return project;
            const report = await health.json();
            return { ...project, healthSummary: report.summary } as RegisteredProject;
          } catch { return project; }
        })
      );
      setProjects(enriched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects");
    } finally { setProjectsLoading(false); }
  }

  useEffect(() => { void loadProjects(); }, []);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "") || a.name.localeCompare(b.name)),
    [projects]
  );

  async function patchProject(project: RegisteredProject, updates: Partial<RegisteredProject>) {
    const response = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to update project");
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, ...body } : item));
    return body as RegisteredProject;
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault(); setError(null); setLoading(true);
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: newPath }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to add project");
      setNewPath(""); await loadProjects(); notify("Project registered", "success");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add project"); }
    finally { setLoading(false); }
  }

  async function openProject(project: RegisteredProject) {
    if (!project.available) return;
    try { await patchProject(project, { lastOpenedAt: new Date().toISOString() }); } catch { /* Navigation still works. */ }
    router.push(`/project/${project.id}`);
  }

  async function revealDirectory(project: RegisteredProject) {
    const response = await fetch(`/api/projects/${project.id}/open-directory`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Unable to open directory");
    notify("Opened project directory", "success");
  }

  async function copyPath(project: RegisteredProject) { await navigator.clipboard.writeText(project.path); notify("Project path copied", "success"); }

  async function confirmRename(event: FormEvent) {
    event.preventDefault();
    if (!renameProject || !renameValue.trim()) return;
    try { await patchProject(renameProject, { name: renameValue.trim() }); setRenameProject(null); notify("Project renamed", "success"); }
    catch (err) { notify(err instanceof Error ? err.message : "Unable to rename project", "error"); }
  }

  async function confirmRemove() {
    if (!removeProject) return;
    const response = await fetch(`/api/projects/${removeProject.id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) { notify(body.error ?? "Unable to remove project", "error"); return; }
    setProjects((current) => current.filter((project) => project.id !== removeProject.id));
    setRemoveProject(null); notify("Project removed from SRS Tracker; its files were preserved", "success");
  }

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-8"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">SRS Tracker</h1><p className="mt-1 text-sm text-slate-500">Local project requirements, tasks, state, and decisions.</p></div>

      {projectsLoading ? (
        <div className="mb-10 space-y-3" aria-label="Loading projects">{[0, 1].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : sortedProjects.length === 0 ? (
        <section className="mb-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="font-medium text-slate-900">Add your first project</h2><p className="mt-1 text-sm text-slate-600">Choose a project folder. SRS Tracker will create an empty `.tracker` scaffold without replacing existing files.</p>
          <ol className="mt-4 list-inside list-decimal space-y-1 text-sm text-slate-500"><li>Register the project folder below.</li><li>Import an SRS with the bundled agent skill or edit the JSON files.</li><li>Open Tracker Health and resolve any reported issues.</li></ol>
        </section>
      ) : (
        <ul className="mb-10 space-y-3">
          {sortedProjects.map((project) => (
            <li key={project.id} className={`relative rounded-xl border bg-white shadow-sm ${project.available ? "border-slate-200" : "border-rose-200 bg-rose-50/40"}`}>
              <button type="button" onClick={() => void openProject(project)} disabled={!project.available} className="block w-full rounded-xl px-4 py-4 pr-14 text-left hover:bg-slate-50 disabled:cursor-not-allowed">
                <div className="flex flex-wrap items-center gap-2"><>{project.pinned && <StarIcon className="h-4 w-4 text-amber-500" fill="currentColor" />}</><span className="font-medium text-slate-900">{project.name}</span>{!project.available && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Directory missing</span>}{project.healthSummary && project.available && <HealthBadge project={project} />}</div>
                <div className="mt-1 truncate text-sm text-slate-500">{project.path}</div>{project.lastOpenedAt && <div className="mt-1 text-xs text-slate-400">Opened {new Date(project.lastOpenedAt).toLocaleString()}</div>}
              </button>
              <details className="group absolute right-3 top-3">
                <summary aria-label={`Actions for ${project.name}`} className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-details-marker]:hidden"><MoreIcon className="h-5 w-5" /></summary>
                <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  <ProjectAction icon={<FolderIcon />} label="Reveal in folder" disabled={!project.available} onClick={() => void revealDirectory(project).catch((err) => notify(err.message, "error"))} />
                  <ProjectAction icon={<CopyIcon />} label="Copy path" onClick={() => void copyPath(project).catch(() => notify("Unable to copy path", "error"))} />
                  <ProjectAction icon={<PinIcon />} label={project.pinned ? "Unpin project" : "Pin project"} onClick={() => void patchProject(project, { pinned: !project.pinned }).then(() => notify(project.pinned ? "Project unpinned" : "Project pinned", "success")).catch((err) => notify(err instanceof Error ? err.message : "Unable to update project", "error"))} />
                  <ProjectAction icon={<PencilIcon />} label="Rename display name" onClick={() => { setRenameProject(project); setRenameValue(project.name); }} />
                  <div className="my-1 border-t border-slate-100" /><ProjectAction icon={<TrashIcon />} label="Remove from tracker" danger onClick={() => setRemoveProject(project)} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="project-path">Absolute project path</label><input id="project-path" value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="Absolute path to a project folder" className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Browse…</button><button type="submit" disabled={loading || newPath.trim() === ""} className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading ? "Adding…" : "Add project"}</button>
      </form>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <FolderPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(path) => { setNewPath(path); setPickerOpen(false); }} />
      <Dialog open={Boolean(renameProject)} title="Rename project" onClose={() => setRenameProject(null)} panelClassName="max-w-md"><form onSubmit={confirmRename} className="p-6"><h2 className="text-lg font-medium text-slate-900">Rename project</h2><p className="mt-1 text-sm text-slate-500">This changes only the machine-local display name.</p><label className="mt-4 block text-sm font-medium text-slate-700">Display name<input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRenameProject(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Save</button></div></form></Dialog>
      <Dialog open={Boolean(removeProject)} title="Remove project from SRS Tracker" description="This unregisters the project without deleting any files." onClose={() => setRemoveProject(null)} panelClassName="max-w-md"><div className="p-6"><h2 className="text-lg font-medium text-slate-900">Remove {removeProject?.name}?</h2><p className="mt-2 text-sm text-slate-600">The project directory and every `.tracker` file will remain exactly where they are. You can register the folder again later.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRemoveProject(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button type="button" onClick={() => void confirmRemove()} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white">Remove registration</button></div></div></Dialog>
    </main>
  );
}

function HealthBadge({ project }: { project: RegisteredProject }) {
  const summary = project.healthSummary!;
  if (summary.errors > 0) return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{summary.errors} error{summary.errors === 1 ? "" : "s"}</span>;
  if (summary.warnings > 0) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{summary.warnings} warning{summary.warnings === 1 ? "" : "s"}</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Healthy</span>;
}

function ProjectAction({ icon, label, onClick, disabled, danger }: { icon: ReactElement; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "text-rose-700 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"}`}><span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</button>;
}
