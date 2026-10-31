import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { today, uid } from "@/lib/os/seed";
import type { KnowledgeItem, KnowledgeType, PriorityId } from "@/lib/os/types";
import { Badge, Button, DemoTag, Empty, Glass, Input, Label, Modal, PageHeader, Select, Textarea } from "@/components/os/ui";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Yash OS" },
      { name: "description", content: "Notes, research, lessons and decisions linked to your work." },
      { property: "og:title", content: "Knowledge — Yash OS" },
      { property: "og:description", content: "Knowledge that's useful during execution." },
    ],
  }),
  component: KnowledgePage,
});

const TYPES: KnowledgeType[] = ["Note", "Research", "Learning", "Documentation", "Book/Resource", "User Feedback", "Market Insight", "Lesson", "Decision", "Document"];

function KnowledgePage() {
  const { state, update } = useOS();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [prio, setPrio] = useState("all");
  const [edit, setEdit] = useState<KnowledgeItem | null>(null);
  const items = state.knowledge.filter((k) =>
    (type === "all" || k.type === type) && (prio === "all" || String(k.priorityId) === prio) &&
    (!q || `${k.title} ${k.body} ${k.tags}`.toLowerCase().includes(q.toLowerCase())));

  const blank = (): KnowledgeItem => ({ id: uid(), title: "", type: "Note", body: "", tags: "", createdAt: today() });

  return (
    <div>
      <PageHeader eyebrow="Memory" title="Knowledge" subtitle="Store it once, use it while executing."
        actions={<Button variant="primary" onClick={() => setEdit(blank())}><Plus className="h-4 w-4" />New entry</Button>} />
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px_220px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search knowledge…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={type} onChange={setType} options={[{ value: "all", label: "All types" }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
        <Select value={prio} onChange={setPrio} options={[{ value: "all", label: "All priorities" }, ...state.priorities.map((p) => ({ value: String(p.id), label: `#${p.id} ${p.name}` }))]} />
      </div>
      {items.length === 0 ? <Empty title="Nothing found" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((k) => (
            <Glass key={k.id} className="cursor-pointer p-5 transition hover:-translate-y-1" onClick={() => setEdit(k)}>
              <div className="flex flex-wrap items-center gap-2"><Badge>{k.type}</Badge>{k.priorityId && <Badge>#{k.priorityId}</Badge>}{k.demo && <DemoTag />}</div>
              <div className="mt-3 font-semibold">{k.title}</div>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{k.body}</p>
              <div className="mt-3 text-xs text-muted-foreground">{k.createdAt}{k.tags && ` · ${k.tags}`}</div>
            </Glass>
          ))}
        </div>
      )}
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.title ? "Edit entry" : "New entry"}>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={edit.type} onChange={(v) => setEdit({ ...edit, type: v as KnowledgeType })} options={TYPES.map((t) => ({ value: t, label: t }))} /></div>
              <div><Label>Priority</Label><Select value={String(edit.priorityId ?? "")} onChange={(v) => setEdit({ ...edit, priorityId: v ? (+v as PriorityId) : undefined })} options={[{ value: "", label: "None" }, ...state.priorities.map((p) => ({ value: String(p.id), label: `#${p.id} ${p.name}` }))]} /></div>
            </div>
            <div><Label>Linked project</Label><Select value={edit.projectId ?? ""} onChange={(v) => setEdit({ ...edit, projectId: v || undefined })} options={[{ value: "", label: "None" }, ...state.projects.map((p) => ({ value: p.id, label: p.name }))]} /></div>
            <div><Label>Content</Label><Textarea rows={6} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></div>
            <div><Label>Tags (task, milestone, keywords)</Label><Input value={edit.tags} onChange={(e) => setEdit({ ...edit, tags: e.target.value })} /></div>
          </div>
          <div className="mt-5 flex justify-between gap-2">
            {state.knowledge.some((k) => k.id === edit.id) ? <Button variant="danger" onClick={() => { update((s) => ({ ...s, knowledge: s.knowledge.filter((k) => k.id !== edit.id) })); setEdit(null); }}><Trash2 className="h-4 w-4" />Delete</Button> : <span />}
            <Button variant="primary" disabled={!edit.title.trim()} onClick={() => {
              const item = { ...edit, demo: false };
              update((s) => ({ ...s, knowledge: s.knowledge.some((k) => k.id === item.id) ? s.knowledge.map((k) => (k.id === item.id ? item : k)) : [item, ...s.knowledge] }));
              setEdit(null); toast.success("Saved");
            }}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
