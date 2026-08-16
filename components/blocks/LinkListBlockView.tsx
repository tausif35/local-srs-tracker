import type { LinkListBlock } from "@/lib/types";

export function LinkListBlockView({ block }: { block: LinkListBlock }) {
  return (
    <ul className="space-y-2">
      {block.content.links.map((link, index) => (
        <li key={index}>
          <a href={link.href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
            {link.label}
          </a>
          {link.description && <p className="text-sm text-slate-500">{link.description}</p>}
        </li>
      ))}
    </ul>
  );
}
