import type { ListBlock } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  done: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700",
  none: "text-slate-700",
};

export function ListBlockView({ block }: { block: ListBlock }) {
  const Tag = block.content.ordered ? "ol" : "ul";
  return (
    <Tag className={block.content.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
      {block.content.items.map((item, index) => (
        <li key={index} className={STATUS_COLOR[item.status ?? "none"]}>
          {item.text}
        </li>
      ))}
    </Tag>
  );
}
