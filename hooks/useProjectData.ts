"use client";

import { useCallback, useEffect, useState } from "react";
import { useProjectFileEvents } from "./useProjectEvents";
import type { DataFileName } from "@/lib/types";

export function useProjectData<T>(projectId: string, file: DataFileName, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/data/${file}`);
      if (!res.ok) throw new Error(`Unable to load ${file} (${res.status})`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to load ${file}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, file]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useProjectFileEvents(`.tracker/${file}`, refetch);

  const save = useCallback(
    async (next: T) => {
      const previous = data;
      setData(next);
      try {
        const res = await fetch(`/api/projects/${projectId}/data/${file}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message = Array.isArray(body?.issues)
            ? body.issues.join(" ")
            : typeof body?.error === "string"
              ? body.error
              : `Unable to save ${file} (${res.status})`;
          throw new Error(message);
        }
        setError(null);
      } catch (err) {
        setData(previous);
        const message = err instanceof Error ? err.message : `Unable to save ${file}`;
        setError(message);
        throw err;
      }
    },
    [data, projectId, file]
  );

  return { data, setData, save, loading, error };
}
