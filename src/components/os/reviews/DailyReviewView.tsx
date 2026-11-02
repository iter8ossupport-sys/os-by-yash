import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookMarked,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  History,
  Info,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOS, fmtMin } from "@/lib/os/store";
import { buildDayRecord } from "@/lib/os/logic";
import { calculateDaySummary } from "@/lib/os/reviews/analytics";
import { correctDayRecord } from "@/lib/os/reviews/operations";
import type {
  DayRecord,
  KnowledgeItem,
  PriorityId,
  Task,
  TaskExecutionSnapshot,
} from "@/lib/os/types";
import { Link } from "@tanstack/react-router";
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
} from "@/components/os/ui";
import { KnowledgeEditorModal } from "@/components/os/KnowledgeEditorModal";
import { today, uid } from "@/lib/os/seed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DailyReviewViewProps {
  initialDate?: string | undefined;
}

export function DailyReviewView({ initialDate }: DailyReviewViewProps) {
  const { state, update } = useOS();

  // Sorted list of all historical records + today's date
  const todayIso = new Date().toISOString().slice(0, 10);
  const historyDates = useMemo(() => {
    const dates = state.history.map((h) => h.date);
    if (!dates.includes(todayIso) && state.plan) {
      dates.unshift(todayIso);
    }
    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  }, [state.history, state.plan, todayIso]);

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || (historyDates[0] ?? todayIso),
  );

  // Active modal states
  const [drillTask, setDrillTask] = useState<TaskExecutionSnapshot | null>(
    null,
  );
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionField, setCorrectionField] = useState<string>("learning");
  const [correctionValue, setCorrectionValue] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState<string>("");

  // Reflection editor states
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [learningDraft, setLearningDraft] = useState("");

  // Determine if viewing today's live plan
  const isTodayLive = selectedDate === todayIso && Boolean(state.plan);

  // Derive the active DayRecord for the selected date
  const activeRecord: DayRecord | null = useMemo(() => {
    if (isTodayLive && state.plan) {
      return buildDayRecord(state.plan, "");
    }
    return state.history.find((h) => h.date === selectedDate) ?? null;
  }, [isTodayLive, state.plan, state.history, selectedDate]);

  // Derived metrics summary
  const summary = useMemo(() => {
    if (!activeRecord) return null;
    return calculateDaySummary(activeRecord);
  }, [activeRecord]);

  // Priority chart data
  const chartData = useMemo(() => {
    if (!summary) return [];
    return state.priorities.map((p) => ({
      name: `#${p.id} ${p.name.split(" ")[0]}`,
      fullName: p.name,
      Planned: Math.round((summary.plannedMinByPriority[p.id] / 60) * 10) / 10,
      Actual: Math.round((summary.actualMinByPriority[p.id] / 60) * 10) / 10,
      PlannedMin: summary.plannedMinByPriority[p.id],
      ActualMin: summary.actualMinByPriority[p.id],
    }));
  }, [summary, state.priorities]);

  // Handle audit correction submission
  const handleApplyCorrection = () => {
    if (!activeRecord || !correctionReason.trim()) {
      toast.error("Please provide a reason for the audit log.");
      return;
    }

    let parsedVal: unknown = correctionValue;
    if (correctionField === "tasksDone" || correctionField === "tasksPlanned") {
      parsedVal = parseInt(correctionValue, 10) || 0;
    }

    update((s) =>
      correctDayRecord(
        s,
        selectedDate,
        correctionField as keyof DayRecord,
        parsedVal,
        correctionReason,
      ),
    );

    toast.success("Correction applied with audit entry.");
    setCorrectionModalOpen(false);
    setCorrectionReason("");
    setCorrectionValue("");
  };

  const handleOpenReflectionEditor = () => {
    setLearningDraft(activeRecord?.learning ?? "");
    setReflectionModalOpen(true);
  };

  const handleSaveReflection = () => {
    if (!activeRecord) return;
    update((s) => {
      if (isTodayLive && s.plan) {
        return {
          ...s,
          plan: { ...s.plan, notes: learningDraft },
        };
      }
      return {
        ...s,
        history: s.history.map((h) =>
          h.date === selectedDate ? { ...h, learning: learningDraft } : h,
        ),
      };
    });
    toast.success("Operational learning updated.");
    setReflectionModalOpen(false);
  };

  const [promotingLearningItem, setPromotingLearningItem] =
    useState<KnowledgeItem | null>(null);

  const handlePromoteDailyLearning = () => {
    if (!activeRecord?.learning?.trim()) return;
    const txt = activeRecord.learning.trim();
    setPromotingLearningItem({
      id: `k-daily-${uid()}`,
      title: `Lesson: ${txt.slice(0, 60)}`,
      type: "Learning",
      knowledgeFormat: "principle",
      formatData: {
        principle: {
          corePrinciple: txt,
          whenToApply: `Applicable to execution after ${selectedDate}`,
        },
        custom: {
          content: txt,
        },
      },
      body: txt,
      tags: `daily-review, ${selectedDate}`,
      createdAt: today(),
      schemaVersion: 1,
    });
  };

  const handleConfirmPromoteLearning = (saved: KnowledgeItem) => {
    update((s) => ({
      ...s,
      knowledge: [saved, ...s.knowledge],
    }));
    toast.success("Learning permanently saved to Yash OS Knowledge registry.");
    setPromotingLearningItem(null);
  };

  const handleSeedTomorrow = () => {
    if (!activeRecord?.unfinished || activeRecord.unfinished.length === 0) {
      toast.info("No unfinished tasks to seed.");
      return;
    }
    const unf = activeRecord.unfinished;
    update((s) => {
      const currentTasks = s.plan?.tasks ?? [];
      const newTasks: Task[] = unf.map((title, i) => ({
        id: `task-seed-${Date.now()}-${i}`,
        priorityId: ((i % 3) + 1) as PriorityId,
        title: title,
        duration: 45,
        timeBlock: "Morning",
        expectedOutput: title,
        successCriteria: "Task completed",
        what: title,
        how: "Standard execution",
        where: "Workspace",
        kind: "simple" as const,
        selected: true,
        status: "pending" as const,
        elapsedMs: 0,
      }));
      if (!s.plan) {
        return s;
      }
      return {
        ...s,
        plan: {
          ...s.plan,
          tasks: [...currentTasks, ...newTasks],
        },
      };
    });
    toast.success(
      `Seeded ${unf.length} unfinished tasks into the active plan.`,
    );
  };

  // Date navigation helpers
  const currentIndex = historyDates.indexOf(selectedDate);
  const canGoNewer = currentIndex > 0;
  const canGoOlder =
    currentIndex >= 0 && currentIndex < historyDates.length - 1;

  if (!activeRecord) {
    return (
      <Glass className="p-10 text-center space-y-4">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto opacity-70" />
        <h2 className="text-xl font-semibold">
          No Review Record for {selectedDate}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Reviews build strictly from real planning and recorded execution.
          Approve a plan in the Plan tab or select another date.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {historyDates.length > 0 && historyDates[0] && (
            <Button
              variant="primary"
              onClick={() => setSelectedDate(historyDates[0]!)}
            >
              View Latest Review ({historyDates[0]})
            </Button>
          )}
        </div>
      </Glass>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Header & Navigator Bar */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canGoOlder}
              onClick={() => setSelectedDate(historyDates[currentIndex + 1]!)}
              aria-label="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canGoNewer}
              onClick={() => setSelectedDate(historyDates[currentIndex - 1]!)}
              aria-label="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display">{selectedDate}</h2>
              {isTodayLive ? (
                <Badge className="border-primary/40 bg-primary/15 text-primary animate-pulse">
                  Live Today · Not Closed
                </Badge>
              ) : activeRecord.state === "corrected" ? (
                <button
                  type="button"
                  onClick={() => setAuditModalOpen(true)}
                  className="outline-none"
                >
                  <Badge className="border-cyan/40 bg-cyan/15 text-cyan cursor-pointer hover:bg-cyan/25">
                    Corrected ({activeRecord.auditHistory?.length ?? 0} edit)
                  </Badge>
                </button>
              ) : (
                <Badge className="border-success/30 text-success bg-success/10">
                  Finalized
                </Badge>
              )}
              {activeRecord.source === "manual" && (
                <Badge className="border-warning/30 text-warning bg-warning/10">
                  Manual Entry
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Day Type: {activeRecord.dayType ?? "Standard"}</span>
              <span>·</span>
              <span>Available: {activeRecord.availableHours ?? 8}h</span>
              <span>·</span>
              <span>Energy: {activeRecord.energy ?? "Medium"}</span>
            </div>
          </div>
        </div>

        {/* Date Selector Dropdown & Actions */}
        <div className="flex items-center gap-2">
          {historyDates.length > 1 && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-xl border border-input bg-secondary/60 px-3 text-xs text-foreground outline-none"
            >
              {historyDates.map((d) => (
                <option key={d} value={d} className="bg-popover">
                  {d} {d === todayIso ? "(Today)" : ""}
                </option>
              ))}
            </select>
          )}

          {!isTodayLive && (
            <Button
              variant="glass"
              size="sm"
              onClick={() => setCorrectionModalOpen(true)}
              className="text-xs"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1" />
              Audit Correction
            </Button>
          )}

          {activeRecord.auditHistory &&
            activeRecord.auditHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuditModalOpen(true)}
                className="text-xs text-cyan"
              >
                <History className="h-3.5 w-3.5 mr-1" />
                Audit Log ({activeRecord.auditHistory.length})
              </Button>
            )}
        </div>
      </Glass>

      {/* KPI Cards: Activity vs Outcome Strictly Separated */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Actual Time Logged */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Actual Execution Time</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display text-2xl font-bold mt-2">
            {summary?.totalActualHours ?? 0}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Planned: {summary?.totalPlannedHours ?? 0}h (
            {summary?.realismCategory === "calibrated"
              ? "Calibrated"
              : summary?.realismCategory === "over_extended"
                ? "Extended"
                : "Under-allocated"}
            )
          </div>
        </div>

        {/* Task Completion */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tasks Completed</span>
            <CheckCircle2 className="h-4 w-4 text-cyan" />
          </div>
          <div className="font-display text-2xl font-bold mt-2">
            {activeRecord.tasksDone} / {activeRecord.tasksPlanned}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Completion rate: {summary?.taskCompletionRate ?? 0}%
          </div>
        </div>

        {/* Outcome Achievement */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Outcomes Achieved</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="font-display text-2xl font-bold mt-2 text-success">
            {activeRecord.outcomesAchieved?.length ?? 0} / 3
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Separated from task completion
          </div>
        </div>

        {/* Priority 2 Workstream Split */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>P2 Workstream A / B</span>
            <Zap className="h-4 w-4 text-violet" />
          </div>
          <div className="font-display text-xl font-bold mt-2">
            {fmtMin(summary?.p2WorkstreamMinutes.workstreamA ?? 0)} /{" "}
            {fmtMin(summary?.p2WorkstreamMinutes.workstreamB ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary?.p2WorkstreamPercent.workstreamA ?? 0}% Cashflow ·{" "}
            {summary?.p2WorkstreamPercent.workstreamB ?? 0}% Product
          </div>
        </div>
      </div>

      {/* Plan vs Actual Bar Chart and Output Summary */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">
                Priority Hours · Plan vs. Actual
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exact minutes logged against daily allocation
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(val: unknown, name?: string | number) => [
                    `${val ?? 0}h`,
                    String(name ?? ""),
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="Planned"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
                <Bar
                  dataKey="Actual"
                  fill="var(--violet)"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Glass>

        {/* Key Outputs & Reflections */}
        <Glass className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold mb-3">
              Key Recorded Outputs
            </h3>
            {activeRecord.outputs && activeRecord.outputs.length > 0 ? (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activeRecord.outputs.map((out, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-glass-border bg-secondary/30 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        #{out.priorityId} {out.title}
                      </span>
                      {out.workstream && (
                        <span className="rounded bg-cyan/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan">
                          Workstream {out.workstream}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {out.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No outputs recorded for this day.
              </p>
            )}
          </div>

          {/* Unfinished Work & Carry Forward */}
          {activeRecord.unfinished && activeRecord.unfinished.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-warning">
                  Unfinished Work ({activeRecord.unfinished.length} tasks)
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {activeRecord.unfinished.join(", ")}
                </div>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={handleSeedTomorrow}
                className="shrink-0 text-xs border-warning/40 text-warning hover:bg-warning/20"
              >
                Seed to Plan
              </Button>
            </div>
          )}

          {/* Operational Learning & Reflections */}
          <div className="rounded-2xl border border-glass-border bg-secondary/20 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-cyan uppercase tracking-wider">
                Operational Learning & Reflection
              </span>
              <div className="flex items-center gap-1">
                {activeRecord.learning?.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePromoteDailyLearning}
                    className="h-6 text-[11px] text-cyan hover:bg-cyan/10"
                    title="Promote this lesson into Yash OS Knowledge base"
                  >
                    <BookMarked className="h-3 w-3 mr-1" /> Save as Knowledge
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenReflectionEditor}
                  className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="h-3 w-3 mr-1" /> Edit
                </Button>
              </div>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {activeRecord.learning ||
                "No reflection logged. Click Edit to record key takeaways."}
            </p>
          </div>
        </Glass>
      </div>

      {/* Task Execution Snapshots (Traceable Source of Truth) */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">
              Task Execution Snapshots
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Source records behind every recorded minute and output
            </p>
          </div>
          <Badge className="text-xs">
            {activeRecord.taskSnapshots?.length ?? activeRecord.tasksPlanned}{" "}
            tasks
          </Badge>
        </div>

        {activeRecord.taskSnapshots && activeRecord.taskSnapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-glass-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Priority</th>
                  <th className="pb-2.5 font-medium">Task</th>
                  <th className="pb-2.5 font-medium">Planned</th>
                  <th className="pb-2.5 font-medium">Actual</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Outcome</th>
                  <th className="pb-2.5 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/40">
                {activeRecord.taskSnapshots.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    <td className="py-2.5 pr-2">
                      <span className="font-semibold text-foreground">
                        #{t.priorityId}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-foreground">
                        {t.title}
                      </div>
                      {t.expectedOutput && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          Target: {t.expectedOutput}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-muted-foreground">
                      {t.durationPlannedMin}m
                    </td>
                    <td className="py-2.5 pr-2 font-mono text-foreground">
                      {t.durationActualMin}m
                    </td>
                    <td className="py-2.5 pr-2">
                      <Badge
                        className={
                          t.status === "done"
                            ? "border-success/30 text-success bg-success/10"
                            : "border-warning/30 text-warning bg-warning/10"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-2">
                      {t.outcomeAchieved ? (
                        <span className="text-success flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3" /> Achieved
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDrillTask(t)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Detailed task snapshots were not captured for this legacy record.
          </div>
        )}
      </Glass>

      {/* Task Drill-Down Modal */}
      {drillTask && (
        <Modal
          open
          onClose={() => setDrillTask(null)}
          title={`Task Record · #${drillTask.priorityId} ${drillTask.title}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">Duration</span>
                <div className="font-semibold text-sm mt-1">
                  {drillTask.durationActualMin}m actual /{" "}
                  {drillTask.durationPlannedMin}m planned
                </div>
              </div>
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">Status & Outcome</span>
                <div className="font-semibold text-sm mt-1 flex items-center gap-2">
                  <span className="capitalize">{drillTask.status}</span>
                  {drillTask.outcomeAchieved && (
                    <Badge className="border-success/30 text-success bg-success/10">
                      Outcome Met
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Expected Output</Label>
              <div className="rounded-xl border border-glass-border bg-secondary/20 p-3 text-muted-foreground">
                {drillTask.expectedOutput || "None defined"}
              </div>
            </div>

            {drillTask.actualOutput &&
              Object.keys(drillTask.actualOutput).length > 0 && (
                <div>
                  <Label>Recorded Deliverables</Label>
                  <div className="rounded-xl border border-glass-border bg-secondary/30 p-3 space-y-1.5">
                    {Object.entries(drillTask.actualOutput).map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {k}:
                        </span>
                        <span className="text-muted-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {drillTask.workstream && (
              <div>
                <Label>Priority 2 Workstream</Label>
                <Badge className="border-cyan/30 text-cyan bg-cyan/10">
                  Workstream {drillTask.workstream}
                </Badge>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={() => setDrillTask(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Audit History Log Modal */}
      {auditModalOpen && (
        <Modal
          open
          onClose={() => setAuditModalOpen(false)}
          title={`Audit History · ${selectedDate}`}
        >
          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              Every historical correction is preserved with an immutable
              tamper-evident log.
            </p>
            {activeRecord.auditHistory &&
            activeRecord.auditHistory.length > 0 ? (
              <div className="space-y-2">
                {activeRecord.auditHistory.map((audit) => (
                  <div
                    key={audit.id}
                    className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                      <span>Field: {audit.field}</span>
                      <span>
                        {new Date(audit.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <span className="text-destructive line-through">
                        {String(audit.oldValue ?? "empty")}
                      </span>
                      <span>→</span>
                      <span className="text-success">
                        {String(audit.newValue ?? "empty")}
                      </span>
                    </div>
                    <div className="text-muted-foreground italic mt-1">
                      Reason: "{audit.reason}"
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No audit records recorded yet.
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setAuditModalOpen(false)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Apply Correction Modal */}
      {correctionModalOpen && (
        <Modal
          open
          onClose={() => setCorrectionModalOpen(false)}
          title={`Apply Audit Correction · ${selectedDate}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Historical records can be adjusted to correct misrecorded
              execution. A reason is mandatory to maintain data integrity.
            </p>

            <div>
              <Label>Field to Correct</Label>
              <select
                value={correctionField}
                onChange={(e) => setCorrectionField(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
              >
                <option value="learning" className="bg-popover">
                  Operational Learning
                </option>
                <option value="tasksDone" className="bg-popover">
                  Tasks Done (Count)
                </option>
                <option value="tasksPlanned" className="bg-popover">
                  Tasks Planned (Count)
                </option>
              </select>
            </div>

            <div>
              <Label>New Value</Label>
              {correctionField === "learning" ? (
                <Textarea
                  rows={3}
                  placeholder="Enter updated operational learning..."
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                />
              ) : (
                <Input
                  type="number"
                  placeholder="Enter corrected numeric count..."
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                />
              )}
            </div>

            <div>
              <Label>Mandatory Reason for Correction</Label>
              <Input
                placeholder="e.g. Correcting omitted learning takeaway after debrief"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApplyCorrection}>
              <Check className="h-4 w-4" /> Save Correction
            </Button>
          </div>
        </Modal>
      )}

      {/* Daily Reflection & Friction Modal */}
      {reflectionModalOpen && (
        <Modal
          open
          onClose={() => setReflectionModalOpen(false)}
          title={`Daily Reflection · ${selectedDate}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Record empirical takeaways, friction points, and lessons learned
              during execution.
            </p>

            {/* Configured Reflection Prompts */}
            <div className="rounded-xl border border-glass-border/60 bg-secondary/20 p-3 space-y-1.5">
              <span className="font-semibold text-foreground text-[11px] block">
                Guiding Prompt Questions:
              </span>
              <ul className="space-y-1 text-muted-foreground list-disc pl-4 text-[11px]">
                {(
                  state.reviewSettings?.reflectionTemplates?.daily ?? [
                    "What concrete output or breakthrough was delivered today?",
                    "Where did execution stall, drift, or face unplanned resistance?",
                    "What operational adjustment will improve tomorrow's plan?",
                  ]
                ).map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>

            <div>
              <Label>Operational Learning & Takeaway</Label>
              <Textarea
                rows={4}
                placeholder="What worked? What friction occurred? What will be done differently next time?"
                value={learningDraft}
                onChange={(e) => setLearningDraft(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setReflectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveReflection}>
              <Check className="h-4 w-4" /> Save Reflection
            </Button>
          </div>
        </Modal>
      )}

      {/* Promotion to Knowledge Modal with Format Classification & Confirmation */}
      {promotingLearningItem && (
        <KnowledgeEditorModal
          open={!!promotingLearningItem}
          onClose={() => setPromotingLearningItem(null)}
          item={promotingLearningItem}
          onSave={handleConfirmPromoteLearning}
          titleOverride="Promote Daily Lesson to Yash OS Knowledge"
          confirmLabel="Confirm & Save to Knowledge"
        />
      )}
    </div>
  );
}
