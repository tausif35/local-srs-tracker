"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { ProjectMeta } from "@/lib/types";
import { ProjectEventsProvider, useProjectConnectionStatus } from "@/hooks/useProjectEvents";
import { GlobalSearch } from "@/components/GlobalSearch";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";

function labelFor(pageId: string, label?: string): string {
  return label ?? pageId.charAt(0).toUpperCase() + pageId.slice(1);
}

export function ProjectShell({ projectId, projectPath, meta, children }: { projectId: string; projectPath: string; meta: ProjectMeta; children: ReactNode }) {
  return <ProjectEventsProvider projectId={projectId}><ShellContent projectId={projectId} projectPath={projectPath} meta={meta}>{children}</ShellContent></ProjectEventsProvider>;
}

function ShellContent({ projectId, projectPath, meta, children }: { projectId: string; projectPath: string; meta: ProjectMeta; children: ReactNode }) {
  const pathname = usePathname();
  const status = useProjectConnectionStatus();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="truncate font-semibold text-slate-900">{meta.name}</span>
        <button type="button" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} onClick={() => setNavOpen((value) => !value)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">{navOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}</button>
      </header>
      {navOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />}
      <nav aria-label="Project navigation" className={`${navOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-slate-200 bg-slate-50 p-4 transition-transform md:sticky md:top-0 md:h-screen md:w-56 md:translate-x-0`}>
        <Link href="/" className="mb-6 block text-sm text-slate-500 hover:text-slate-900">&larr; All projects</Link>
        <div className="mb-4 text-lg font-semibold tracking-tight text-slate-900">{meta.name}</div>
        <GlobalSearch projectId={projectId} projectPath={projectPath} meta={meta} />
        <ul className="space-y-1">{meta.pages.map((page) => {
          const href = `/project/${projectId}/${page.id}`;
          const active = pathname === href;
          return <li key={page.id}><Link href={href} onClick={() => setNavOpen(false)} className={`block rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{labelFor(page.id, page.label)}</Link></li>;
        })}</ul>
        <div className={`mt-5 rounded-md px-3 py-2 text-xs ${status === "disconnected" ? "bg-amber-50 text-amber-800" : "text-slate-400"}`} role={status === "disconnected" ? "status" : undefined}>
          {status === "connected" ? "Live updates connected" : status === "connecting" ? "Connecting live updates..." : "Live updates disconnected; refresh to check for external changes."}
        </div>
      </nav>
      <div id="main-content" className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</div>
    </div>
  );
}
