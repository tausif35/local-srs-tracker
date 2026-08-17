"use client";

import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { TaskBoard } from "@/components/board/TaskBoard";
import type { Requirement, Task } from "@/lib/types";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tasks, save, loading, saving, error, refetch } = useProjectData<Task[]>(id, "tasks.json", []);
  const { data: requirements } = useProjectData<Requirement[]>(id, "requirements.json", []);

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" aria-label="Loading tasks" />;
  return <><TaskBoard projectId={id} tasks={tasks} requirements={requirements} saving={saving} onChange={save} />{error && <div role="alert" className="fixed bottom-4 right-4 z-50 rounded-lg bg-rose-700 p-3 text-sm text-white shadow-xl">{error} <button type="button" onClick={() => void refetch()} className="ml-2 underline">Retry</button></div>}</>;
}
