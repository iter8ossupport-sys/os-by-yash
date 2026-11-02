import { useState } from "react";
import {
  Check,
  ChevronDown,
  Star,
  Target,
  Compass,
  Milestone,
  Flag,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { Metric, PriorityId } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Input,
  Label,
  Modal,
  PriorityIcon,
  Progress,
  Textarea,
  priorityTone,
} from "./ui";

function MetricsEditor({
  metrics,
  onChange,
}: {
  metrics: Metric[];
  onChange: (m: Metric[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Key Metrics & Targets
      </Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="grid grid-cols-3 gap-2 rounded-xl border border-glass-border bg-secondary/50 p-2.5 shadow-sm"
          >
            <div>
              <Label className="mb-1 text-[10px]">Metric</Label>
              <Input
                aria-label="Metric"
                value={m.label}
                onChange={(e) =>
                  onChange(
                    metrics.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="mb-1 text-[10px]">Target</Label>
              <Input
                aria-label="Target"
                placeholder="Target"
                value={m.target}
                onChange={(e) =>
                  onChange(
                    metrics.map((x, j) =>
                      j === i ? { ...x, target: e.target.value } : x,
                    ),
                  )
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="mb-1 text-[10px]">Current</Label>
              <Input
                aria-label="Current"
                placeholder="Current"
                value={m.current}
                onChange={(e) =>
                  onChange(
                    metrics.map((x, j) =>
                      j === i ? { ...x, current: e.target.value } : x,
                    ),
                  )
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalLevelSection({
  icon: Icon,
  badge,
  title,
  sub,
  children,
  defaultOpen,
}: {
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  title: string;
  sub: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="relative rounded-2xl border border-glass-border bg-secondary/30 p-5 shadow-sm transition hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-start gap-3.5 text-left transition"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-secondary/60 text-cyan">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold leading-tight">
                {title}
              </h3>
              {badge}
            </div>
            {/* Clear spacing between heading and description */}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {sub}
            </p>
          </div>
          <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-glass-border pt-5 animate-in fade-in slide-in-from-top-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function GoalsPanel() {
  const { state, update, goalsOpen, setGoalsOpen } = useOS();
  const g = state.goals;
  const setG = (fn: (x: typeof g) => typeof g) =>
    update((s) => ({ ...s, goals: fn(s.goals) }));

  return (
    <Modal
      open={goalsOpen}
      onClose={() => setGoalsOpen(false)}
      title="Goals & Milestones"
      wide
    >
      <div className="mb-6 rounded-2xl border border-glass-border bg-secondary/20 p-4 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">
          Hierarchy Principle:{" "}
        </span>
        North Star sets direction → Level A sets the multi-month trajectory →
        Level B defines the immediate operational window → Level C links each
        permanent priority to a concrete milestone.
      </div>

      <div className="space-y-5">
        {/* NORTH STAR */}
        <GoalLevelSection
          icon={Star}
          title="North Star"
          sub={state.foundation.northStar}
          badge={
            <Badge className="border-cyan/30 text-cyan">Guiding Ambition</Badge>
          }
          defaultOpen
        >
          <div className="rounded-xl border border-glass-border bg-background/50 p-4 text-sm leading-relaxed">
            <div className="font-medium text-foreground">
              {state.foundation.northStarLong}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Trajectory: {state.foundation.trajectory}
            </div>
          </div>
        </GoalLevelSection>

        {/* LEVEL A — Multi-Month Goal */}
        <GoalLevelSection
          icon={Compass}
          title={`Level A — ${g.periodMonths}-Month Goal`}
          sub={g.levelA.text}
          badge={
            g.levelA.approved ? (
              <Badge className="border-success/30 text-success">Approved</Badge>
            ) : (
              <Badge className="border-warning/30 text-warning">Proposed</Badge>
            )
          }
          defaultOpen
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border bg-background/40 p-3">
              <div className="flex items-center gap-3">
                <Label className="mb-0 text-xs font-medium">Goal Period:</Label>
                <span className="font-semibold text-xs text-foreground">
                  {g.periodMonths} months
                </span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={g.periodMonths}
                  onChange={(e) =>
                    setG((x) => ({ ...x, periodMonths: +e.target.value }))
                  }
                  className="w-36"
                  aria-label="Goal period"
                />
              </div>
              <Button
                variant={g.levelA.approved ? "success" : "primary"}
                size="sm"
                onClick={() =>
                  setG((x) => ({
                    ...x,
                    levelA: { ...x.levelA, approved: !x.levelA.approved },
                  }))
                }
              >
                <Check className="h-3.5 w-3.5" />
                {g.levelA.approved
                  ? "Approved — click to reopen"
                  : "Approve Level A"}
              </Button>
            </div>

            <div>
              <Label>Goal Statement</Label>
              <Textarea
                rows={2}
                value={g.levelA.text}
                onChange={(e) =>
                  setG((x) => ({
                    ...x,
                    levelA: {
                      ...x.levelA,
                      text: e.target.value,
                      approved: false,
                    },
                  }))
                }
              />
            </div>

            <MetricsEditor
              metrics={g.levelA.metrics}
              onChange={(m) =>
                setG((x) => ({
                  ...x,
                  levelA: { ...x.levelA, metrics: m, approved: false },
                }))
              }
            />
          </div>
        </GoalLevelSection>

        {/* LEVEL B — Nearest Milestone */}
        <GoalLevelSection
          icon={Milestone}
          title={`Level B — Nearest Milestone (${g.levelB.days} Days)`}
          sub={g.levelB.text}
          badge={
            g.levelB.approved ? (
              <Badge className="border-success/30 text-success">Approved</Badge>
            ) : (
              <Badge className="border-warning/30 text-warning">Proposed</Badge>
            )
          }
          defaultOpen
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border bg-background/40 p-3">
              <div className="flex items-center gap-3">
                <Label className="mb-0 text-xs font-medium">
                  Execution Window:
                </Label>
                <span className="font-semibold text-xs text-foreground">
                  {g.levelB.days} days
                </span>
                <input
                  type="range"
                  min={14}
                  max={90}
                  value={g.levelB.days}
                  onChange={(e) =>
                    setG((x) => ({
                      ...x,
                      levelB: { ...x.levelB, days: +e.target.value },
                    }))
                  }
                  className="w-36"
                  aria-label="Milestone window"
                />
              </div>
              <Button
                variant={g.levelB.approved ? "success" : "primary"}
                size="sm"
                onClick={() =>
                  setG((x) => ({
                    ...x,
                    levelB: { ...x.levelB, approved: !x.levelB.approved },
                  }))
                }
              >
                <Check className="h-3.5 w-3.5" />
                {g.levelB.approved
                  ? "Approved — click to reopen"
                  : "Approve Level B"}
              </Button>
            </div>

            <div>
              <Label>Milestone Description</Label>
              <Textarea
                rows={2}
                value={g.levelB.text}
                onChange={(e) =>
                  setG((x) => ({
                    ...x,
                    levelB: {
                      ...x.levelB,
                      text: e.target.value,
                      approved: false,
                    },
                  }))
                }
              />
            </div>

            <MetricsEditor
              metrics={g.levelB.metrics}
              onChange={(m) =>
                setG((x) => ({
                  ...x,
                  levelB: { ...x.levelB, metrics: m, approved: false },
                }))
              }
            />
          </div>
        </GoalLevelSection>

        {/* LEVEL C — Priority Milestones */}
        <GoalLevelSection
          icon={Flag}
          title="Level C — Priority Milestones"
          sub="Concrete milestone targets and evidence for each of the three permanent priorities."
          badge={<Badge className="border-glass-border">3 Priorities</Badge>}
          defaultOpen
        >
          <div className="grid gap-4 md:grid-cols-3">
            {state.priorities.map((p) => {
              const c = g.levelC[p.id as PriorityId];
              const setC = (patch: Partial<typeof c>) =>
                setG((x) => ({
                  ...x,
                  levelC: { ...x.levelC, [p.id]: { ...c, ...patch } },
                }));

              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col justify-between space-y-3 rounded-2xl border border-glass-border bg-secondary/40 p-4 shadow-sm",
                    p.id === 1
                      ? "border-t-2 border-t-p1"
                      : p.id === 2
                        ? "border-t-2 border-t-p2"
                        : "border-t-2 border-t-p3",
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <PriorityIcon id={p.id} className="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Priority {p.id}
                        </div>
                        <div className="text-sm font-semibold truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-cyan truncate">
                          {p.project || "No project"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-1 text-[11px]">
                        Milestone Target
                      </Label>
                      <Textarea
                        rows={2}
                        value={c.target}
                        onChange={(e) => setC({ target: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <Label className="mb-1 text-[11px]">
                        Target Deadline
                      </Label>
                      <Input
                        type="date"
                        value={c.deadline}
                        onChange={(e) => setC({ deadline: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="mb-1 text-[11px]">
                        Current Evidence
                      </Label>
                      <Input
                        value={c.evidence}
                        placeholder="What evidence proves progress?"
                        onChange={(e) => setC({ evidence: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-glass-border pt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Self-assessed progress
                      </span>
                      <span className="font-semibold">{c.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={c.progress}
                      onChange={(e) => setC({ progress: +e.target.value })}
                      className="w-full"
                      aria-label="Progress"
                    />
                    <Progress value={c.progress} tone={priorityTone(p.id)} />
                    <div className="text-[11px] text-muted-foreground truncate">
                      Bottleneck: {p.bottleneck || "None specified"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GoalLevelSection>
      </div>
    </Modal>
  );
}
