import { NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { openDirectory } from "@/lib/server/openDirectory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  try {
    await openDirectory(project.path);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open project directory";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
