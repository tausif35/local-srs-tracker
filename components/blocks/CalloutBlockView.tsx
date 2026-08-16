import type { CalloutBlock } from "@/lib/types";

const TONE_CLASSES: Record<CalloutBlock["content"]["tone"], string> = {
  info: "border-sky-700 bg-sky-950 text-sky-100",
  warning: "border-amber-700 bg-amber-950 text-amber-100",
  danger: "border-red-700 bg-red-950 text-red-100",
  success: "border-emerald-700 bg-emerald-950 text-emerald-100",
};

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[block.content.tone]}`}>
      {block.content.text}
    </div>
  );
}
