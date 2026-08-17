import type { StatGridBlock } from "@/lib/types";

export function StatGridBlockView({ block }: { block: StatGridBlock }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {block.content.stats.map((stat, index) => (
        <div key={index} className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-semibold text-slate-900">{stat.value}</div>
          <div className="text-sm text-slate-500">{stat.label}</div>
          {stat.sublabel && <div className="text-xs text-slate-400">{stat.sublabel}</div>}
        </div>
      ))}
    </div>
  );
}
