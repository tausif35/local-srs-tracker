import type { ContentBlock } from "@/lib/types";
import { blockRegistry } from "@/lib/blocks/registry";

export function BlockRenderer({ block }: { block: ContentBlock }) {
  const Component = blockRegistry[block.type];
  return (
    <section id={`block-${block.id}`} className="mb-8 scroll-mt-4">
      {block.title && <h2 className="mb-3 text-lg font-medium text-slate-900">{block.title}</h2>}
      <Component block={block} />
    </section>
  );
}
