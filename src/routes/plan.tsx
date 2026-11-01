import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Flag, AlertTriangle, FolderGit2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useOS, fmtMin } from "@/lib/os/store";
import { approvePlan, setActiveProject } from "@/lib/os/logic";
import { newDraft, recommendOutcomes, recommendTasks } from "@/lib/os/seed";
import type { DayType, Energy, Plan, PriorityId, Task } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Glass, Input, Label, PageHeader, PriorityIcon, Segmented, Textarea, priorityTone } from "@/components/os/ui";
import { DurationInput } from "@/components/os/DurationInput";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — Yash OS" },
      { name: "description", content: "Seven-step workflow to turn daily reality into an approved plan." },
      { property: "og:title", content: "Plan — Yash OS" },
      { property: "og:description", content: "Turn reality into an approved plan." },
    ],
  }),
  component: PlanPage,
});

const STAGES = [
  ["Daily Context", "Understand your day"],
  ["Priority Context", "3 permanent priorities"],
  ["Time Allocation", "Distribute work hours"],
  ["Daily Outcomes", "One outcome per priority"],
  ["Task Recommendations", "3 tasks per priority"],
  ["Planned Workload", "Select & organise tasks"],
  ["Final Approval", "Confirm and save plan"],
] as const;
const DAY_TYPES = ["College Day", "Non-College Day", "Weekend/Holiday", "Custom"] as const;
const ENERGY = ["Low", "Medium", "High"] as const;
const IDS: PriorityId[] = [1, 2, 3];

function PlanPage() {
  const { state, update } = useOS();
  const nav = useNavigate();
  const draft = state.draft;
  const stage = state.draftStage;

  const setDraft = (fn: (d: Plan) => Plan) => update((s) => ({ ...s, draft: s.draft ? fn(s.draft) : s.draft }));
  const setStage = (n: number) => update((s) => ({ ...s, draftStage: n }));
  const setTask = (id: string, patch: Partial<Task>) =>
    setDraft((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  if (!draft) {
    return (
      <div>
        <PageHeader eyebrow="Pre-think" title="Plan — 7 Step Workflow" subtitle="Turn reality into an approved plan." />
        <Glass className="p-8 text-center">
          <h2 className="text-xl font-semibold">{state.plan ? "Today's plan is approved." : "No plan in progress."}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.plan ? "Starting a new plan will replace the approved one once you approve it." : "Start with your daily context."}
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => update((s) => ({ ...s, draft: newDraft({ hours: s.prefs.dayTypeHours["Non-College Day"] }), draftStage: 1 }))}
          >
            <Sparkles className="h-4 w-4" /> Start planning
          </Button>
        </Glass>
      </div>
    );
  }

  const ctx = draft.context;
  const allocated = IDS.reduce((s, i) => s + draft.allocation[i], 0);
  const sel = draft.tasks.filter((t) => t.selected);
  const selMin = sel.reduce((s, t) => s + t.duration, 0);
  const perPriorityOk = IDS.every((i) => {
    const n = sel.filter((t) => t.priorityId === i).length;
    return n >= 1 && n <= 3;
  });

  const canNext =
    stage === 4 ? IDS.every((i) => draft.outcomes[i].trim()) :
    stage === 5 ? draft.tasks.length > 0 :
    stage === 6 ? perPriorityOk : true;

  const next = () => {
    if (stage === 3 && !IDS.some((i) => draft.outcomes[i])) setDraft((d) => ({ ...d, outcomes: recommendOutcomes(state.priorities) }));
    if (stage === 4 && draft.tasks.length === 0) setDraft((d) => ({ ...d, tasks: recommendTasks(state.priorities) }));
    setStage(stage + 1);
  };

  const approve = () => {
    update((s) => approvePlan(s));
    toast.success("Plan approved and saved. Start a task when you're ready.");
    nav({ to: "/execute" });
  };

  // Reordering helpers
  const movePriorityTask = (priorityId: PriorityId, fromIdx: number, toIdx: number) => {
    setDraft((d) => {
      const pTasks = d.tasks.filter((t) => t.priorityId === priorityId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= pTasks.length || toIdx >= pTasks.length) return d;
      const taskA = pTasks[fromIdx];
      const taskB = pTasks[toIdx];
      if (!taskA || !taskB) return d;
      const idxA = d.tasks.indexOf(taskA);
      const idxB = d.tasks.indexOf(taskB);
      const nextTasks = [...d.tasks];
      nextTasks[idxA] = taskB;
      nextTasks[idxB] = taskA;
      return { ...d, tasks: nextTasks };
    });
  };

  const moveSelectedTask = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const selected = d.tasks.filter((t) => t.selected);
      const curIdx = selected.findIndex((t) => t.id === id);
      const targetIdx = curIdx + dir;
      if (curIdx < 0 || targetIdx < 0 || targetIdx >= selected.length) return d;
      const taskA = selected[curIdx];
      const taskB = selected[targetIdx];
      if (!taskA || !taskB) return d;
      const idxA = d.tasks.indexOf(taskA);
      const idxB = d.tasks.indexOf(taskB);
      const nextTasks = [...d.tasks];
      nextTasks[idxA] = taskB;
      nextTasks[idxB] = taskA;
      return { ...d, tasks: nextTasks };
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pre-think"
        title="Plan — 7 Step Workflow"
        subtitle="Turn reality into an approved plan."
        actions={
          <Button variant="ghost" size="sm" onClick={() => update((s) => ({ ...s, draft: null, draftStage: 1 }))}>
            Discard draft
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Glass className="h-fit p-3">
          <ol className="space-y-1">
            {STAGES.map(([t, sub], i) => {
              const n = i + 1;
              return (
                <li key={t}>
                  <button
                    disabled={n > stage}
                    onClick={() => setStage(n)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition",
                      n === stage ? "bg-gradient-primary text-primary-foreground glow" : n < stage ? "hover:bg-accent" : "opacity-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        n === stage ? "border-primary-foreground/50" : "border-glass-border"
                      )}
                    >
                      {n < stage ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{t}</span>
                      <span className={cn("block text-[11px]", n === stage ? "opacity-80" : "text-muted-foreground")}>{sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Glass>

        <Glass className="p-6" key={stage}>
          <div className="fade-up">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{STAGES[stage - 1]?.[0]}</h2>
              <Badge>Step {stage} of 7</Badge>
            </div>

            {/* STEP 1: Daily Context */}
            {stage === 1 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={ctx.date}
                      onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, date: e.target.value } }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Day type</Label>
                  <Segmented
                    value={ctx.dayType}
                    options={DAY_TYPES}
                    onChange={(v: DayType) =>
                      setDraft((d) => ({ ...d, context: { ...d.context, dayType: v, hours: state.prefs.dayTypeHours[v] } }))
                    }
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <Label>Available usable work hours</Label>
                    <span className="text-sm font-semibold">{ctx.hours} hours</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={14}
                    step={0.5}
                    value={ctx.hours}
                    aria-label="Available hours"
                    className="w-full"
                    onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, hours: +e.target.value } }))}
                  />
                </div>
                <div>
                  <Label>Energy level</Label>
                  <Segmented
                    value={ctx.energy}
                    options={ENERGY}
                    onChange={(v: Energy) => setDraft((d) => ({ ...d, context: { ...d.context, energy: v } }))}
                  />
                </div>
                <div>
                  <Label>Fixed commitments (optional)</Label>
                  <Textarea
                    placeholder="e.g. College, meetings, family, travel…"
                    value={ctx.commitments}
                    onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, commitments: e.target.value } }))}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Priority Context (Refined Visual Hierarchy) */}
            {stage === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Review and verify your active projects, milestones, and bottlenecks under the three permanent priorities.
                </p>
                {state.priorities.map((p) => {
                  const eligibleProjects = state.projects.filter((proj) => proj.priorityId === p.id);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-2xl border border-glass-border bg-secondary/40 p-5 shadow-sm transition hover:border-primary/40",
                        p.id === 1 ? "border-l-4 border-l-p1" : p.id === 2 ? "border-l-4 border-l-p2" : "border-l-4 border-l-p3"
                      )}
                    >
                      {/* Priority Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <PriorityIcon id={p.id} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority {p.id}</span>
                              <h3 className="font-display text-base font-semibold">{p.name}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">{p.purpose}</p>
                          </div>
                        </div>
                        <Badge>{p.status}</Badge>
                      </div>

                      {/* Active Project Highlight & Polished Selection Control */}
                      <div className="mt-4 rounded-xl border border-glass-border bg-background/50 p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="h-4 w-4 text-cyan" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Project:</span>
                            <span className="font-medium text-foreground">{p.project || "No active project"}</span>
                          </div>
                          {eligibleProjects.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Label className="mb-0 text-[11px]">Switch project:</Label>
                              <select
                                value={p.activeProjectId || ""}
                                aria-label={`Select active project for ${p.name}`}
                                onChange={(e) => update((s) => setActiveProject(s, p.id, e.target.value || null))}
                                className="h-8 rounded-lg border border-input bg-secondary/80 px-2 text-xs font-medium text-foreground outline-none transition focus:border-ring"
                              >
                                {eligibleProjects.map((proj) => (
                                  <option key={proj.id} value={proj.id} className="bg-popover text-foreground">
                                    {proj.name} ({proj.status})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Visually Separated Milestone and Bottleneck */}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-cyan">
                            <Flag className="h-3.5 w-3.5" />
                            <span>Current Milestone</span>
                          </div>
                          <div className="text-xs text-foreground/90">{p.milestone || "None set"}</div>
                        </div>

                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Main Bottleneck</span>
                          </div>
                          <div className="text-xs text-foreground/90">{p.bottleneck || "No bottleneck specified"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">Manage your portfolio in Projects or edit foundational goals in Settings.</p>
              </div>
            )}

            {/* STEP 3: Time Allocation */}
            {stage === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Available", ctx.hours],
                    ["Allocated", allocated],
                    ["Remaining", +(ctx.hours - allocated).toFixed(1)],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-2xl bg-secondary/40 p-4">
                      <div className={cn("font-display text-2xl font-semibold", l === "Remaining" && v !== undefined && +v < 0 && "text-destructive")}>
                        {v}h
                      </div>
                      <div className="text-xs text-muted-foreground">{l}</div>
                    </div>
                  ))}
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <PriorityIcon id={p.id} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="font-semibold">{draft.allocation[p.id]}h</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={ctx.hours}
                        step={0.5}
                        value={draft.allocation[p.id]}
                        aria-label={`${p.name} hours`}
                        className="w-full"
                        onChange={(e) => setDraft((d) => ({ ...d, allocation: { ...d.allocation, [p.id]: +e.target.value } }))}
                      />
                    </div>
                  </div>
                ))}
                {allocated > ctx.hours && <p className="text-sm text-destructive">You've allocated more than your available hours.</p>}
              </div>
            )}

            {/* STEP 4: Daily Outcomes */}
            {stage === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Proposed from your project context and milestones. Edit before approving.</p>
                  <Button size="sm" onClick={() => setDraft((d) => ({ ...d, outcomes: recommendOutcomes(state.priorities) }))}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id} className="flex gap-4">
                    <PriorityIcon id={p.id} />
                    <div className="flex-1">
                      <Label>
                        #{p.id} {p.name} — {draft.allocation[p.id]}h
                      </Label>
                      <Textarea
                        rows={2}
                        value={draft.outcomes[p.id]}
                        onChange={(e) => setDraft((d) => ({ ...d, outcomes: { ...d.outcomes, [p.id]: e.target.value } }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 5: Task Recommendations */}
            {stage === 5 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Three proposed tasks per priority (template suggestions — AI-ready).</p>
                  <Button size="sm" onClick={() => setDraft((d) => ({ ...d, tasks: recommendTasks(state.priorities) }))}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <PriorityIcon id={p.id} className="h-7 w-7" />#{p.id} {p.name}
                    </div>
                    <div className="space-y-2">
                      {draft.tasks
                        .filter((t) => t.priorityId === p.id)
                        .map((t) => (
                          <TaskCard key={t.id} t={t} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 6: Planned Workload (Priority-Based Clean Layout) */}
            {stage === 6 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Select 1–3 tasks per priority, edit task titles & durations, and arrange execution order.
                  </p>
                  <Badge className={perPriorityOk ? "border-success/30 text-success" : "border-destructive/30 text-destructive"}>
                    {perPriorityOk ? "Selection rules satisfied" : "Select 1–3 tasks per priority"}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {state.priorities.map((p) => {
                    const pTasks = draft.tasks.filter((t) => t.priorityId === p.id);
                    const pSelCount = pTasks.filter((t) => t.selected).length;
                    const pSelMin = pTasks.filter((t) => t.selected).reduce((sum, t) => sum + t.duration, 0);

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-2xl border border-glass-border bg-secondary/30 p-5 shadow-sm",
                          p.id === 1 ? "border-t-2 border-t-p1" : p.id === 2 ? "border-t-2 border-t-p2" : "border-t-2 border-t-p3"
                        )}
                      >
                        {/* 1. Priority number and full priority name */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <PriorityIcon id={p.id} className="h-9 w-9" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-semibold">
                                  #{p.id} {p.name}
                                </span>
                                <Badge className={pSelCount >= 1 && pSelCount <= 3 ? "text-success" : "text-destructive"}>
                                  {pSelCount} of {pTasks.length} selected ({fmtMin(pSelMin)})
                                </Badge>
                              </div>
                              {/* 2 & 3. Active project & milestone */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>
                                  <span className="font-medium text-foreground/80">Project:</span> {p.project || "No active project"}
                                </span>
                                <span>·</span>
                                <span>
                                  <span className="font-medium text-foreground/80">Milestone:</span> {p.milestone || "None set"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4. Today's outcome in one clear, editable line */}
                        <div className="mt-3">
                          <Label className="mb-1 text-[11px]">Today's Outcome</Label>
                          <Input
                            value={draft.outcomes[p.id] || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                outcomes: { ...d.outcomes, [p.id]: e.target.value },
                              }))
                            }
                            aria-label={`Today's outcome for ${p.name}`}
                            placeholder={`Define today's outcome for ${p.name}...`}
                            className="h-9 bg-background/60"
                          />
                        </div>

                        {/* 5. Three numbered task recommendations */}
                        <div className="mt-4 space-y-2">
                          {pTasks.map((t, idx) => (
                            <div
                              key={t.id}
                              className={cn(
                                "flex flex-col gap-2 rounded-xl border border-glass-border p-3 transition sm:flex-row sm:items-center",
                                t.selected ? "bg-secondary/60 shadow-sm ring-1 ring-primary/20" : "bg-secondary/20 opacity-60"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Selection checkbox */}
                                <input
                                  type="checkbox"
                                  checked={t.selected}
                                  aria-label={`Select task: ${t.title}`}
                                  onChange={(e) => setTask(t.id, { selected: e.target.checked })}
                                  className="h-4 w-4 rounded accent-primary"
                                />
                                {/* Task number (1, 2, 3) */}
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/80 text-xs font-semibold text-muted-foreground">
                                  {idx + 1}
                                </span>
                              </div>

                              {/* Editable task title */}
                              <div className="flex-1 min-w-[200px]">
                                <Input
                                  value={t.title}
                                  aria-label={`Task ${idx + 1} title`}
                                  onChange={(e) => setTask(t.id, { title: e.target.value })}
                                  className="h-9"
                                />
                              </div>

                              {/* One simple editable duration/timeline input with automatic unit detection */}
                              <div className="w-full sm:w-48 shrink-0">
                                <DurationInput
                                  value={t.duration}
                                  onChange={(min) => setTask(t.id, { duration: min })}
                                  ariaLabel={`Duration for ${t.title}`}
                                />
                              </div>

                              {/* Ascending / descending ordering controls */}
                              <div className="flex items-center gap-1 self-end sm:self-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Move task up"
                                  disabled={idx === 0}
                                  onClick={() => movePriorityTask(p.id, idx, idx - 1)}
                                  className="h-8 w-8"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Move task down"
                                  disabled={idx === pTasks.length - 1}
                                  onClick={() => movePriorityTask(p.id, idx, idx + 1)}
                                  className="h-8 w-8"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Workload Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-glass-border bg-secondary/40 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-muted-foreground">Total Selected: </span>
                      <span className="font-semibold">{sel.length} tasks</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Planned Workload: </span>
                      <span className="font-semibold text-primary">{fmtMin(selMin)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available Time: </span>
                      <span className="font-semibold">{ctx.hours}h</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining: </span>
                      <span className={cn("font-semibold", selMin > ctx.hours * 60 ? "text-destructive" : "text-success")}>
                        {fmtMin(Math.max(0, ctx.hours * 60 - selMin))}
                      </span>
                    </div>
                  </div>
                  {!perPriorityOk && (
                    <span className="text-xs font-semibold text-destructive">
                      Rule: Each of the 3 priorities requires between 1 and 3 selected tasks.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 7: Final Approval (Clean Hierarchy & Editable Workload) */}
            {stage === 7 && (
              <div className="space-y-6">
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Date", ctx.date],
                    ["Total Tasks", `${sel.length} selected`],
                    ["Planned Duration", fmtMin(selMin)],
                    ["Remaining Time", fmtMin(Math.max(0, ctx.hours * 60 - selMin))],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-2xl border border-glass-border bg-secondary/40 p-4">
                      <div className="font-display text-xl font-semibold text-foreground">{val}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Workload Grouped by Priority
                  </h3>

                  {state.priorities.map((p) => {
                    const pTasks = sel.filter((t) => t.priorityId === p.id);
                    return (
                      <div key={p.id} className="rounded-2xl border border-glass-border bg-secondary/40 p-5">
                        {/* Priority number, name & active project */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <PriorityIcon id={p.id} className="h-8 w-8" />
                            <div>
                              <div className="font-display font-semibold">
                                #{p.id} {p.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Active Project: <span className="font-medium text-foreground">{p.project || "None"}</span>
                              </div>
                            </div>
                          </div>
                          <Badge>{pTasks.length} tasks</Badge>
                        </div>

                        {/* Today's outcome, editable before approval */}
                        <div className="mt-3">
                          <Label className="mb-1 text-[11px]">Today's Outcome (editable before approval)</Label>
                          <Input
                            value={draft.outcomes[p.id]}
                            aria-label={`Outcome for ${p.name}`}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                outcomes: { ...d.outcomes, [p.id]: e.target.value },
                              }))
                            }
                            className="h-9 bg-background/60"
                          />
                        </div>

                        {/* Selected tasks in execution order */}
                        <div className="mt-3 space-y-2">
                          {pTasks.map((t) => {
                            const globalIndex = sel.findIndex((x) => x.id === t.id);
                            return (
                              <div
                                key={t.id}
                                className="flex flex-col gap-2 rounded-xl border border-glass-border bg-background/40 p-3 sm:flex-row sm:items-center"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/80 text-xs font-semibold text-muted-foreground">
                                  {globalIndex + 1}
                                </span>
                                <div className="flex-1 min-w-[200px]">
                                  <Input
                                    value={t.title}
                                    aria-label={`Task title`}
                                    onChange={(e) => setTask(t.id, { title: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="w-full sm:w-44 shrink-0">
                                  <DurationInput
                                    value={t.duration}
                                    onChange={(min) => setTask(t.id, { duration: min })}
                                    ariaLabel={`Duration for ${t.title}`}
                                  />
                                </div>
                                <div className="flex items-center gap-1 self-end sm:self-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Move task up in execution order"
                                    disabled={globalIndex === 0}
                                    onClick={() => moveSelectedTask(t.id, -1)}
                                    className="h-8 w-8"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Move task down in execution order"
                                    disabled={globalIndex === sel.length - 1}
                                    onClick={() => moveSelectedTask(t.id, 1)}
                                    className="h-8 w-8"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Approving saves the plan. It will not start any task automatically.
                </p>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="mt-8 flex justify-between gap-3">
              <Button disabled={stage === 1} onClick={() => setStage(stage - 1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {stage < 7 ? (
                <Button variant="primary" disabled={!canNext} onClick={next}>
                  Next Step <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="primary" onClick={approve}>
                  <Check className="h-4 w-4" />
                  Approve plan
                </Button>
              )}
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

function TaskCard({ t }: { t: Task }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-glass-border bg-secondary/40 p-3">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <div>
          <div className="text-sm font-medium">{t.title}</div>
          <div className="text-xs text-muted-foreground">
            {fmtMin(t.duration)} · Output: {t.expectedOutput}
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 grid gap-2 text-xs animate-in fade-in slide-in-from-top-1 sm:grid-cols-2">
          <div>
            <b>Success criteria:</b> {t.successCriteria}
          </div>
          <div>
            <b>What:</b> {t.what}
          </div>
          <div>
            <b>How:</b> {t.how}
          </div>
          <div>
            <b>Where:</b> {t.where}
          </div>
        </div>
      )}
    </div>
  );
}
