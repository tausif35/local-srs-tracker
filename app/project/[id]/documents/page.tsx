"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectData } from "@/hooks/useProjectData";
import { useProjectFileEvents } from "@/hooks/useProjectEvents";
import type { DocumentEntry } from "@/lib/types";

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: documents } = useProjectData<DocumentEntry[]>(id, "documents.json", []);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!selected && documents.length > 0) {
      setSelected(documents[0].path);
    }
  }, [documents, selected]);

  async function loadDoc(path: string) {
    const res = await fetch(`/api/projects/${id}/doc/${path}`);
    if (res.ok) {
      const body = await res.json();
      setContent(body.content);
    }
  }

  useEffect(() => {
    if (selected) loadDoc(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, id]);

  useProjectFileEvents(selected ?? "", () => {
    if (selected) loadDoc(selected);
  });

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0">
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li key={doc.path}>
              <button
                onClick={() => setSelected(doc.path)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                  selected === doc.path ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {doc.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <article className="prose prose-invert max-w-none flex-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
