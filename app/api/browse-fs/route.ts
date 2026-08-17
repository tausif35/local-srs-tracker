import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export interface BrowseFsEntry {
  name: string;
  path: string;
}

export interface BrowseFsResponse {
  path: string | null;
  parent: string | null;
  roots: string[];
  entries: BrowseFsEntry[];
}

async function listWindowsDrives(): Promise<string[]> {
  const drives: string[] = [];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  await Promise.all(
    Array.from(letters).map(async (letter) => {
      const drive = `${letter}:\\`;
      try {
        await fs.stat(drive);
        drives.push(drive);
      } catch {
        // drive not present, skip
      }
    })
  );
  return drives.sort();
}

async function listRoots(): Promise<string[]> {
  if (process.platform === "win32") {
    return listWindowsDrives();
  }
  return ["/"];
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("path");

  // No path given: return the picker roots (drives on Windows, "/" elsewhere)
  // plus the user's home directory as a convenience shortcut.
  if (!requested) {
    const roots = await listRoots();
    return NextResponse.json({
      path: null,
      parent: null,
      roots,
      entries: [{ name: os.homedir(), path: os.homedir() }],
    } satisfies BrowseFsResponse);
  }

  const resolved = path.resolve(requested);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    return NextResponse.json({ error: `Not a directory: ${resolved}` }, { status: 400 });
  }

  const parent = path.dirname(resolved);

  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(resolved, { withFileTypes: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read directory";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const entries = dirents
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ name: entry.name, path: path.join(resolved, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roots = await listRoots();

  return NextResponse.json({
    path: resolved,
    parent: parent === resolved ? null : parent,
    roots,
    entries,
  } satisfies BrowseFsResponse);
}
