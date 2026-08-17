import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MarkdownBlock } from "@/lib/types";

export function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  return (
    <div className="prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content.text}</ReactMarkdown>
    </div>
  );
}
