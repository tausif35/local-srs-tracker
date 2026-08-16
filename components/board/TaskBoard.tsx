"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task, TaskColumn } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";

const COLUMNS: { id: TaskColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "implementation", label: "Implementation" },
  { id: "testing", label: "Testing" },
  { id: "bugs", label: "Bugs" },
  { id: "done", label: "Done" },
];

export function TaskBoard({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange: (next: Task[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function tasksForColumn(column: TaskColumn): Task[] {
    return tasks.filter((t) => t.column === column).sort((a, b) => a.order - b.order);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetColumn: TaskColumn = overTask ? overTask.column : (over.id as TaskColumn);

    if (activeTask.column === targetColumn && overTask) {
      const columnTasks = tasksForColumn(targetColumn);
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
      const newIndex = columnTasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, index) => ({
        ...t,
        order: index,
      }));
      const rest = tasks.filter((t) => t.column !== targetColumn);
      onChange([...rest, ...reordered]);
      return;
    }

    const destinationTasks = tasksForColumn(targetColumn);
    const updatedActive: Task = {
      ...activeTask,
      column: targetColumn,
      order: destinationTasks.length,
      updatedAt: new Date().toISOString(),
    };
    onChange([...tasks.filter((t) => t.id !== activeTask.id), updatedActive]);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Task Board</h1>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {COLUMNS.map((column) => (
            <BoardColumn key={column.id} column={column} tasks={tasksForColumn(column.id)} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
