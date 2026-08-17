"use client";

import { useEffect, useState } from "react";
import type { BrowseFsEntry, BrowseFsResponse } from "@/app/api/browse-fs/route";
import { Dialog } from "@/components/ui/Dialog";

export function FolderPickerDialog({ open, onSelect, onClose }: { open: boolean; onSelect: (path: string) => void; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  const [roots, setRoots] = useState<string[]>([]);
  const [entries, setEntries] = useState<BrowseFsEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function browse(path: string | null) {
    setLoading(true);
    setError(null);
    try {
      const url = path ? `/api/browse-fs?path=${encodeURIComponent(path)}` : "/api/browse-fs";
      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to browse folder");
      const data = body as BrowseFsResponse;
      setCurrentPath(data.path);
      setParent(data.parent);
      setRoots(data.roots);
      setEntries(data.entries);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to browse folder");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void browse(null);
  }, [open]);

  return (
    <Dialog open={open} title="Choose a project folder" onClose={onClose} panelClassName="max-w-lg">
      <div className="flex max-h-[80vh] flex-col p-6">
        <h2 className="mb-1 text-lg font-medium text-slate-900">Choose a project folder</h2>
        <p className="mb-4 truncate text-sm text-slate-500">{currentPath ?? "Select a starting location"}</p>
        {roots.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{roots.map((root) => <button key={root} type="button" onClick={() => void browse(root)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">{root}</button>)}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-200">
          {currentPath && <button type="button" onClick={() => void browse(parent)} disabled={!parent} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40">.. (up)</button>}
          {loading && <p className="px-3 py-2 text-sm text-slate-400">Loading...</p>}
          {!loading && entries.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No subfolders</p>}
          {!loading && entries.map((entry) => <button key={entry.path} type="button" onClick={() => void browse(entry.path)} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50">{entry.name}</button>)}
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
          <button type="button" disabled={!currentPath} onClick={() => currentPath && onSelect(currentPath)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Select this folder</button>
        </div>
      </div>
    </Dialog>
  );
}
