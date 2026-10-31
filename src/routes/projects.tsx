import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { uid, today } from "@/lib/os/seed";
import { saveProject, deleteProject, setActiveProject } from "@/lib/os/logic";
import type { PriorityId, Project, ProjectStatus } from "@/lib/os/types";
import { Badge, Button, DemoTag, Empty, Glass, Input, Label, Modal, PageHeader, PriorityIcon, Segmented, Select, Textarea } from "@/components/os/ui";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Yash OS" },
      { name: "description", content: "Manage projects under your three permanent priorities." },
      { property: "og:title", content: "Projects — Yash OS" },
      { property: "og:description", content: "Projects, milestones, evidence and decisions." },
    ],
  }),
  component: ProjectsPage,
});

const STATUSES = ["active", "paused", "completed", "archived"] as const;
const suggest = (text: string): PriorityId => /cash|revenue|money|trad|lbes|income/i.test(text) ? 2 : /learn|study|course|skill|read/i.test(text) ? 3 : 1;

function ProjectsPage() {
  const { state, update } = useOS();
  const [filter, setFilter] = useState<ProjectStatus>("active");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const list = state.projects.filter((p) => p.status === filter);

  const save = (p: Project) => {
    update((s) => saveProject(s, p));
  };

  const remove = (id: string) => {
    update((s) => deleteProject(s, id));
  };

  const setAsActive = (priorityId: PriorityId, projectId: string | null) => {
    update((s) => setActiveProject(s, priorityId, projectId));
  };

  return (
    <div>
      <PageHeader eyebrow="Portfolio" title="Projects" subtitle="Every project lives under one permanent priority."
        actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New project</Button>} />
      <Segmented value={filter} options={STATUSES} onChange={setFilter} className="mb-6 max-w-md" />
      {list.length === 0 ? <Empty title={`No ${filter} projects`} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const isActive = state.priorities.some((pr) => pr.id === p.priorityId && pr.activeProjectId === p.id);
            return (
              <Glass key={p.id} className="cursor-pointer p-5 transition-all hover:-translate-y-1" onClick={() => setEditing(p)}>
                <div className="flex items-start gap-3">
                  <PriorityIcon id={p.priorityId} />
                  <div className="flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">#{p.priorityId} {state.priorities[p.priorityId - 1]?.name}</div>
                  </div>
                  {p.demo && <DemoTag />}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{p.objective}</p>
                {p.milestone && <div className="mt-3 text-xs"><span className="text-muted-foreground">Milestone:</span> {p.milestone}</div>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="capitalize">{p.status}</Badge>
                  {isActive && <Badge className="border-primary/40 bg-primary/10 text-primary">Active on #{p.priorityId}</Badge>}
                </div>
              </Glass>
            );
          })}
        </div>
      )}
      <CreateDialog open={creating} onClose={() => setCreating(false)} onCreate={(p) => { save(p); setCreating(false); toast.success("Project created"); }} />
      {editing && (
        <EditDialog
          project={editing}
          isActive={state.priorities.some((pr) => pr.id === editing.priorityId && pr.activeProjectId === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(p) => { save(p); setEditing(null); toast.success("Project saved"); }}
          onDelete={() => { remove(editing.id); setEditing(null); toast.success("Project deleted"); }}
          onSetActive={(active) => {
            setAsActive(editing.priorityId, active ? editing.id : null);
            toast.success(active ? `Set as active for Priority #${editing.priorityId}` : `Unset active for Priority #${editing.priorityId}`);
          }}
        />
      )}
    </div>
  );
}

function CreateDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [obj, setObj] = useState("");
  const [pid, setPid] = useState<PriorityId | null>(null);
  const [doc, setDoc] = useState("");
  const suggested = suggest(name + " " + obj);
  const chosen = pid ?? suggested;
  return (
    <Modal open={open} onClose={onClose} title="New project">
      <div className="space-y-4">
        <div><Label>Project name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>What are you trying to achieve?</Label><Textarea value={obj} onChange={(e) => setObj(e.target.value)} /></div>
        <div>
          <Label>Assigned priority {pid === null && (name || obj) && <span className="ml-1 inline-flex items-center gap-1 text-cyan"><Sparkles className="h-3 w-3" />suggested #{suggested} — confirm or change</span>}</Label>
          <Select value={String(chosen)} onChange={(v) => setPid(+v as PriorityId)} options={[{ value: "1", label: "#1 Founder Capability" }, { value: "2", label: "#2 Cashflow Infrastructure" }, { value: "3", label: "#3 Learning for Execution" }]} />
        </div>
        <div><Label>Source document (optional link or file name)</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => { onCreate({ id: uid(), name, objective: obj, priorityId: chosen, status: "active", hypothesis: "", milestone: "", metrics: "", bottlenecks: "", evidence: "", decisions: "", learning: "", documents: doc, createdAt: today() }); setName(""); setObj(""); setPid(null); setDoc(""); }}>Create</Button>
      </div>
    </Modal>
  );
}

const DETAIL: [keyof Project, string][] = [
  ["objective", "Objective"],
  ["hypothesis", "Hypothesis"],
  ["milestone", "Current milestone"],
  ["metrics", "Metrics"],
  ["bottlenecks", "Bottlenecks"],
  ["evidence", "Market evidence / actual outputs"],
  ["decisions", "Decisions"],
  ["learning", "Learning"],
  ["documents", "Supporting documents"],
];

function EditDialog({
  project,
  isActive,
  onClose,
  onSave,
  onDelete,
  onSetActive,
}: {
  project: Project;
  isActive: boolean;
  onClose: () => void;
  onSave: (p: Project) => void;
  onDelete: () => void;
  onSetActive: (active: boolean) => void;
}) {
  const { state } = useOS();
  const [p, setP] = useState(project);
  const history = state.history.flatMap((h) => h.outputs.filter((o) => o.priorityId === p.priorityId).map((o) => ({ ...o, date: h.date })));

  const handleDelete = () => {
    if (confirm(`Delete project "${p.name}"? This removes any active project assignment.`)) {
      onDelete();
    }
  };

  return (
    <Modal open onClose={onClose} title={p.name} wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/30 p-3">
        <div className="flex items-center gap-2 text-xs">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-cyan">
              <Star className="h-4 w-4 fill-cyan text-cyan" />
              Active project for #{p.priorityId} {state.priorities[p.priorityId - 1]?.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Not currently active for #{p.priorityId}</span>
          )}
        </div>
        <Button
          size="sm"
          variant={isActive ? "ghost" : "primary"}
          onClick={() => onSetActive(!isActive)}
        >
          {isActive ? "Unset as active" : <><Check className="h-3.5 w-3.5" /> Set as active project</>}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Name</Label>
          <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
        <div>
          <Label>Assigned priority</Label>
          <Select
            value={String(p.priorityId)}
            onChange={(v) => setP({ ...p, priorityId: +v as PriorityId })}
            options={state.priorities.map((pr) => ({ value: String(pr.id), label: `#${pr.id} ${pr.name}` }))}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={p.status}
            onChange={(v) => setP({ ...p, status: v as ProjectStatus })}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {DETAIL.map(([k, l]) => (
          <div key={k}>
            <Label>{l}</Label>
            <Textarea rows={2} value={String(p[k] ?? "")} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Label>Task output history (from closed days, priority #{p.priorityId})</Label>
        {history.length ? (
          <ul className="space-y-1 text-sm">
            {history.map((h, i) => (
              <li key={i}>{h.date} — {h.title}: <span className="text-muted-foreground">{h.text}</span></li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recorded outputs yet.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-glass-border pt-4">
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" /> Delete project
        </Button>
        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(p)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
