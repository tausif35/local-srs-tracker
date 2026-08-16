"use client";

import { useEffect, useRef, useState } from "react";
import type { DiagramBlock } from "@/lib/types";

export function DiagramBlockView({ block }: { block: DiagramBlock }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      try {
        const { svg } = await mermaid.render(`diagram-${block.id}`, block.content.mermaid);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [block.id, block.content.mermaid]);

  if (error) {
    return <p className="text-sm text-red-400">Diagram error: {error}</p>;
  }

  return <div ref={containerRef} className="overflow-x-auto" />;
}
