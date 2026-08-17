import { NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { validateTrackerProject } from "@/lib/server/trackerHealth";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(await validateTrackerProject(project.path));
}
