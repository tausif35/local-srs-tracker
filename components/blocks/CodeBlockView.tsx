import type { CodeBlock } from "@/lib/types";

export function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-100">
      <code>{block.content.code}</code>
    </pre>
  );
}
