import { NextRequest, NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { readDataFile, readDocFile } from "@/lib/server/trackerFs";
import type { DocumentEntry } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; path: string[] } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const relPath = params.path.join("/");
  const documents = await readDataFile<DocumentEntry[]>(project.path, "documents.json");
  const isRegistered = documents.some((doc) => doc.path === relPath);
  if (!isRegistered) {
    return NextResponse.json({ error: "Path not registered in documents.json" }, { status: 403 });
  }

  const content = await readDocFile(project.path, relPath);
  return NextResponse.json({ path: relPath, content });
}
