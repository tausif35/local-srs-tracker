import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { readDataFile } from "./trackerFs";
import type { DocumentEntry } from "@/lib/types";

type ChangeListener = (file: string) => void;

declare global {
  // eslint-disable-next-line no-var
  var __trackerWatchers: Map<string, FSWatcher> | undefined;
  // eslint-disable-next-line no-var
  var __trackerListeners: Map<string, Set<ChangeListener>> | undefined;
  // eslint-disable-next-line no-var
  var __trackerDocumentTargets: Map<string, Set<string>> | undefined;
}

function getWatchers(): Map<string, FSWatcher> {
  if (!globalThis.__trackerWatchers) {
    globalThis.__trackerWatchers = new Map();
  }
  return globalThis.__trackerWatchers;
}

function getListeners(): Map<string, Set<ChangeListener>> {
  if (!globalThis.__trackerListeners) {
    globalThis.__trackerListeners = new Map();
  }
  return globalThis.__trackerListeners;
}

function getDocumentTargets(): Map<string, Set<string>> {
  if (!globalThis.__trackerDocumentTargets) globalThis.__trackerDocumentTargets = new Map();
  return globalThis.__trackerDocumentTargets;
}

async function refreshDocumentTargets(projectId: string, projectPath: string, watcher: FSWatcher): Promise<void> {
  let documents: DocumentEntry[] = [];
  try {
    documents = await readDataFile<DocumentEntry[]>(projectPath, "documents.json");
  } catch {
    // A malformed/missing document manifest is surfaced by Tracker Health.
  }

  const root = path.resolve(projectPath);
  const next = new Set(
    documents
      .map((document) => path.resolve(projectPath, document.path))
      .filter((target) => target !== root && target.startsWith(root + path.sep))
  );
  const previous = getDocumentTargets().get(projectId) ?? new Set<string>();
  const removed = [...previous].filter((target) => !next.has(target));
  const added = [...next].filter((target) => !previous.has(target));
  if (removed.length > 0) await watcher.unwatch(removed);
  if (added.length > 0) watcher.add(added);
  getDocumentTargets().set(projectId, next);
}

function ensureWatcher(projectId: string, projectPath: string): void {
  const watchers = getWatchers();
  if (watchers.has(projectId)) return;

  const watcher = chokidar.watch(path.join(projectPath, ".tracker", "*.json"), { ignoreInitial: true });
  void refreshDocumentTargets(projectId, projectPath, watcher);

  watcher.on("all", (_event, filePath) => {
    const relFile = path.relative(projectPath, filePath).split(path.sep).join("/");
    if (relFile === ".tracker/documents.json") {
      void refreshDocumentTargets(projectId, projectPath, watcher);
    }
    const listeners = getListeners().get(projectId);
    if (listeners) {
      for (const listener of listeners) listener(relFile);
    }
  });

  watchers.set(projectId, watcher);
}

export function subscribe(
  projectId: string,
  projectPath: string,
  listener: ChangeListener
): () => void {
  ensureWatcher(projectId, projectPath);
  const listeners = getListeners();
  if (!listeners.has(projectId)) {
    listeners.set(projectId, new Set());
  }
  listeners.get(projectId)!.add(listener);

  return () => {
    listeners.get(projectId)?.delete(listener);
  };
}
