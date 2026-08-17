"use client";

import { useState, type FormEvent } from "react";
import { nanoid } from "nanoid";
import type { Task } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";

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
    <Dialog open title="New task" onClose={onClose} panelClassName="max-w-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <h2 className="mb-4 text-lg font-medium text-slate-900">New task</h2>
        <label className="mb-3 block text-sm font-medium text-slate-700">Title<input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          autoFocus
        /></label>
        <label className="mb-4 block text-sm font-medium text-slate-700">Description<textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          rows={3}
        /></label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
}
