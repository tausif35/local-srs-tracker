"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentBlock, ProjectMeta, Requirement, Task } from "@/lib/types";
import { blockSnippet } from "@/lib/blockSearchText";

interface SearchResult {
  kind: "requirement" | "task" | "block";
  key: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch({ projectId, meta }: { projectId: string; meta: ProjectMeta }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache the flattened, searchable index for this project once per open session, so retyping
  // doesn't refetch every file on every keystroke.
  const indexRef = useRef<SearchResult[] | null>(null);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      if (!indexRef.current) loadIndex();
    } else {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadIndex() {
    setLoading(true);
    const index: SearchResult[] = [];

    async function fetchJson<T>(file: string, fallback: T): Promise<T> {
      try {
        const res = await fetch(`/api/projects/${projectId}/data/${file}`);
        if (!res.ok) return fallback;
        return (await res.json()) as T;
      } catch {
        return fallback;
      }
    }

    const [requirements, tasks] = await Promise.all([
      fetchJson<Requirement[]>("requirements.json", []),
      fetchJson<Task[]>("tasks.json", []),
    ]);

    for (const req of requirements) {
      index.push({
        kind: "requirement",
        key: `req-${req.id}`,
        title: req.id,
        subtitle: req.text,
        href: `/project/${projectId}/requirements?q=${encodeURIComponent(req.id)}`,
      });
    }

    for (const task of tasks) {
      index.push({
        kind: "task",
        key: `task-${task.id}`,
        title: task.title,
        subtitle: task.description ?? task.notes ?? "",
        href: `/project/${projectId}/board?task=${task.id}`,
      });
    }

    const sectionPages = meta.pages.filter((p) => p.type === "sections" && p.source);
    const blockLists = await Promise.all(
      sectionPages.map((page) => fetchJson<ContentBlock[]>(page.source!, []))
    );
    sectionPages.forEach((page, i) => {
      for (const block of blockLists[i]) {
        index.push({
          kind: "block",
          key: `block-${page.id}-${block.id}`,
          title: block.title ?? page.label ?? page.id,
          subtitle: `${page.label ?? page.id} · ${blockSnippet(block)}`,
          href: `/project/${projectId}/${page.id}#block-${block.id}`,
        });
      }
    });

    indexRef.current = index;
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!open) return [];
    const index = indexRef.current;
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (q === "") return index.slice(0, 20);
    return index
      .filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, open, loading]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:border-slate-300"
      >
        <span>Search…</span>
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
          Ctrl K
        </kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/60 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requirements, tasks, and pages…"
              className="w-full border-b border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <div className="max-h-96 overflow-y-auto">
              {loading && <p className="px-4 py-3 text-sm text-slate-400">Indexing…</p>}
              {!loading && filtered.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">No matches.</p>
              )}
              {!loading &&
                filtered.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => go(item.href)}
                    className="block w-full border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                        {item.kind}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-900">{item.title}</span>
                    </div>
                    {item.subtitle && (
                      <p className="mt-0.5 truncate pl-[3.25rem] text-xs text-slate-500">{item.subtitle}</p>
                    )}
                  </button>
                ))}
            </div>
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              <kbd className="rounded border border-slate-200 px-1">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
