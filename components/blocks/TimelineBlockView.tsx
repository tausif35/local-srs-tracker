import type { TimelineBlock } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  active: "bg-indigo-500",
  planned: "bg-slate-300",
  blocked: "bg-rose-500",
};

const STATUS_LABEL: Record<string, string> = {
  done: "Done",
  active: "In progress",
  planned: "Planned",
  blocked: "Blocked",
};

export function TimelineBlockView({ block }: { block: TimelineBlock }) {
  return (
    <ol className="space-y-4">
      {block.content.entries.map((entry, index) => {
        const status = entry.status ?? "planned";
        const hasCard = Boolean(entry.items?.length || entry.exit);
        return (
          <li key={index} className="flex gap-4">
            <div className="flex flex-col items-center pt-1">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
              {index < block.content.entries.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-slate-200" />
              )}
            </div>
            <div className={`min-w-0 flex-1 ${hasCard ? "pb-2" : "pb-4"}`}>
              <div
                className={
                  hasCard ? "rounded-lg border border-slate-200 p-4" : ""
                }
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="font-medium text-slate-900">{entry.title}</div>
                  <div className="flex items-center gap-2">
                    {entry.date && <span className="text-xs text-slate-400">{entry.date}</span>}
                    {hasCard && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                        {STATUS_LABEL[status]}
                      </span>
                    )}
                  </div>
                </div>
                {entry.description && (
                  <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
                )}
                {entry.items && entry.items.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {entry.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {entry.exit && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <span className="font-medium">Exit: </span>
                    {entry.exit}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
