import { z } from "zod";
import { type DataFileName } from "@/lib/types";

export const pageManifestEntrySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["overview", "requirements-explorer", "task-board", "documents", "health", "sections"]),
  source: z.string().optional(),
  label: z.string().optional(),
});

export const projectMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  pages: z.array(pageManifestEntrySchema),
});

export const requirementSchema = z.object({
  id: z.string().min(1),
  section: z.string(),
  category: z.string(),
  text: z.string().min(1),
  critical: z.boolean().optional(),
  status: z.enum(["not-started", "in-progress", "done"]).optional(),
});
export const requirementsFileSchema = z.array(requirementSchema);

const nonBlankString = z.string().trim().min(1);

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  column: z.enum(["planning", "implementation", "testing", "bugs", "done"]),
  requirementIds: z.array(z.string()).optional(),
  blockedBy: z.array(z.string()).optional(),
  scope: z.string().optional(),
  exclusions: z.array(nonBlankString).optional(),
  architectureRefs: z.array(nonBlankString).optional(),
  acceptanceCriteria: z.array(nonBlankString).optional(),
  verification: z
    .object({
      commands: z.array(nonBlankString).min(1),
      status: z.enum(["pending", "passed", "failed"]),
      evidence: z.string().optional(),
    })
    .optional(),
  unresolvedDecisions: z.array(nonBlankString).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  notes: z.string().optional(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export const tasksFileSchema = z.array(taskSchema);

export const documentEntrySchema = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
  syncedAt: z.string().optional(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export const documentsFileSchema = z.array(documentEntrySchema);

const tableCellSchema = z.object({
  value: z.string(),
  kind: z.enum(["text", "badge", "link", "date", "number"]).optional(),
  href: z.string().optional(),
});

const blockBase = { id: z.string().min(1), title: z.string().optional() };

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("markdown"), content: z.object({ text: z.string() }) }),
  z.object({
    ...blockBase,
    type: z.literal("table"),
    content: z.object({ columns: z.array(z.string()), rows: z.array(z.array(tableCellSchema)) }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("keyvalue"),
    content: z.object({
      dense: z.boolean().optional(),
      items: z.array(z.object({ label: z.string(), value: z.string() })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("stat-grid"),
    content: z.object({
      stats: z.array(
        z.object({ label: z.string(), value: z.string(), sublabel: z.string().optional() })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("list"),
    content: z.object({
      ordered: z.boolean().optional(),
      items: z.array(
        z.object({
          text: z.string(),
          icon: z.string().optional(),
          status: z.enum(["none", "done", "warning", "error"]).optional(),
        })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("timeline"),
    content: z.object({
      entries: z.array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          status: z.enum(["done", "active", "planned", "blocked"]).optional(),
          date: z.string().optional(),
          items: z.array(z.string()).optional(),
          exit: z.string().optional(),
        })
      ),
    }),
  }),
  z.object({ ...blockBase, type: z.literal("diagram"), content: z.object({ mermaid: z.string() }) }),
  z.object({
    ...blockBase,
    type: z.literal("code"),
    content: z.object({ language: z.string(), code: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("comparison"),
    content: z.object({
      cards: z.array(
        z.object({
          title: z.string(),
          attributes: z.array(z.object({ label: z.string(), value: z.string() })),
          recommended: z.boolean().optional(),
        })
      ),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("progress"),
    content: z.object({
      items: z.array(z.object({ label: z.string(), percent: z.number().min(0).max(100) })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("callout"),
    content: z.object({ tone: z.enum(["info", "warning", "danger", "success"]), text: z.string() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("link-list"),
    content: z.object({
      links: z.array(z.object({ label: z.string(), href: z.string(), description: z.string().optional() })),
    }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("quote"),
    content: z.object({ text: z.string(), attribution: z.string().optional() }),
  }),
  z.object({
    ...blockBase,
    type: z.literal("image"),
    content: z.object({ src: z.string(), alt: z.string(), caption: z.string().optional() }),
  }),
]);
export const sectionsFileSchema = z.array(contentBlockSchema);

export function schemaForFile(file: DataFileName) {
  switch (file) {
    case "meta.json":
      return projectMetaSchema;
    case "requirements.json":
      return requirementsFileSchema;
    case "tasks.json":
      return tasksFileSchema;
    case "documents.json":
      return documentsFileSchema;
    default:
      // Any other declared "sections" source (architecture.json, roadmap.json, or a
      // project-specific one like modules.json) uses the generic content-blocks schema.
      return sectionsFileSchema;
  }
}
