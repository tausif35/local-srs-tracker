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
import { TableBlockView } from "@/components/blocks/TableBlockView";
import { ComparisonBlockView } from "@/components/blocks/ComparisonBlockView";
import { ProgressBlockView } from "@/components/blocks/ProgressBlockView";
import { TimelineBlockView } from "@/components/blocks/TimelineBlockView";
import { DiagramBlockView } from "@/components/blocks/DiagramBlockView";
import { CodeBlockView } from "@/components/blocks/CodeBlockView";

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
  table: TableBlockView as BlockComponent,
  comparison: ComparisonBlockView as BlockComponent,
  progress: ProgressBlockView as BlockComponent,
  timeline: TimelineBlockView as BlockComponent,
  diagram: DiagramBlockView as BlockComponent,
  code: CodeBlockView as BlockComponent,
};
