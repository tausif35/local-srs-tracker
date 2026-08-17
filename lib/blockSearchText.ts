import type { ContentBlock } from "@/lib/types";

/** Flattens a content block's own text into one searchable string, for project-wide search. */
export function blockSearchText(block: ContentBlock): string {
  const parts: string[] = [block.title ?? ""];

  switch (block.type) {
    case "markdown":
      parts.push(block.content.text);
      break;
    case "table":
      parts.push(block.content.columns.join(" "));
      for (const row of block.content.rows) parts.push(row.map((cell) => cell.value).join(" "));
      break;
    case "keyvalue":
      for (const item of block.content.items) parts.push(item.label, item.value);
      break;
    case "stat-grid":
      for (const stat of block.content.stats) parts.push(stat.label, stat.value, stat.sublabel ?? "");
      break;
    case "list":
      for (const item of block.content.items) parts.push(item.text);
      break;
    case "timeline":
      for (const entry of block.content.entries) {
        parts.push(entry.title, entry.description ?? "", entry.exit ?? "", ...(entry.items ?? []));
      }
      break;
    case "diagram":
      parts.push(block.content.mermaid);
      break;
    case "code":
      parts.push(block.content.code);
      break;
    case "comparison":
      for (const card of block.content.cards) {
        parts.push(card.title, ...card.attributes.map((a) => `${a.label} ${a.value}`));
      }
      break;
    case "progress":
      for (const item of block.content.items) parts.push(item.label);
      break;
    case "callout":
      parts.push(block.content.text);
      break;
    case "link-list":
      for (const link of block.content.links) parts.push(link.label, link.description ?? "");
      break;
    case "quote":
      parts.push(block.content.text, block.content.attribution ?? "");
      break;
    case "image":
      parts.push(block.content.alt, block.content.caption ?? "");
      break;
  }

  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** A short, human-readable snippet describing what kind of content a block holds, for a search result subtitle. */
export function blockSnippet(block: ContentBlock): string {
  switch (block.type) {
    case "markdown":
      return block.content.text.slice(0, 100);
    case "table":
      return `Table · ${block.content.rows.length} row${block.content.rows.length === 1 ? "" : "s"}`;
    case "callout":
      return block.content.text.slice(0, 100);
    case "quote":
      return block.content.text.slice(0, 100);
    default:
      return block.type;
  }
}
