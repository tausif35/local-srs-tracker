"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectData } from "@/hooks/useProjectData";
import { BlockRenderer } from "@/components/sections/BlockRenderer";
import type { ContentBlock, DataFileName, ProjectMeta } from "@/lib/types";

export default function SectionsPage() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>();
  const [source, setSource] = useState<DataFileName | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      const res = await fetch(`/api/projects/${id}/data/meta.json`);
      const meta: ProjectMeta = await res.json();
      const page = meta.pages.find((p) => p.id === pageId);
      if (cancelled) return;
      if (!page || page.type !== "sections" || !page.source) {
        setNotFound(true);
        return;
      }
      setSource(page.source);
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [id, pageId]);

  if (notFound) return <p className="text-slate-500">Page not found.</p>;
  if (!source) return <p className="text-slate-500">Loading...</p>;

  return <SectionsBody projectId={id} source={source} />;
}

function SectionsBody({ projectId, source }: { projectId: string; source: DataFileName }) {
  const { data: blocks } = useProjectData<ContentBlock[]>(projectId, source, []);

  return (
    <main>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}
