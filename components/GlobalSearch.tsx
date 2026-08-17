"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentBlock, ProjectMeta, Requirement, Task } from "@/lib/types";
import { blockSnippet } from "@/lib/blockSearchText";
import { Dialog } from "@/components/ui/Dialog";
import { SearchIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/ToastProvider";

interface SearchResult {
  kind: "action" | "requirement" | "task" | "block";
  key: string;
  title: string;
  subtitle: string;
  href?: string;
  action?: () => Promise<void> | void;
}

export function GlobalSearch({ projectId, projectPath, meta }: { projectId: string; projectPath: string; meta: ProjectMeta }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<SearchResult[] | null>(null);

  const actions = useMemo<SearchResult[]>(() => [
    { kind: "action", key: "action-projects", title: "All projects", subtitle: "Return to the project list", href: "/" },
    { kind: "action", key: "action-board", title: "Open task board", subtitle: "View this project's tasks", href: `/project/${projectId}/board` },
    { kind: "action", key: "action-health", title: "Open Tracker Health", subtitle: "Check data quality and references", href: `/project/${projectId}/health` },
    { kind: "action", key: "action-folder", title: "Reveal project directory", subtitle: projectPath, action: async () => {
      const response = await fetch(`/api/projects/${projectId}/open-directory`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to open directory");
      notify("Opened project directory", "success");
    } },
    { kind: "action", key: "action-copy", title: "Copy project path", subtitle: projectPath, action: async () => {
      await navigator.clipboard.writeText(projectPath);
      notify("Project path copied", "success");
    } },
  ], [notify, projectId, projectPath]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (open && !indexRef.current) void loadIndex();
    if (!open) setQuery("");
    // The project index is intentionally cached until this shell is unmounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadIndex() {
    setLoading(true);
    const index: SearchResult[] = [];
    async function fetchJson<T>(file: string, fallback: T): Promise<T> {
      try {
        const response = await fetch(`/api/projects/${projectId}/data/${file}`);
        return response.ok ? (await response.json()) as T : fallback;
      } catch { return fallback; }
    }
    const [requirements, tasks] = await Promise.all([fetchJson<Requirement[]>("requirements.json", []), fetchJson<Task[]>("tasks.json", [])]);
    for (const requirement of requirements) index.push({ kind: "requirement", key: `req-${requirement.id}`, title: requirement.id, subtitle: requirement.text, href: `/project/${projectId}/requirements?q=${encodeURIComponent(requirement.id)}` });
    for (const task of tasks) index.push({ kind: "task", key: `task-${task.id}`, title: task.title, subtitle: task.description ?? task.notes ?? "", href: `/project/${projectId}/board?task=${task.id}` });
    const sectionPages = meta.pages.filter((page) => page.type === "sections" && page.source);
    const blockLists = await Promise.all(sectionPages.map((page) => fetchJson<ContentBlock[]>(page.source!, [])));
    sectionPages.forEach((page, indexNumber) => {
      for (const block of blockLists[indexNumber]) index.push({ kind: "block", key: `block-${page.id}-${block.id}`, title: block.title ?? page.label ?? page.id, subtitle: `${page.label ?? page.id} - ${blockSnippet(block)}`, href: `/project/${projectId}/${page.id}#block-${block.id}` });
    });
    indexRef.current = index;
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!open) return [];
    const values = [...actions, ...(indexRef.current ?? [])];
    const normalized = query.trim().toLowerCase();
    return (normalized ? values.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(normalized)) : values).slice(0, 30);
  }, [actions, query, open, loading]);

  async function choose(item: SearchResult) {
    setOpen(false);
    if (item.href) router.push(item.href);
    else if (item.action) {
      try { await item.action(); }
      catch (caught) { notify(caught instanceof Error ? caught.message : "Action failed", "error"); }
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mb-4 flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:border-slate-300">
        <span className="flex items-center gap-2"><SearchIcon className="h-4 w-4" />Search and actions</span><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl K</kbd>
      </button>
      <Dialog open={open} title="Search and actions" onClose={() => setOpen(false)} panelClassName="max-w-lg" align="top">
        <input ref={inputRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or run an action..." aria-label="Search project" className="w-full rounded-t-xl border-b border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none" />
        <div className="max-h-96 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-sm text-slate-400">Indexing project...</p>}
          {!loading && filtered.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No matches.</p>}
          {filtered.map((item) => <button key={item.key} type="button" onClick={() => void choose(item)} className="block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50"><div className="flex items-center gap-2"><span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">{item.kind}</span><span className="truncate text-sm font-medium text-slate-900">{item.title}</span></div>{item.subtitle && <p className="mt-0.5 truncate pl-[3.25rem] text-xs text-slate-500">{item.subtitle}</p>}</button>)}
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400"><kbd className="rounded border border-slate-200 px-1">Esc</kbd> to close</div>
      </Dialog>
    </>
  );
}
