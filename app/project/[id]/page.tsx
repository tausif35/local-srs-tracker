import { redirect, notFound } from "next/navigation";
import { findProject } from "@/lib/server/registry";
import { readDataFile } from "@/lib/server/trackerFs";
import type { ProjectMeta } from "@/lib/types";

export default async function ProjectIndexPage({ params }: { params: { id: string } }) {
  const project = await findProject(params.id);
  if (!project) notFound();

  const meta = await readDataFile<ProjectMeta>(project.path, "meta.json");
  const firstPage = meta.pages[0];
  if (!firstPage) notFound();

  redirect(`/project/${params.id}/${firstPage.id}`);
}
