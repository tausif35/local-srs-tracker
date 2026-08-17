import type { CalloutBlock } from "@/lib/types";

const TONE_CLASSES: Record<CalloutBlock["content"]["tone"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[block.content.tone]}`}>
      {block.content.text}
    </div>
  );
}
