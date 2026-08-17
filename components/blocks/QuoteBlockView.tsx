import type { QuoteBlock } from "@/lib/types";

export function QuoteBlockView({ block }: { block: QuoteBlock }) {
  return (
    <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-700">
      <p>&ldquo;{block.content.text}&rdquo;</p>
      {block.content.attribution && (
        <footer className="mt-2 text-sm not-italic text-slate-500">
          &mdash; {block.content.attribution}
        </footer>
      )}
    </blockquote>
  );
}
