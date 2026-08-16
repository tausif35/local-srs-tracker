import type { ProgressBlock } from "@/lib/types";

export function ProgressBlockView({ block }: { block: ProgressBlock }) {
  return (
    <div className="space-y-3">
      {block.content.items.map((item, index) => (
        <div key={index}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="text-slate-400">{item.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
