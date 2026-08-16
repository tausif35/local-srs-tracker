"use client";

import { useCallback, useEffect, useState } from "react";
import { useProjectFileEvents } from "./useProjectEvents";
import type { DataFileName } from "@/lib/types";

export function useProjectData<T>(projectId: string, file: DataFileName, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/data/${file}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [projectId, file]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useProjectFileEvents(`.tracker/${file}`, refetch);

  const save = useCallback(
    async (next: T) => {
      setData(next);
      await fetch(`/api/projects/${projectId}/data/${file}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    },
    [projectId, file]
  );

  return { data, setData, save, loading };
}
