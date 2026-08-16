import type { ComparisonBlock } from "@/lib/types";

export function ComparisonBlockView({ block }: { block: ComparisonBlock }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {block.content.cards.map((card, index) => (
        <div
          key={index}
          className={`rounded-lg border p-4 ${card.recommended ? "border-indigo-500" : "border-slate-800"}`}
        >
          <div className="mb-2 font-medium">
            {card.title}
            {card.recommended && (
              <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs">Recommended</span>
            )}
          </div>
          <dl className="space-y-1 text-sm">
            {card.attributes.map((attr, attrIndex) => (
              <div key={attrIndex} className="flex justify-between gap-4">
                <dt className="text-slate-400">{attr.label}</dt>
                <dd className="text-right">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
