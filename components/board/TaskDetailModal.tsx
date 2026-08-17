"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Requirement, Task, TaskColumn } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { MultiSelectField } from "@/components/ui/MultiSelectField";
import { BlockedIcon, CheckIcon } from "@/components/ui/Icons";

const COLUMN_OPTIONS: { id: TaskColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "implementation", label: "Implementation" },
  { id: "testing", label: "Testing" },
  { id: "bugs", label: "Bugs" },
  { id: "done", label: "Done" },
];

const PRIORITY_OPTIONS: NonNullable<Task["priority"]>[] = ["low", "medium", "high"];

export function TaskDetailModal({
  task,
  allTasks,
  requirements,
  projectId,
  onSave,
  onDelete,
  onClose,
  onJumpToTask,
}: {
  task: Task;
  allTasks: Task[];
  requirements: Requirement[];
  projectId: string;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClose: () => void;
  onJumpToTask: (taskId: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [scope, setScope] = useState(task.scope ?? "");
  const [exclusions, setExclusions] = useState((task.exclusions ?? []).join("\n"));
  const [architectureRefs, setArchitectureRefs] = useState((task.architectureRefs ?? []).join("\n"));
  const [acceptanceCriteria, setAcceptanceCriteria] = useState((task.acceptanceCriteria ?? []).join("\n"));
  const [verificationCommands, setVerificationCommands] = useState((task.verification?.commands ?? []).join("\n"));
  const [verificationStatus, setVerificationStatus] = useState(task.verification?.status ?? "pending");
  const [verificationEvidence, setVerificationEvidence] = useState(task.verification?.evidence ?? "");
  const [unresolvedDecisions, setUnresolvedDecisions] = useState((task.unresolvedDecisions ?? []).join("\n"));
  const [notes, setNotes] = useState(task.notes ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [column, setColumn] = useState<TaskColumn>(task.column);
  const [requirementIds, setRequirementIds] = useState(task.requirementIds ?? []);
  const [blockedBy, setBlockedBy] = useState(task.blockedBy ?? []);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const blockers = blockedBy
    .map((id) => allTasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t);

  function buildTask(updatedAt = task.updatedAt): Task {
    const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
    const commands = lines(verificationCommands);
    return {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      scope: scope.trim() || undefined,
      exclusions: lines(exclusions).length > 0 ? lines(exclusions) : undefined,
      architectureRefs: lines(architectureRefs).length > 0 ? lines(architectureRefs) : undefined,
      acceptanceCriteria: lines(acceptanceCriteria).length > 0 ? lines(acceptanceCriteria) : undefined,
      verification: commands.length > 0
        ? { commands, status: verificationStatus, evidence: verificationEvidence.trim() || undefined }
        : undefined,
      unresolvedDecisions: lines(unresolvedDecisions).length > 0 ? lines(unresolvedDecisions) : undefined,
      notes: notes.trim() || undefined,
      priority,
      column,
      requirementIds: requirementIds.length > 0 ? requirementIds : undefined,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
      updatedAt,
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "") return;
    onSave(buildTask(new Date().toISOString()));
  }

  function requestClose() {
    const dirty = JSON.stringify(buildTask()) !== JSON.stringify(task);
    if (!dirty || window.confirm("Discard your unsaved task changes?")) onClose();
  }

  return (
    <Dialog open title={`Task details: ${task.title}`} onClose={requestClose} panelClassName="max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-medium text-slate-900">Task details</h2>
          <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-400">
            {task.id}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <label className="block text-xs font-medium text-slate-500">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              autoFocus
            />
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Implementation scope
            <textarea value={scope} onChange={(event) => setScope(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>

          <LineList label="Exclusions (one per line)" value={exclusions} onChange={setExclusions} />
          <LineList label="Architecture/module references (one per line)" value={architectureRefs} onChange={setArchitectureRefs} />
          <LineList label="Acceptance criteria (one per line)" value={acceptanceCriteria} onChange={setAcceptanceCriteria} rows={4} />
          <LineList label="Verification commands (one per line)" value={verificationCommands} onChange={setVerificationCommands} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500">
              Verification status
              <select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value as "pending" | "passed" | "failed")} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Verification evidence
              <input value={verificationEvidence} onChange={(event) => setVerificationEvidence(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            </label>
          </div>

          <LineList label="Unresolved decisions (one per line)" value={unresolvedDecisions} onChange={setUnresolvedDecisions} />

          <label className="block text-xs font-medium text-slate-500">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500">
              Column
              <select
                value={column}
                onChange={(event) => setColumn(event.target.value as TaskColumn)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {COLUMN_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Priority
              <select
                value={priority ?? ""}
                onChange={(event) => setPriority((event.target.value || undefined) as Task["priority"])}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">None</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <MultiSelectField label="Linked requirements" options={requirements.map((requirement) => ({ value: requirement.id, label: requirement.text, detail: requirement.section }))} selected={requirementIds} onChange={setRequirementIds} placeholder="Search requirement IDs or text..." />

          {requirementIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {requirementIds.map((reqId) => (
                <Link
                  key={reqId}
                  href={`/project/${projectId}/requirements?q=${encodeURIComponent(reqId)}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {reqId}
                </Link>
              ))}
            </div>
          )}

          <MultiSelectField label="Blocked by" options={allTasks.filter((candidate) => candidate.id !== task.id).map((candidate) => ({ value: candidate.id, label: candidate.title, detail: candidate.column }))} selected={blockedBy} onChange={setBlockedBy} placeholder="Search task IDs or titles..." />

          {blockers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blockers.map((blocker) => (
                <button
                  key={blocker.id}
                  type="button"
                  onClick={() => onJumpToTask(blocker.id)}
                  title={blocker.id}
                  className={`rounded-full border px-2 py-0.5 text-xs hover:border-indigo-300 hover:text-indigo-700 ${
                    blocker.column === "done"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {blocker.column === "done" ? <CheckIcon className="mr-1 inline h-3 w-3" /> : <BlockedIcon className="mr-1 inline h-3 w-3" />}
                  {blocker.title}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400">
            Created {new Date(task.createdAt).toLocaleString()} &middot; Updated{" "}
            {new Date(task.updatedAt).toLocaleString()}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          {confirmingDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Delete this task?</span>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-slate-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm text-rose-600 hover:underline"
            >
              Delete task
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={requestClose} className="px-4 py-2 text-sm text-slate-500">
              Close
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function LineList({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
    </label>
  );
}
