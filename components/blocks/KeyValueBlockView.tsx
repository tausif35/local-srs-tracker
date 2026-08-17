import type { KeyValueBlock } from "@/lib/types";

export function KeyValueBlockView({ block }: { block: KeyValueBlock }) {
  const { dense, items } = block.content;
  return (
    <dl className={dense ? "grid grid-cols-2 gap-x-6 gap-y-1 text-sm" : "space-y-3"}>
      {items.map((item, index) => (
        <div key={index} className={dense ? "contents" : ""}>
          <dt className="text-slate-500">{item.label}</dt>
          <dd className={dense ? "text-slate-800" : "mt-0.5 text-slate-800"}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
