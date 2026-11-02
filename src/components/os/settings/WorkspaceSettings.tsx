import { Compass, Target } from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { Priority } from "@/lib/os/types";
import { setActiveProject, saveProject } from "@/lib/os/logic";
import {
  Button,
  Input,
  Label,
  PriorityIcon,
  Select,
  Textarea,
} from "@/components/os/ui";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function WorkspaceSettings() {
  const { state, update, setGoalsOpen } = useOS();

  const f = state.foundation;
  const setF = (patch: Partial<typeof f>) =>
    update((s) => ({ ...s, foundation: { ...s.foundation, ...patch } }));
  const setP = (id: number, patch: Partial<Priority>) =>
    update((s) => ({
      ...s,
      priorities: s.priorities.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }));

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Workspace"
        description="Foundation principles, strategic phases, permanent priorities, and long-term milestones."
        icon={Compass}
      />

      {/* Strategic Foundation */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Operating Foundation
        </h3>

        <div>
          <Label>North Star (Concise Vision)</Label>
          <Input
            value={f.northStar}
            onChange={(e) => setF({ northStar: e.target.value })}
            placeholder="e.g. Build systems that remove human friction."
          />
        </div>

        <div>
          <Label>North Star (Full Vision Narrative)</Label>
          <Textarea
            rows={2}
            value={f.northStarLong}
            onChange={(e) => setF({ northStarLong: e.target.value })}
            placeholder="Full narrative articulating your ultimate long-term ambition."
          />
        </div>

        <div>
          <Label>Mission</Label>
          <Textarea
            rows={2}
            value={f.mission}
            onChange={(e) => setF({ mission: e.target.value })}
            placeholder="Your current operating mission."
          />
        </div>

        <div>
          <Label>Founder Trajectory</Label>
          <Input
            value={f.trajectory}
            onChange={(e) => setF({ trajectory: e.target.value })}
            placeholder="e.g. Operator → Builder → Founder → Infrastructure company ($1T long-term ambition)."
          />
        </div>

        <div>
          <Label>Four Strategic Phases</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {f.phases.map((ph, i) => (
              <Input
                key={i}
                value={ph}
                onChange={(e) =>
                  setF({
                    phases: f.phases.map((x, j) =>
                      j === i ? e.target.value : x,
                    ),
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Long-Term Goals */}
      <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Goals & Milestones</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Level A: {state.goals.levelA.approved ? "Approved" : "Proposed"} ·
              Level B: {state.goals.levelB.approved ? "Approved" : "Proposed"} ·
              Level C: 3 priority milestones
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setGoalsOpen(true)}
            className="shrink-0"
          >
            <Target className="h-4 w-4" />
            Edit Goals & Milestones
          </Button>
        </div>
      </div>

      {/* Three Permanent Priorities */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Three Permanent Priorities
        </h3>

        <div className="space-y-3">
          {state.priorities.map((p) => {
            const priorityProjects = state.projects.filter(
              (x) => x.priorityId === p.id,
            );
            const activeProject = state.projects.find(
              (x) => x.id === p.activeProjectId,
            );

            return (
              <div
                key={p.id}
                className="space-y-3 rounded-2xl bg-secondary/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PriorityIcon id={p.id} className="h-8 w-8" />
                    <b className="text-sm">
                      #{p.id} {p.name}
                    </b>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {p.status}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Active Project</Label>
                    <Select
                      value={p.activeProjectId ?? ""}
                      onChange={(v) =>
                        update((s) => setActiveProject(s, p.id, v || null))
                      }
                      options={[
                        { value: "", label: "None (no active project)" },
                        ...priorityProjects.map((x) => ({
                          value: x.id,
                          label: x.name,
                        })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Current Milestone</Label>
                    <Input
                      value={p.milestone}
                      placeholder="e.g. Next tangible deliverable"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProject) {
                          update((s) =>
                            saveProject(s, {
                              ...activeProject,
                              milestone: val,
                            }),
                          );
                        } else {
                          setP(p.id, { milestone: val });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Main Bottleneck</Label>
                    <Input
                      value={p.bottleneck}
                      placeholder="e.g. Current execution blocker"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeProject) {
                          update((s) =>
                            saveProject(s, {
                              ...activeProject,
                              bottlenecks: val,
                            }),
                          );
                        } else {
                          setP(p.id, { bottleneck: val });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Assigned Project Count</Label>
                    <div className="flex h-10 items-center rounded-xl border border-input bg-secondary/30 px-3 text-xs text-muted-foreground">
                      {priorityProjects.length} project(s) assigned
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
