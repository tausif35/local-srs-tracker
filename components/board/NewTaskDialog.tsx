"use client";

import { useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import type { Task } from "@/lib/types";

export function NewTaskDialog({
  onCreate,
  onClose,
}: {
  onCreate: (task: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "") return;
    const now = new Date().toISOString();
    onCreate({
      id: nanoid(),
      title: title.trim(),
      description: description.trim() || undefined,
      column: "planning",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-6"
      >
        <h2 className="mb-4 text-lg font-medium">New task</h2>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          autoFocus
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
