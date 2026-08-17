import { NextRequest, NextResponse } from "next/server";
import { removeProject, updateProject } from "@/lib/server/registry";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const updates = {
    name: typeof body.name === "string" ? body.name : undefined,
    pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
    lastOpenedAt: typeof body.lastOpenedAt === "string" ? body.lastOpenedAt : undefined,
  };
  try {
    return NextResponse.json(await updateProject(params.id, updates));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update project";
    return NextResponse.json({ error: message }, { status: message.startsWith("Project not found") ? 404 : 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await removeProject(params.id);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove project";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
