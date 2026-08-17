import type { ImageBlock } from "@/lib/types";

export function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.content.src} alt={block.content.alt} className="rounded-lg border border-slate-200" />
      {block.content.caption && (
        <figcaption className="mt-2 text-sm text-slate-500">{block.content.caption}</figcaption>
      )}
    </figure>
  );
}
