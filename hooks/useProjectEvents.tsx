"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type Listener = (file: string) => void;

interface EventsContextValue {
  subscribe: (file: string, listener: Listener) => () => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function ProjectEventsProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  useEffect(() => {
    const source = new EventSource(`/api/projects/${projectId}/events`);
    source.onmessage = (event) => {
      const file = event.data;
      const listeners = listenersRef.current.get(file);
      if (listeners) {
        for (const listener of listeners) listener(file);
      }
    };
    return () => source.close();
  }, [projectId]);

  const subscribe = (file: string, listener: Listener) => {
    if (!listenersRef.current.has(file)) {
      listenersRef.current.set(file, new Set());
    }
    listenersRef.current.get(file)!.add(listener);
    return () => {
      listenersRef.current.get(file)?.delete(listener);
    };
  };

  return <EventsContext.Provider value={{ subscribe }}>{children}</EventsContext.Provider>;
}

export function useProjectFileEvents(file: string, onChange: () => void): void {
  const context = useContext(EventsContext);
  useEffect(() => {
    if (!context) return;
    return context.subscribe(file, onChange);
  }, [context, file, onChange]);
}
