"use client";

import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { TaskBoard } from "@/components/board/TaskBoard";
import type { Task } from "@/lib/types";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tasks, save } = useProjectData<Task[]>(id, "tasks.json", []);

  return <TaskBoard tasks={tasks} onChange={save} />;
}
