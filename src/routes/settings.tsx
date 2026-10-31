import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { initialState } from "@/lib/os/seed";
import type { DayType, Priority, Theme } from "@/lib/os/types";
import { setActiveProject, saveProject } from "@/lib/os/logic";
import { Button, Glass, Input, Label, PageHeader, PriorityIcon, Segmented, Select, Textarea } from "@/components/os/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Yash OS" },
      { name: "description", content: "Foundation, goals, operating context, appearance and data." },
      { property: "og:title", content: "Settings — Yash OS" },
      { property: "og:description", content: "Configure your Founder Operating System." },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Glass className="p-6"><h2 className="mb-5 text-lg font-semibold">{title}</h2><div className="space-y-4">{children}</div></Glass>;
}

function SettingsPage() {
  const { state, update, setGoalsOpen } = useOS();
  const f = state.foundation;
  const setF = (patch: Partial<typeof f>) => update((s) => ({ ...s, foundation: { ...s.foundation, ...patch } }));
  const setP = (id: number, patch: Partial<Priority>) => update((s) => ({ ...s, priorities: s.priorities.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const setPrefs = (patch: Partial<typeof state.prefs>) => update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yash-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importData = (file: File) => file.text().then((t) => { update(() => ({ ...initialState, ...JSON.parse(t) })); toast.success("Backup restored"); }).catch(() => toast.error("Invalid backup file"));

  return (
    <div>
      <PageHeader eyebrow="System" title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Foundation">
          <div><Label>Your name</Label><Input value={state.userName} onChange={(e) => update((s) => ({ ...s, userName: e.target.value }))} /></div>
          <div><Label>North Star</Label><Input value={f.northStar} onChange={(e) => setF({ northStar: e.target.value })} /></div>
          <div><Label>North Star (full)</Label><Textarea rows={2} value={f.northStarLong} onChange={(e) => setF({ northStarLong: e.target.value })} /></div>
          <div><Label>Mission</Label><Textarea rows={2} value={f.mission} onChange={(e) => setF({ mission: e.target.value })} /></div>
          <div><Label>Founder trajectory</Label><Input value={f.trajectory} onChange={(e) => setF({ trajectory: e.target.value })} /></div>
          <div><Label>Four strategic phases</Label>
            <div className="grid gap-2 sm:grid-cols-2">{f.phases.map((ph, i) => <Input key={i} value={ph} onChange={(e) => setF({ phases: f.phases.map((x, j) => (j === i ? e.target.value : x)) })} />)}</div>
          </div>
        </Section>

        <Section title="Three permanent priorities">
          {state.priorities.map((p) => {
            const priorityProjects = state.projects.filter((x) => x.priorityId === p.id);
            const activeProject = state.projects.find((x) => x.id === p.activeProjectId);
            return (
              <div key={p.id} className="space-y-3 rounded-2xl bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PriorityIcon id={p.id} className="h-8 w-8" />
                    <b className="text-sm">#{p.id} {p.name}</b>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.status}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Active project</Label>
                    <Select
                      value={p.activeProjectId ?? ""}
                      onChange={(v) => update((s) => setActiveProject(s, p.id, v || null))}
                      options={[
                        { value: "", label: "None (no active project)" },
                        ...priorityProjects.map((x) => ({ value: x.id, label: x.name })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Current milestone</Label>
                    <Input
                      value={p.milestone}
                      placeholder="e.g. Next tangible deliverable"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProject) {
                          update((s) => saveProject(s, { ...activeProject, milestone: val }));
                        } else {
                          setP(p.id, { milestone: val });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Main bottleneck</Label>
                    <Input
                      value={p.bottleneck}
                      placeholder="e.g. Current execution blocker"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProject) {
                          update((s) => saveProject(s, { ...activeProject, bottlenecks: val }));
                        } else {
                          setP(p.id, { bottleneck: val });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Assigned project count</Label>
                    <div className="flex h-10 items-center rounded-xl border border-input bg-secondary/30 px-3 text-xs text-muted-foreground">
                      {priorityProjects.length} project(s) assigned
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        <Section title="Goals">
          <p className="text-sm text-muted-foreground">Level A: {state.goals.levelA.approved ? "Approved" : "Proposed"} · Level B: {state.goals.levelB.approved ? "Approved" : "Proposed"} · Level C: 3 priority milestones</p>
          <Button variant="primary" onClick={() => setGoalsOpen(true)}>Edit Goals & Milestones</Button>
        </Section>

        <Section title="Personal operating context">
          <Label>Default usable hours per day type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(state.prefs.dayTypeHours) as DayType[]).map((d) => (
              <div key={d}><Label>{d}</Label><Input type="number" min={0} max={16} step={0.5} value={state.prefs.dayTypeHours[d]} onChange={(e) => setPrefs({ dayTypeHours: { ...state.prefs.dayTypeHours, [d]: +e.target.value } })} /></div>
            ))}
          </div>
          <div><Label>Constraints</Label><Textarea value={state.prefs.constraints} onChange={(e) => setPrefs({ constraints: e.target.value })} /></div>
        </Section>

        <Section title="Appearance & preferences">
          <div><Label>Theme</Label><Segmented value={state.theme} options={["dark", "light", "system"] as const} onChange={(v: Theme) => update((s) => ({ ...s, theme: v }))} /></div>
          <label className="flex items-center justify-between text-sm">Show execution timer<input type="checkbox" className="h-4 w-4 accent-primary" checked={state.prefs.timer} onChange={(e) => setPrefs({ timer: e.target.checked })} /></label>
          <label className="flex items-center justify-between text-sm">Notifications<input type="checkbox" className="h-4 w-4 accent-primary" checked={state.prefs.notifications} onChange={(e) => setPrefs({ notifications: e.target.checked })} /></label>
        </Section>

        <Section title="Data & AI">
          <p className="text-sm text-muted-foreground">Data is stored in this browser. AI provider and cloud sync can be connected in a future phase.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportData}><Download className="h-4 w-4" />Export backup</Button>
            <label className="inline-flex"><input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} /><span className="glass inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4" />Import backup</span></label>
            <Button variant="danger" onClick={() => { if (confirm("Reset all Yash OS data?")) { update(() => initialState); toast("Data reset"); } }}><RotateCcw className="h-4 w-4" />Reset data</Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
