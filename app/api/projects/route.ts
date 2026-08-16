import { NextRequest, NextResponse } from "next/server";
import { readRegistry, addProject } from "@/lib/server/registry";

export async function GET() {
  const projects = await readRegistry();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (typeof body.path !== "string" || body.path.trim() === "") {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  try {
    const project = await addProject(body.path.trim());
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
