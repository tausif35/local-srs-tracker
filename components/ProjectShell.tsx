"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { ProjectMeta } from "@/lib/types";
import { ProjectEventsProvider } from "@/hooks/useProjectEvents";

function labelFor(pageId: string, label?: string): string {
  if (label) return label;
  return pageId.charAt(0).toUpperCase() + pageId.slice(1);
}

export function ProjectShell({
  projectId,
  meta,
  children,
}: {
  projectId: string;
  meta: ProjectMeta;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ProjectEventsProvider projectId={projectId}>
      <div className="flex min-h-screen">
        <nav className="w-56 shrink-0 border-r border-slate-800 p-4">
          <Link href="/" className="mb-6 block text-sm text-slate-400 hover:text-slate-200">
            &larr; All projects
          </Link>
          <div className="mb-4 text-lg font-semibold">{meta.name}</div>
          <ul className="space-y-1">
            {meta.pages.map((page) => {
              const href = `/project/${projectId}/${page.id}`;
              const active = pathname === href;
              return (
                <li key={page.id}>
                  <Link
                    href={href}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {labelFor(page.id, page.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex-1 p-8">{children}</div>
      </div>
    </ProjectEventsProvider>
  );
}
