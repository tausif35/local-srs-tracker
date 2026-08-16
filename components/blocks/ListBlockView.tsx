import type { ListBlock } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  done: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  none: "text-slate-300",
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
