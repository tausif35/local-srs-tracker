import type { TimelineBlock } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  active: "bg-indigo-500",
  planned: "bg-slate-600",
  blocked: "bg-red-500",
};

export function TimelineBlockView({ block }: { block: TimelineBlock }) {
  return (
    <ol className="space-y-4 border-l border-slate-800 pl-4">
      {block.content.entries.map((entry, index) => (
        <li key={index} className="relative">
          <span
            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
              STATUS_DOT[entry.status ?? "planned"]
            }`}
          />
          <div className="font-medium">{entry.title}</div>
          {entry.date && <div className="text-xs text-slate-500">{entry.date}</div>}
          {entry.description && <p className="mt-1 text-sm text-slate-400">{entry.description}</p>}
        </li>
      ))}
    </ol>
  );
}
