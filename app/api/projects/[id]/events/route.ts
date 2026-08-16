import { NextRequest } from "next/server";
import { findProject } from "@/lib/server/registry";
import { subscribe } from "@/lib/server/watcher";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await findProject(params.id);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const unsubscribe = subscribe(params.id, project.path, (file) => {
        controller.enqueue(encoder.encode(`data: ${file}\n\n`));
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
