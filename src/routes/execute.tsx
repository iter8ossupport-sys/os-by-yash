import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Pause,
  Play,
  Power,
  Target,
  Zap,
  Clock,
  ShieldCheck,
  Activity,
  Award,
  BookMarked,
  BookOpen,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useOS, useNow, fmtMin, fmtTime } from "@/lib/os/store";
import {
  buildDayRecord,
  closeDay,
  elapsed,
  emergencyPause,
  finishTask,
  pauseTask,
  selectedTasks,
  startTask,
} from "@/lib/os/logic";
import type { KnowledgeItem, PriorityId, Task } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Glass,
  Input,
  Label,
  Modal,
  PageHeader,
  PriorityIcon,
  Progress,
  Textarea,
  priorityTone,
} from "@/components/os/ui";
import { KnowledgeViewerModal } from "@/components/os/KnowledgeViewerModal";
import { KnowledgeSelectModal } from "@/components/os/KnowledgeSelectModal";
import { formatBadgeClass, getKnowledgeFormat } from "@/lib/os/knowledge";

type Search = { emergency?: number | undefined; closeout?: number | undefined };
export const Route = createFileRoute("/execute")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const res: Search = {};
    if (s["emergency"]) res.emergency = 1;
    if (s["closeout"]) res.closeout = 1;
    return res;
  },
  head: () => ({
    meta: [
      { title: "Execute — Yash OS" },
      {
        name: "description",
        content:
          "Focused workspace to execute the approved plan and record outputs.",
      },
      { property: "og:title", content: "Execute — Yash OS" },
      {
        property: "og:description",
        content: "Minimal, clear and action-oriented execution.",
      },
    ],
  }),
  component: ExecutePage,
});

function ExecutePage() {
  const { state, update, setGoalsOpen } = useOS();
  const search = Route.useSearch();
  const nav = useNavigate();
  const plan = state.plan;
  const sel = selectedTasks(plan);
  const active = sel.find((t) => t.id === state.activeTaskId);
  const now = useNow(!!active);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<Task | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [closeout, setCloseout] = useState(false);
  const [viewingKnowledge, setViewingKnowledge] = useState<
    KnowledgeItem[] | null
  >(null);
  const [linkingKnowledgeTaskId, setLinkingKnowledgeTaskId] = useState<
    string | null
  >(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [ctxOpen, setCtxOpen] = useState(false);

  useEffect(() => {
    if (!plan) return;
    if (search.emergency) {
      triggerEmergency();
      nav({ to: "/execute", search: {}, replace: true });
    }
    if (search.closeout) {
      setCloseout(true);
      nav({ to: "/execute", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.emergency, search.closeout, !!plan]);

  function triggerEmergency() {
    update((s) => emergencyPause(s));
    setEmergency(true);
  }

  if (!plan) {
    return (
      <div>
        <PageHeader
          eyebrow="Act"
          title="Execute — Focused Workspace"
          subtitle="Minimal, clear and action-oriented."
        />
        <Glass className="p-10 text-center">
          <h2 className="text-xl font-semibold">No approved plan yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Execution loads the plan you approve in the Plan workflow.
          </p>
          <Link to="/plan">
            <Button variant="primary" className="mt-6">
              Plan today
            </Button>
          </Link>
        </Glass>
      </div>
    );
  }

  // The task displayed in the top execution card:
  // User selection has first priority, falling back to active running task, paused task, or first pending task.
  const selectedTask = selectedTaskId
    ? sel.find((t) => t.id === selectedTaskId)
    : null;
  const current =
    selectedTask ??
    active ??
    sel.find((t) => t.id === state.interruptedTaskId && t.status !== "done") ??
    sel.find((t) => t.status === "paused") ??
    sel.find((t) => t.status === "pending") ??
    sel[0];

  const interrupted = sel.find(
    (t) => t.id === state.interruptedTaskId && t.status !== "done",
  );
  const doneCount = sel.filter((t) => t.status === "done").length;
  const g = state.goals;

  const toggleTaskExpanded = (id: string) => {
    setExpandedTaskId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Act"
        title="Execute — Focused Workspace"
        subtitle={`${plan.context.date} · ${doneCount}/${sel.length} tasks done · ${fmtMin(
          sel.reduce((s, t) => s + t.duration, 0),
        )} planned`}
        actions={
          <>
            <Button variant="danger" onClick={triggerEmergency}>
              <Zap className="h-4 w-4" />
              Emergency Switch
            </Button>
            <Button onClick={() => setCloseout(true)}>
              <Power className="h-4 w-4" />
              Daily closeout
            </Button>
          </>
        }
      />

      {/* Strategic Context Bar */}
      <Glass className="p-4">
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setCtxOpen(!ctxOpen)}
          aria-expanded={ctxOpen}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">Level A:</span>{" "}
              {g.periodMonths}-month goal
            </span>
            <span>
              <span className="text-muted-foreground">Level B:</span> Nearest
              milestone ({g.levelB.days}d)
            </span>
            <span>
              <span className="text-muted-foreground">Level C:</span> 3 priority
              milestones
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              ctxOpen && "rotate-180",
            )}
          />
        </button>
        {ctxOpen && (
          <div className="mt-4 grid gap-3 animate-in fade-in md:grid-cols-3">
            <div className="rounded-2xl bg-secondary/40 p-3.5 text-xs leading-relaxed text-foreground/90">
              {g.levelA.text}
            </div>
            <div className="rounded-2xl bg-secondary/40 p-3.5 text-xs leading-relaxed text-foreground/90">
              {g.levelB.text}
            </div>
            <div className="flex flex-col justify-center gap-2.5 rounded-2xl bg-secondary/40 p-3.5 text-xs">
              {state.priorities.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-2 leading-relaxed"
                >
                  <span
                    className={cn(
                      "font-semibold shrink-0",
                      p.id === 1
                        ? "text-p1"
                        : p.id === 2
                          ? "text-cyan"
                          : "text-violet",
                    )}
                  >
                    {p.id}:
                  </span>
                  <span className="text-foreground/90">
                    {g.levelC[p.id].target}
                  </span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="md:col-span-3 md:w-fit"
              onClick={() => setGoalsOpen(true)}
            >
              <Target className="h-3.5 w-3.5" />
              View Goals & Milestones
            </Button>
          </div>
        )}
      </Glass>

      {/* 1. TOP ACTIVE-TASK EXECUTION CARD (Protected Invariant) */}
      {current && (
        <Glass strong className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  #{current.priorityId}{" "}
                  {state.priorities[current.priorityId - 1]?.name}
                </Badge>
                <Badge>
                  {state.priorities[current.priorityId - 1]?.project ||
                    "No active project"}
                </Badge>
                <Badge
                  className={
                    current.status === "active"
                      ? "text-success border-success/30 font-semibold"
                      : current.status === "paused"
                        ? "text-warning border-warning/30"
                        : current.status === "done"
                          ? "text-muted-foreground"
                          : ""
                  }
                >
                  {current.status === "active"
                    ? "In progress"
                    : current.status === "paused"
                      ? "Paused"
                      : current.status === "done"
                        ? "Completed"
                        : "Up next"}
                </Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
                {current.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Today's Outcome:
                </span>{" "}
                {plan.outcomes[current.priorityId]}
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
                  <Label className="mb-1 text-[11px]">Expected output</Label>
                  <div className="text-xs text-foreground/90">
                    {current.expectedOutput}
                  </div>
                </div>
                <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
                  <Label className="mb-1 text-[11px]">Success criteria</Label>
                  <div className="text-xs text-foreground/90">
                    {current.successCriteria}
                  </div>
                </div>
              </div>

              {/* Optional Focused Knowledge Reference (Non-intrusive) */}
              {(() => {
                const activePriority = state.priorities[current.priorityId - 1];
                const activeProjectId = activePriority?.activeProjectId;
                const relevantKnowledge = state.knowledge.filter((k) => {
                  if ((current.knowledgeIds || []).includes(k.id)) return true;
                  if (
                    (
                      plan.outcomeKnowledgeIds?.[current.priorityId] || []
                    ).includes(k.id)
                  )
                    return true;
                  if (activeProjectId && k.projectId === activeProjectId)
                    return true;
                  return false;
                });

                return (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {relevantKnowledge.length > 0 && (
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => setViewingKnowledge(relevantKnowledge)}
                        className="h-8 text-xs border-cyan/40 text-cyan hover:bg-cyan/15 glow"
                        title="View linked principles, methods, and frameworks"
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1" />
                        Reference Knowledge ({relevantKnowledge.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLinkingKnowledgeTaskId(current.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      title="Link principles, methods, or frameworks to this active task"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {relevantKnowledge.length > 0
                        ? "Link More"
                        : "Reference Knowledge"}
                    </Button>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col items-center gap-4">
              {state.prefs.timer && (
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-primary/60 glow">
                  <div className="font-display text-3xl font-semibold tabular-nums">
                    {fmtTime(elapsed(current, now))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {fmtMin(current.duration)}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {current.status === "active" ? (
                  <Button
                    onClick={() => update((s) => pauseTask(s, current.id))}
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={current.status === "done"}
                    onClick={() =>
                      update((s) => ({
                        ...startTask(s, current.id),
                        interruptedTaskId:
                          s.interruptedTaskId === current.id
                            ? null
                            : s.interruptedTaskId,
                      }))
                    }
                  >
                    <Play className="h-4 w-4" />
                    {current.status === "paused" ? "Resume" : "Start"}
                  </Button>
                )}
                <Button variant="success" onClick={() => setFinishing(current)}>
                  <Check className="h-4 w-4" />
                  Finish
                </Button>
              </div>
            </div>
          </div>
        </Glass>
      )}

      {!current && (
        <Glass className="p-8 text-center">
          <h2 className="text-xl font-semibold">
            All approved tasks are finished.
          </h2>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => setCloseout(true)}
          >
            Run daily closeout
          </Button>
        </Glass>
      )}

      {/* 2. REDESIGNED BOTTOM THREE-PRIORITY TASK AREA */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            Approved Daily Execution
          </h3>
          <span className="text-xs text-muted-foreground">
            Click any task to focus it in the execution workspace
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {state.priorities.map((p) => {
            const pTasks = sel.filter((t) => t.priorityId === p.id);
            const pDone = pTasks.filter((t) => t.status === "done").length;
            const pNameLabel =
              p.id === 1
                ? "1 — Founder Capability"
                : p.id === 2
                  ? "2 — Cashflow Infrastructure"
                  : "3 — Learning for Execution";

            return (
              <Glass
                key={p.id}
                className={cn(
                  "flex flex-col p-5 shadow-sm transition",
                  p.id === 1
                    ? "border-t-2 border-t-p1"
                    : p.id === 2
                      ? "border-t-2 border-t-p2"
                      : "border-t-2 border-t-p3",
                )}
              >
                {/* Priority Header */}
                <div className="mb-3 flex items-start gap-3">
                  <PriorityIcon id={p.id} className="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm font-semibold truncate">
                      {pNameLabel}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Project:{" "}
                      <span className="font-medium text-foreground/80">
                        {p.project || "No active project"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {pDone}/{pTasks.length}
                  </span>
                </div>

                {/* Today's approved outcome displayed prominently in one concise line */}
                <div className="mb-4 rounded-xl border border-glass-border bg-background/50 p-2.5 text-xs">
                  <div className="font-semibold text-cyan">
                    Today's Approved Outcome:
                  </div>
                  <div className="mt-0.5 text-foreground/90 leading-snug line-clamp-2">
                    {plan.outcomes[p.id] || "No outcome specified."}
                  </div>
                </div>

                <Progress
                  value={pTasks.length ? (pDone / pTasks.length) * 100 : 0}
                  tone={priorityTone(p.id)}
                  className="mb-4"
                />

                {/* Tasks in their approved execution order */}
                <div className="space-y-2 flex-1">
                  {pTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-glass-border p-4 text-center text-xs text-muted-foreground">
                      No tasks selected for this priority.
                    </div>
                  ) : (
                    pTasks.map((t) => {
                      const globalOrder =
                        sel.findIndex((x) => x.id === t.id) + 1;
                      const isSelected = t.id === current?.id;
                      const isExpanded = expandedTaskId === t.id;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className={cn(
                            "cursor-pointer rounded-xl border transition-all duration-200 p-3",
                            isSelected
                              ? "border-primary/60 bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                              : "border-glass-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50",
                            t.status === "done" && "opacity-75",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Execution Order Number */}
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary/80 text-[11px] font-semibold text-muted-foreground">
                              {globalOrder}
                            </span>

                            {/* Task Title & Meta */}
                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  "text-xs font-medium leading-snug truncate",
                                  t.status === "done" &&
                                    "line-through text-muted-foreground",
                                )}
                              >
                                {t.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {fmtMin(t.duration)}
                                </span>
                                {t.elapsedMs > 0 && (
                                  <span>
                                    · actual{" "}
                                    {fmtMin(
                                      Math.round(elapsed(t, now) / 60000),
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5">
                              {t.status === "active" && (
                                <Badge className="text-success border-success/30 font-semibold text-[10px]">
                                  Active
                                </Badge>
                              )}
                              {t.status === "paused" && (
                                <Badge className="text-warning border-warning/30 text-[10px]">
                                  Paused
                                </Badge>
                              )}
                              {t.status === "done" && (
                                <Badge className="text-muted-foreground text-[10px]">
                                  Done
                                </Badge>
                              )}

                              {/* Separate Obvious Disclosure Arrow */}
                              <button
                                type="button"
                                aria-label="Toggle task details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskExpanded(t.id);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition"
                              >
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 transition-transform duration-200",
                                    isExpanded && "rotate-180",
                                  )}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Task Details (7 Required Information Fields) */}
                          {isExpanded && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3.5 border-t border-glass-border/70 pt-3.5 space-y-2.5 text-xs animate-in fade-in cursor-default"
                            >
                              {/* 1. Objective */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-cyan mb-1">
                                  1. Objective
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.what || t.title}
                                </div>
                              </div>

                              {/* 2. Planned Duration */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  2. Planned Duration
                                </div>
                                <div className="text-xs font-medium text-foreground leading-relaxed break-words">
                                  {fmtMin(t.duration)}
                                </div>
                              </div>

                              {/* 3. What to do */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  3. What to do
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.what || t.title}
                                </div>
                              </div>

                              {/* 4. How to do it */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  4. How to do it
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.how ||
                                    "Execute in focused block following standard operating procedure."}
                                </div>
                              </div>

                              {/* 5. Where */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  5. Where
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.where || "Workspace"}
                                </div>
                              </div>

                              {/* 6. Expected Output */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  6. Expected Output
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.expectedOutput ||
                                    "Task completed with documented result."}
                                </div>
                              </div>

                              {/* 7. Success Criteria */}
                              <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1">
                                  7. Success Criteria
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {t.successCriteria ||
                                    "All stated output criteria met and verified."}
                                </div>
                              </div>

                              {/* Recorded Output (If Present) */}
                              {t.output && Object.keys(t.output).length > 0 && (
                                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-success">
                                  <div className="font-semibold text-[11px] mb-1">
                                    Recorded Output:
                                  </div>
                                  <div className="text-xs leading-relaxed break-words">
                                    {Object.entries(t.output)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(" · ")}
                                  </div>
                                </div>
                              )}

                              {/* Linked Knowledge for this task */}
                              {t.knowledgeIds && t.knowledgeIds.length > 0 && (
                                <div className="rounded-xl border border-glass-border/60 bg-background/50 p-3">
                                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground/90 mb-1.5 flex items-center justify-between">
                                    <span>Linked Knowledge</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-[10px] text-cyan hover:bg-cyan/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const items = state.knowledge.filter(
                                          (k) =>
                                            (t.knowledgeIds || []).includes(
                                              k.id,
                                            ),
                                        );
                                        setViewingKnowledge(items);
                                      }}
                                    >
                                      <BookOpen className="h-3 w-3 mr-1" /> View
                                      Full
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {state.knowledge
                                      .filter((k) =>
                                        (t.knowledgeIds || []).includes(k.id),
                                      )
                                      .map((k) => (
                                        <span
                                          key={k.id}
                                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${formatBadgeClass(
                                            getKnowledgeFormat(k),
                                          )}`}
                                        >
                                          {k.title}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Start/Resume and Finish Controls clearly separated at the bottom */}
                              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-glass-border/60 pt-3">
                                <div>
                                  {t.status !== "done" &&
                                    (t.status === "active" ? (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          update((s) => pauseTask(s, t.id));
                                        }}
                                      >
                                        <Pause className="h-3.5 w-3.5" />
                                        Pause Task
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          update((s) => ({
                                            ...startTask(s, t.id),
                                            interruptedTaskId:
                                              s.interruptedTaskId === t.id
                                                ? null
                                                : s.interruptedTaskId,
                                          }));
                                        }}
                                      >
                                        <Play className="h-3.5 w-3.5" />
                                        {t.status === "paused"
                                          ? "Resume Task"
                                          : "Start Task"}
                                      </Button>
                                    ))}
                                </div>

                                {t.status !== "done" && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFinishing(t);
                                    }}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Finish Task
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Glass>
            );
          })}
        </div>
      </div>

      {/* 4. PRIORITY-SPECIFIC TASK COMPLETION MODAL */}
      <FinishDialog
        task={finishing}
        onClose={() => setFinishing(null)}
        onSave={(out, ach) => {
          update((s) => finishTask(s, finishing!.id, out, ach));
          setFinishing(null);
          toast.success("Output recorded successfully");
        }}
      />

      {/* Emergency Switch Modal (Preserved) */}
      <Modal
        open={emergency}
        onClose={() => setEmergency(false)}
        title="Emergency Switch"
      >
        <p className="text-sm text-muted-foreground">
          {interrupted ? (
            <>
              Paused <b className="text-foreground">{interrupted.title}</b> at{" "}
              {fmtTime(interrupted.elapsedMs)}. Its time and output are
              preserved.
            </>
          ) : (
            "No task was running."
          )}
        </p>
        <div className="mt-4 space-y-2">
          <Label>Remaining approved workload — choose what to switch to</Label>
          {sel
            .filter((t) => t.status !== "done")
            .map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  update((s) => startTask(s, t.id));
                  setEmergency(false);
                  toast(`Switched to: ${t.title}`);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-glass-border bg-secondary/40 p-3 text-left text-sm transition hover:bg-accent"
              >
                <span>
                  #{t.priorityId} {t.title}
                  {t.id === interrupted?.id && (
                    <Badge className="ml-2">Interrupted</Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fmtMin(t.duration)}
                </span>
              </button>
            ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setEmergency(false)}>
            Handle outside the plan
          </Button>
        </div>
      </Modal>

      {/* Closeout Dialog (Preserved) */}
      <CloseoutDialog open={closeout} onClose={() => setCloseout(false)} />

      {/* Knowledge Modals for Focused Reference & Linking */}
      {viewingKnowledge && (
        <KnowledgeViewerModal
          open={!!viewingKnowledge}
          onClose={() => setViewingKnowledge(null)}
          items={viewingKnowledge}
          title="Contextual Knowledge Reference"
        />
      )}

      {linkingKnowledgeTaskId !== null && (
        <KnowledgeSelectModal
          open={linkingKnowledgeTaskId !== null}
          onClose={() => setLinkingKnowledgeTaskId(null)}
          selectedIds={
            state.plan?.tasks.find((t) => t.id === linkingKnowledgeTaskId)
              ?.knowledgeIds || []
          }
          onSelect={(ids) => {
            update((s) => {
              if (!s.plan) return s;
              return {
                ...s,
                plan: {
                  ...s.plan,
                  tasks: s.plan.tasks.map((t) =>
                    t.id === linkingKnowledgeTaskId
                      ? { ...t, knowledgeIds: ids }
                      : t,
                  ),
                },
              };
            });
            toast.success("Knowledge linked to active task");
          }}
          title="Link Knowledge to Active Task"
          subtitle="Associate a method (steps), principle (rule), or framework to guide execution."
        />
      )}
    </div>
  );
}

/**
 * Priority-Specific Task Completion Forms:
 * - Priority 1 (Founder Capability): Output, Metrics, Notes, Context.
 * - Priority 2 (Cashflow Infrastructure): Workstream A (Cashflow/System Research) vs Workstream B (Fintech Product Capability).
 * - Priority 3 (Learning for Execution): Lightweight output + notes.
 */
function FinishDialog({
  task,
  onClose,
  onSave,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (o: Record<string, string>, achieved: boolean) => void;
}) {
  const [o, setO] = useState<Record<string, string>>({});
  const [ach, setAch] = useState(false);
  const [p2Workstream, setP2Workstream] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    setO({});
    setAch(false);
    setP2Workstream(null);
  }, [task?.id]);

  if (!task) return null;

  const priId = task.priorityId;

  const handleSave = () => {
    if (priId === 2 && !p2Workstream) {
      toast.error("Please select a workstream classification (A or B)");
      return;
    }
    const finalOutput: Record<string, string> = { ...o };
    if (priId === 2 && p2Workstream) {
      finalOutput["Workstream"] =
        p2Workstream === "A"
          ? "Cashflow / System Research"
          : "Fintech Product Capability";
    }
    onSave(finalOutput, ach);
  };

  return (
    <Modal open onClose={onClose} title={`Finish Task: ${task.title}`} wide>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge>Priority {priId}</Badge>
          <span className="text-xs text-muted-foreground">
            {priId === 1
              ? "Founder Capability — Product building, validation, sales & execution"
              : priId === 2
                ? "Cashflow Infrastructure — Workstream classification required"
                : "Learning for Execution — Lightweight capture"}
          </span>
        </div>

        {/* PRIORITY 1 — Founder Capability Form */}
        {priId === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Actual Output</Label>
              <Textarea
                rows={2}
                placeholder="What was built, shipped, or delivered?"
                value={o["Actual output"] ?? ""}
                onChange={(e) =>
                  setO({ ...o, "Actual output": e.target.value })
                }
              />
            </div>
            <div>
              <Label>Relevant Metric Values (when applicable)</Label>
              <Input
                placeholder="e.g. 3 conversations, 1 deployment, 5 signups"
                value={o["Metric values"] ?? ""}
                onChange={(e) =>
                  setO({ ...o, "Metric values": e.target.value })
                }
              />
            </div>
            <div>
              <Label>Notes and Observations</Label>
              <Textarea
                rows={2}
                placeholder="Key user feedback, blockers, or evidence gathered..."
                value={o["Notes & observations"] ?? ""}
                onChange={(e) =>
                  setO({ ...o, "Notes & observations": e.target.value })
                }
              />
            </div>
            <div>
              <Label>Optional Context</Label>
              <Input
                placeholder="Additional founder context or reference links..."
                value={o["Context"] ?? ""}
                onChange={(e) => setO({ ...o, Context: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* PRIORITY 2 — Cashflow Infrastructure Form (A/B Workstream Required) */}
        {priId === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-foreground font-semibold">
                Required Workstream Classification:
              </Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setP2Workstream("A");
                    setO({});
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    p2Workstream === "A"
                      ? "border-primary bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                      : "border-glass-border bg-secondary/30 hover:bg-secondary/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan" />
                    <span className="font-semibold text-sm">
                      A — Cashflow / System Research
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Record work involving the existing LBES system, strategy
                    research, simulation context, or financial tracking.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setP2Workstream("B");
                    setO({});
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    p2Workstream === "B"
                      ? "border-primary bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                      : "border-glass-border bg-secondary/30 hover:bg-secondary/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan" />
                    <span className="font-semibold text-sm">
                      B — Fintech Product Capability
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Develop LBES into a useful fintech product that solves real
                    user problems.
                  </p>
                </button>
              </div>
            </div>

            {/* Workstream A Fields */}
            {p2Workstream === "A" && (
              <div className="space-y-3 rounded-2xl border border-glass-border bg-secondary/20 p-4 animate-in fade-in">
                <div className="text-xs font-semibold uppercase tracking-wider text-cyan">
                  Workstream A Details
                </div>
                <div>
                  <Label>System or Strategy Name</Label>
                  <Input
                    placeholder="e.g. LBES Core, Execution Automation, Rule Engine v2"
                    value={o["System / Strategy name"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "System / Strategy name": e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Activity Type</Label>
                  <Input
                    placeholder="e.g. Strategy Research, Rule Definition, Backtesting, Execution Review, Automation"
                    value={o["Activity type"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "Activity type": e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Financial or Simulated Result (when applicable)</Label>
                  <Input
                    placeholder="e.g. +1.8R, Simulated return +2.4%, 100% rule adherence"
                    value={o["Financial / simulated result"] ?? ""}
                    onChange={(e) =>
                      setO({
                        ...o,
                        "Financial / simulated result": e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Relevant Notes and Evidence</Label>
                  <Textarea
                    rows={2}
                    placeholder="Key observations, charts, screenshots, or rule verification notes..."
                    value={o["Notes & evidence"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "Notes & evidence": e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Workstream B Fields */}
            {p2Workstream === "B" && (
              <div className="space-y-3 rounded-2xl border border-glass-border bg-secondary/20 p-4 animate-in fade-in">
                <div className="text-xs font-semibold uppercase tracking-wider text-cyan">
                  Workstream B Details
                </div>
                <div>
                  <Label>Actual Product Output</Label>
                  <Textarea
                    rows={2}
                    placeholder="What product feature or tool was developed/deployed?"
                    value={o["Actual product output"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "Actual product output": e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Feature or Problem Worked On</Label>
                  <Input
                    placeholder="What specific user problem does this address?"
                    value={o["Feature or problem"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "Feature or problem": e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>User Feedback or Validation</Label>
                  <Input
                    placeholder="User reactions, tester feedback, or validation results..."
                    value={o["User feedback / validation"] ?? ""}
                    onChange={(e) =>
                      setO({
                        ...o,
                        "User feedback / validation": e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Notes and Next Learning</Label>
                  <Textarea
                    rows={2}
                    placeholder="Key learnings and next product step..."
                    value={o["Notes & next learning"] ?? ""}
                    onChange={(e) =>
                      setO({ ...o, "Notes & next learning": e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRIORITY 3 — Learning for Execution Form (Lightweight) */}
        {priId === 3 && (
          <div className="space-y-3">
            <div>
              <Label>Actual Output</Label>
              <Textarea
                rows={2}
                placeholder="What fundamental was learned or applied?"
                value={o["Actual output"] ?? ""}
                onChange={(e) =>
                  setO({ ...o, "Actual output": e.target.value })
                }
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                placeholder="Key takeaways and how they will improve future execution..."
                value={o["Notes"] ?? ""}
                onChange={(e) => setO({ ...o, Notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Priority Outcome Checkbox */}
        <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={ach}
              onChange={(e) => setAch(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <span className="font-medium">
              This also achieved the priority's approved daily outcome
            </span>
          </label>
          <p className="mt-1 text-xs text-muted-foreground ml-6.5">
            Task completion and outcome achievement are tracked separately.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={priId === 2 && !p2Workstream}
          onClick={handleSave}
        >
          <Check className="h-4 w-4" />
          Complete task
        </Button>
      </div>
    </Modal>
  );
}

function CloseoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, update } = useOS();
  const [learning, setLearning] = useState("");
  const nav = useNavigate();
  if (!open || !state.plan) return null;
  const rec = buildDayRecord(state.plan, learning);

  return (
    <Modal open onClose={onClose} title="Daily Closeout" wide>
      <div className="grid gap-3 md:grid-cols-3">
        {state.priorities.map((p) => (
          <div key={p.id} className="rounded-2xl bg-secondary/40 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <PriorityIcon id={p.id} className="h-7 w-7" />
              {p.name}
            </div>
            <div>
              Planned {fmtMin(rec.plannedMin[p.id])} · Actual{" "}
              {fmtMin(rec.actualMin[p.id])}
            </div>
            <div
              className={
                rec.outcomesAchieved.includes(p.id)
                  ? "text-success font-medium"
                  : "text-muted-foreground"
              }
            >
              Outcome{" "}
              {rec.outcomesAchieved.includes(p.id)
                ? "achieved"
                : "not marked achieved"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Outputs ({rec.outputs.length})</Label>
          <ul className="space-y-1.5 text-sm">
            {rec.outputs.length ? (
              rec.outputs.map((o, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-foreground/80">
                    #{o.priorityId} {o.title}:
                  </span>
                  {o.workstream && (
                    <span className="rounded bg-cyan/15 px-1.5 py-0.2 text-[10px] font-medium text-cyan">
                      {o.workstream}
                    </span>
                  )}
                  <span className="text-muted-foreground">{o.text}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">No outputs recorded.</li>
            )}
          </ul>
        </div>
        <div>
          <Label>Unfinished ({rec.unfinished.length})</Label>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {rec.unfinished.length ? (
              rec.unfinished.map((u) => <li key={u}>{u}</li>)
            ) : (
              <li>All planned tasks completed!</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-4">
        <Label>Most important learning today</Label>
        <Textarea
          placeholder="What is the single most valuable learning or operational insight from today's execution?"
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Not yet</Button>
        <Button
          variant="primary"
          onClick={() => {
            update((s) => closeDay(s, learning));
            onClose();
            toast.success("Done for today. Saved to Reviews.");
            nav({ to: "/reviews" });
          }}
        >
          <Check className="h-4 w-4" />
          Done for Today
        </Button>
      </div>
    </Modal>
  );
}
