import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  Compass,
  Workflow,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { today, uid } from "@/lib/os/seed";
import type {
  KnowledgeFormat,
  KnowledgeItem,
  KnowledgeType,
  PriorityId,
} from "@/lib/os/types";
import {
  KNOWLEDGE_FORMATS,
  formatBadgeClass,
  getKnowledgeFormat,
  getKnowledgePreview,
  matchesKnowledgeQuery,
} from "@/lib/os/knowledge";
import {
  Badge,
  Button,
  Empty,
  Glass,
  Input,
  PageHeader,
  Select,
} from "@/components/os/ui";
import { KnowledgeEditorModal } from "@/components/os/KnowledgeEditorModal";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Yash OS" },
      {
        name: "description",
        content:
          "Notes, research, lessons, principles, methods and frameworks linked to your work.",
      },
      { property: "og:title", content: "Knowledge — Yash OS" },
      {
        property: "og:description",
        content: "Knowledge that's useful during execution.",
      },
    ],
  }),
  component: KnowledgePage,
});

const TYPES: KnowledgeType[] = [
  "Note",
  "Research",
  "Learning",
  "Documentation",
  "Book/Resource",
  "User Feedback",
  "Market Insight",
  "Lesson",
  "Decision",
  "Document",
];

const FORMAT_ICONS: Record<
  KnowledgeFormat,
  React.ComponentType<{ className?: string }>
> = {
  principle: Compass,
  method: Workflow,
  framework: Layers,
  custom: FileText,
};

function KnowledgePage() {
  const { state, update } = useOS();
  const [q, setQ] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [type, setType] = useState("all");
  const [prio, setPrio] = useState("all");
  const [edit, setEdit] = useState<KnowledgeItem | null>(null);

  const items = state.knowledge.filter((k) => {
    const kFmt = getKnowledgeFormat(k);
    if (formatFilter !== "all" && kFmt !== formatFilter) return false;
    if (type !== "all" && k.type !== type) return false;
    if (prio !== "all" && String(k.priorityId) !== prio) return false;
    return matchesKnowledgeQuery(k, q);
  });

  const blank = (): KnowledgeItem => ({
    id: uid(),
    title: "",
    type: "Note",
    knowledgeFormat: "principle",
    body: "",
    tags: "",
    createdAt: today(),
    schemaVersion: 1,
  });

  const handleSave = (saved: KnowledgeItem) => {
    update((s) => ({
      ...s,
      knowledge: s.knowledge.some((k) => k.id === saved.id)
        ? s.knowledge.map((k) => (k.id === saved.id ? saved : k))
        : [saved, ...s.knowledge],
    }));
    toast.success("Knowledge entry saved");
  };

  const handleDelete = (id: string) => {
    update((s) => ({
      ...s,
      knowledge: s.knowledge.filter((k) => k.id !== id),
    }));
    toast.success("Knowledge entry deleted");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Knowledge"
        subtitle="Principles, methods, frameworks, and notes to guide planning and execution."
        actions={
          <Button variant="primary" onClick={() => setEdit(blank())}>
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_190px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles, principles, steps, tags…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Knowledge Format Filter */}
        <Select
          value={formatFilter}
          onChange={setFormatFilter}
          options={[
            { value: "all", label: "All Formats" },
            { value: "principle", label: "Principles" },
            { value: "method", label: "Methods" },
            { value: "framework", label: "Frameworks" },
            { value: "custom", label: "Custom" },
          ]}
        />

        {/* Existing Knowledge Type Filter */}
        <Select
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All Types" },
            ...TYPES.map((t) => ({ value: t, label: t })),
          ]}
        />

        {/* Priority Filter */}
        <Select
          value={prio}
          onChange={setPrio}
          options={[
            { value: "all", label: "All Priorities" },
            ...state.priorities.map((p) => ({
              value: String(p.id),
              label: `#${p.id} ${p.name}`,
            })),
          ]}
        />
      </div>

      {items.length === 0 ? (
        <Empty title="No knowledge entries found">
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query or format filter, or create a new
            entry.
          </p>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((k) => {
            const fmt = getKnowledgeFormat(k);
            const FmtIcon = FORMAT_ICONS[fmt];
            const fmtMeta = KNOWLEDGE_FORMATS.find((f) => f.id === fmt);
            const preview = getKnowledgePreview(k);
            const linkedProject = state.projects.find(
              (p) => p.id === k.projectId,
            );

            return (
              <Glass
                key={k.id}
                className="cursor-pointer p-5 transition hover:-translate-y-1 hover:border-primary/40 flex flex-col justify-between"
                onClick={() => setEdit(k)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Knowledge Format Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${formatBadgeClass(
                        fmt,
                      )}`}
                    >
                      <FmtIcon className="h-3 w-3" />
                      {fmtMeta?.label || fmt}
                    </span>

                    {/* Independent Knowledge Type Badge */}
                    <Badge>{k.type}</Badge>

                    {/* Priority Badge */}
                    {k.priorityId && <Badge>#{k.priorityId}</Badge>}
                  </div>

                  <div className="mt-3 font-semibold text-foreground text-base leading-snug line-clamp-2">
                    {k.title}
                  </div>

                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {preview}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-glass-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="truncate max-w-[200px]">
                    {linkedProject ? linkedProject.name : k.createdAt}
                  </div>
                  {k.tags && (
                    <div className="truncate max-w-[150px] font-mono text-[10px]">
                      #{k.tags}
                    </div>
                  )}
                </div>
              </Glass>
            );
          })}
        </div>
      )}

      {edit && (
        <KnowledgeEditorModal
          open={!!edit}
          onClose={() => setEdit(null)}
          item={edit}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
