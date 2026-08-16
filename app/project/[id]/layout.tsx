import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { findProject } from "@/lib/server/registry";
import { readDataFile } from "@/lib/server/trackerFs";
import type { ProjectMeta } from "@/lib/types";
import { ProjectShell } from "@/components/ProjectShell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  const project = await findProject(params.id);
  if (!project) notFound();

  const meta = await readDataFile<ProjectMeta>(project.path, "meta.json");

  return (
    <ProjectShell projectId={params.id} meta={meta}>
      {children}
    </ProjectShell>
  );
}
