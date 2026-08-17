"use client";

import { useEffect, useRef, useState } from "react";
import type { DiagramBlock } from "@/lib/types";

export function DiagramBlockView({ block }: { block: DiagramBlock }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "default" });
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
  }, [block.id, block.content.mermaid, visible]);

  if (error) {
    return <p className="text-sm text-rose-600">Diagram error: {error}</p>;
  }

  return (
    <div ref={wrapperRef} className="min-h-24">
      {!visible && <p className="text-sm text-slate-400">Diagram loads when scrolled into view.</p>}
      <div ref={containerRef} className="overflow-x-auto" />
    </div>
  );
}
