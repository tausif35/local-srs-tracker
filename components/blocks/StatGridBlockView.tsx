import type { StatGridBlock } from "@/lib/types";

export function StatGridBlockView({ block }: { block: StatGridBlock }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {block.content.stats.map((stat, index) => (
        <div key={index} className="rounded-lg border border-slate-800 p-4">
          <div className="text-2xl font-semibold">{stat.value}</div>
          <div className="text-sm text-slate-400">{stat.label}</div>
          {stat.sublabel && <div className="text-xs text-slate-600">{stat.sublabel}</div>}
        </div>
      ))}
    </div>
  );
}
