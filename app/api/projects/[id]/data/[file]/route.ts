import { NextRequest, NextResponse } from "next/server";
import { findProject } from "@/lib/server/registry";
import { readDataFile, writeDataFile } from "@/lib/server/trackerFs";
import { schemaForFile } from "@/lib/server/validation";
import { isDataFileName } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isDataFileName(params.file)) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const data = await readDataFile(project.path, params.file);
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; file: string } }
) {
  const project = await findProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!isDataFileName(params.file)) {
    return NextResponse.json({ error: "Unknown data file" }, { status: 400 });
  }
  const body = await request.json();
  const schema = schemaForFile(params.file);
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  await writeDataFile(project.path, params.file, result.data);
  return NextResponse.json({ ok: true });
}
