import type { ContentBlock } from "@/lib/types";
import { blockRegistry } from "@/lib/blocks/registry";

export function BlockRenderer({ block }: { block: ContentBlock }) {
  const Component = blockRegistry[block.type];
  return (
    <section className="mb-8">
      {block.title && <h2 className="mb-3 text-lg font-medium">{block.title}</h2>}
      <Component block={block} />
    </section>
  );
}
