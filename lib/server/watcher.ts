import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";

type ChangeListener = (file: string) => void;

declare global {
  // eslint-disable-next-line no-var
  var __trackerWatchers: Map<string, FSWatcher> | undefined;
  // eslint-disable-next-line no-var
  var __trackerListeners: Map<string, Set<ChangeListener>> | undefined;
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

function ensureWatcher(projectId: string, projectPath: string): void {
  const watchers = getWatchers();
  if (watchers.has(projectId)) return;

  const watcher = chokidar.watch(
    [path.join(projectPath, ".tracker", "*.json"), path.join(projectPath, "*.md")],
    { ignoreInitial: true }
  );

  watcher.on("all", (_event, filePath) => {
    const relFile = path.relative(projectPath, filePath).split(path.sep).join("/");
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
