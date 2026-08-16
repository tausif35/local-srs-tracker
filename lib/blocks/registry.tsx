import type { ComponentType } from "react";
import type { ContentBlock } from "@/lib/types";
import { MarkdownBlockView } from "@/components/blocks/MarkdownBlockView";
import { KeyValueBlockView } from "@/components/blocks/KeyValueBlockView";
import { ListBlockView } from "@/components/blocks/ListBlockView";
import { CalloutBlockView } from "@/components/blocks/CalloutBlockView";
import { QuoteBlockView } from "@/components/blocks/QuoteBlockView";
import { LinkListBlockView } from "@/components/blocks/LinkListBlockView";
import { ImageBlockView } from "@/components/blocks/ImageBlockView";
import { StatGridBlockView } from "@/components/blocks/StatGridBlockView";

type BlockComponent = ComponentType<{ block: ContentBlock }>;

export const blockRegistry: Record<ContentBlock["type"], BlockComponent> = {
  markdown: MarkdownBlockView as BlockComponent,
  keyvalue: KeyValueBlockView as BlockComponent,
  list: ListBlockView as BlockComponent,
  callout: CalloutBlockView as BlockComponent,
  quote: QuoteBlockView as BlockComponent,
  "link-list": LinkListBlockView as BlockComponent,
  image: ImageBlockView as BlockComponent,
  "stat-grid": StatGridBlockView as BlockComponent,
  table: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  comparison: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  progress: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 19
  timeline: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
  diagram: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
  code: MarkdownBlockView as BlockComponent, // placeholder, replaced in Task 20
};
