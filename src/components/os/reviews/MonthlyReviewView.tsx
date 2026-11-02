import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  FileCheck,
  Flag,
  Printer,
  ShieldCheck,
  Target,
  TrendingUp,
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
import {
  calculatePeriodComparison,
  calculatePeriodSummary,
  getMonthRange,
} from "@/lib/os/reviews/analytics";
import { finalizePeriodReview } from "@/lib/os/reviews/operations";
import {
  exportPeriodToCSV,
  printReviewReport,
} from "@/lib/os/reviews/exportService";
import type { PeriodReviewRecord, PriorityId } from "@/lib/os/types";
import {
  Badge,
  Button,
  Glass,
  Label,
  Modal,
  PriorityIcon,
  Progress,
  Textarea,
} from "@/components/os/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MonthlyReviewViewProps {
  initialDate?: string | undefined;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthlyReviewView({ initialDate }: MonthlyReviewViewProps) {
  const { state, update, setGoalsOpen } = useOS();

  // Current reference date for month calculation
  const [refDate, setRefDate] = useState<Date>(
    initialDate ? new Date(initialDate) : new Date(),
  );

  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState("");

  // Determine calendar month boundaries
  const monthInfo = useMemo(() => getMonthRange(refDate), [refDate]);

  // Previous month range for comparisons
  const prevMonthDate = useMemo(() => {
    const d = new Date(refDate);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [refDate]);
  const prevMonthInfo = useMemo(
    () => getMonthRange(prevMonthDate),
    [prevMonthDate],
  );

  // Current Month Summary
  const currentSummary = useMemo(() => {
    return calculatePeriodSummary(
      state.history,
      "monthly",
      monthInfo.id,
      monthInfo.startDate,
      monthInfo.endDate,
    );
  }, [state.history, monthInfo]);

  // Previous Month Summary for MoM Delta Comparison
  const prevSummary = useMemo(() => {
    return calculatePeriodSummary(
      state.history,
      "monthly",
      prevMonthInfo.id,
      prevMonthInfo.startDate,
      prevMonthInfo.endDate,
    );
  }, [state.history, prevMonthInfo]);

  // Month-over-Month Comparison Deltas
  const comparison = useMemo(() => {
    return calculatePeriodComparison(currentSummary, prevSummary);
  }, [currentSummary, prevSummary]);

  // Check if finalized
  const finalizedRecord = useMemo(() => {
    return (state.periodReviews ?? []).find((r) => r.id === monthInfo.id);
  }, [state.periodReviews, monthInfo.id]);

  // Navigation
  const shiftMonth = (delta: number) => {
    setRefDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  };

  // Chart data
  const chartData = useMemo(() => {
    return state.priorities.map((p) => ({
      name: `#${p.id} ${p.name.split(" ")[0]}`,
      fullName: p.name,
      Current: currentSummary.hoursByPriority[p.id] ?? 0,
      Previous: prevSummary.hoursByPriority[p.id] ?? 0,
      id: p.id,
    }));
  }, [state.priorities, currentSummary, prevSummary]);

  // Month Finalization Handler
  const handleFinalizeMonth = () => {
    const snapshot: PeriodReviewRecord = {
      id: monthInfo.id,
      type: "monthly",
      startDate: monthInfo.startDate,
      endDate: monthInfo.endDate,
      daysIncluded: currentSummary.daysIncluded,
      missingDaysCount: currentSummary.missingDaysCount ?? 0,
      totalPlannedHours: currentSummary.totalPlannedHours,
      totalActualHours: currentSummary.totalActualHours,
      hoursByPriority: currentSummary.hoursByPriority,
      plannedHoursByPriority: currentSummary.plannedHoursByPriority,
      tasksPlannedTotal: currentSummary.tasksPlannedTotal,
      tasksDoneTotal: currentSummary.tasksDoneTotal,
      taskCompletionRate: currentSummary.taskCompletionRate,
      p2HoursWorkstreamA: currentSummary.p2HoursWorkstreamA,
      p2HoursWorkstreamB: currentSummary.p2HoursWorkstreamB,
      p2OutputsWorkstreamA: currentSummary.p2OutputsWorkstreamA,
      p2OutputsWorkstreamB: currentSummary.p2OutputsWorkstreamB,
      outcomesPlannedTotal: currentSummary.outcomesPlannedTotal,
      outcomesAchievedTotal: currentSummary.outcomesAchievedTotal,
      outcomesRate: currentSummary.outcomesRate,
      outcomesByPriority: currentSummary.outcomesByPriority,
      executiveSummary: executiveSummary.trim() || "Monthly review approved.",
      keyOutputs: currentSummary.keyOutputs,
      recurringBottlenecks: currentSummary.repeatedUnfinishedTasks.map(
        (t) => t.title,
      ),
      learningsSummary: currentSummary.learningsSummary,
      approvedImprovementIds: [],
      levelCProgressSnapshot: {
        1: state.goals.levelC[1].progress,
        2: state.goals.levelC[2].progress,
        3: state.goals.levelC[3].progress,
      },
      finalizedAt: new Date().toISOString(),
    };

    update((s) => finalizePeriodReview(s, snapshot));
    toast.success(`Month ${monthInfo.id} finalized and saved to History.`);
    setFinalizeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftMonth(1)}
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display">
                {MONTH_NAMES[monthInfo.month - 1]} {monthInfo.year}
              </h2>
              <span className="text-xs text-muted-foreground font-normal">
                ({monthInfo.id})
              </span>
              {finalizedRecord ? (
                <Badge className="border-success/30 text-success bg-success/10">
                  Finalized Snapshot
                </Badge>
              ) : (
                <Badge className="border-cyan/30 text-cyan bg-cyan/10">
                  Current Month
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {currentSummary.daysIncluded.length} active execution days
              recorded
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => exportPeriodToCSV(currentSummary, state.history)}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() =>
              printReviewReport(currentSummary, state.history, state.userName)
            }
          >
            <Printer className="h-3.5 w-3.5 mr-1" /> PDF / Print
          </Button>

          {!finalizedRecord ? (
            <Button
              variant="primary"
              size="sm"
              className="text-xs"
              onClick={() => setFinalizeModalOpen(true)}
            >
              <FileCheck className="h-3.5 w-3.5 mr-1" /> Finalize Month
            </Button>
          ) : (
            <Button
              variant="glass"
              size="sm"
              className="text-xs text-success"
              onClick={() => setFinalizeModalOpen(true)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Monthly Conclusions
            </Button>
          )}
        </div>
      </Glass>

      {/* KPI Ribbon with Month-over-Month Deltas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Actual Hours */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Invested Hours</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="font-display text-2xl font-bold mt-2">
            {currentSummary.totalActualHours}h
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {comparison.totalHoursDelta >= 0 ? (
              <span className="text-success flex items-center">
                <ArrowUp className="h-3 w-3" /> +{comparison.totalHoursDelta}h
              </span>
            ) : (
              <span className="text-warning flex items-center">
                <ArrowDown className="h-3 w-3" /> {comparison.totalHoursDelta}h
              </span>
            )}
            <span className="text-muted-foreground">vs previous month</span>
          </div>
        </div>

        {/* Task Completion Rate */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Monthly Task Completion</span>
            <CheckCircle2 className="h-4 w-4 text-cyan" />
          </div>
          <div className="font-display text-2xl font-bold mt-2">
            {currentSummary.taskCompletionRate}%
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {comparison.taskCompletionRateDelta >= 0 ? (
              <span className="text-success flex items-center">
                <ArrowUp className="h-3 w-3" /> +
                {comparison.taskCompletionRateDelta}%
              </span>
            ) : (
              <span className="text-warning flex items-center">
                <ArrowDown className="h-3 w-3" />{" "}
                {comparison.taskCompletionRateDelta}%
              </span>
            )}
            <span className="text-muted-foreground">completion delta</span>
          </div>
        </div>

        {/* Outcome Success Rate */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Outcome Delivery Rate</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="font-display text-2xl font-bold mt-2 text-success">
            {currentSummary.outcomesRate}%
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {comparison.outcomesRateDelta >= 0 ? (
              <span className="text-success flex items-center">
                <ArrowUp className="h-3 w-3" /> +{comparison.outcomesRateDelta}%
              </span>
            ) : (
              <span className="text-warning flex items-center">
                <ArrowDown className="h-3 w-3" /> {comparison.outcomesRateDelta}
                %
              </span>
            )}
            <span className="text-muted-foreground">
              ({currentSummary.outcomesAchievedTotal} outcomes met)
            </span>
          </div>
        </div>

        {/* P2 Workstream Hours */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>P2 A / B Monthly Split</span>
            <Zap className="h-4 w-4 text-violet" />
          </div>
          <div className="font-display text-xl font-bold mt-2">
            {currentSummary.p2HoursWorkstreamA}h /{" "}
            {currentSummary.p2HoursWorkstreamB}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Workstream B delta:{" "}
            {comparison.p2WorkstreamBDeltaHours >= 0 ? "+" : ""}
            {comparison.p2WorkstreamBDeltaHours}h
          </div>
        </div>
      </div>

      {/* Month-over-Month Hours by Priority Chart */}
      <Glass className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">
              Priority Hours · Month-over-Month
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compares investment in {MONTH_NAMES[monthInfo.month - 1]} vs{" "}
              {MONTH_NAMES[prevMonthInfo.month - 1]}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Current Month
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{" "}
              Previous Month
            </span>
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
              <Bar
                dataKey="Current"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
              <Bar
                dataKey="Previous"
                fill="rgba(255, 255, 255, 0.2)"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      {/* Strategic Goals Connection (Level A, Level B, Level C) */}
      <Glass className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              Strategic Goal Alignment & Milestones
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connects monthly execution to long-term founder capability and
              cashflow
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setGoalsOpen(true)}>
            <Target className="h-3.5 w-3.5 mr-1 text-cyan" /> Edit Goals
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {state.priorities.map((p) => {
            const goalC = state.goals.levelC[p.id];
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PriorityIcon id={p.id} className="h-6 w-6" />
                    <span className="font-semibold text-xs">
                      #{p.id} {p.name}
                    </span>
                  </div>
                  <Badge className="text-[11px] font-mono">
                    {goalC.progress}%
                  </Badge>
                </div>
                <div className="text-xs text-foreground font-medium truncate">
                  {p.milestone || "No milestone set"}
                </div>
                <Progress
                  value={goalC.progress}
                  tone={p.id === 1 ? "p1" : p.id === 2 ? "p2" : "p3"}
                  className="h-1.5"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Calibrate Progress:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {goalC.progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={goalC.progress}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    update((s) => ({
                      ...s,
                      goals: {
                        ...s.goals,
                        levelC: {
                          ...s.goals.levelC,
                          [p.id]: {
                            ...s.goals.levelC[p.id],
                            progress: val,
                          },
                        },
                      },
                    }));
                  }}
                  className="w-full h-1 accent-primary cursor-pointer bg-secondary/50 rounded-lg"
                />
                <div className="text-[11px] text-muted-foreground line-clamp-2 pt-1">
                  Target: {goalC.target}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-glass-border bg-secondary/20 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-foreground">
              Level A Goal ({state.goals.periodMonths} Mo):
            </span>{" "}
            <span className="text-muted-foreground">
              {state.goals.levelA.text}
            </span>
          </div>
          <Badge
            className={
              state.goals.levelA.approved
                ? "border-success/30 text-success"
                : "text-muted-foreground"
            }
          >
            {state.goals.levelA.approved ? "Approved" : "Proposed"}
          </Badge>
        </div>
      </Glass>

      {/* Finalization Modal */}
      {finalizeModalOpen && (
        <Modal
          open
          onClose={() => setFinalizeModalOpen(false)}
          title={`Finalize Monthly Review · ${MONTH_NAMES[monthInfo.month - 1]} ${monthInfo.year}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Finalizing locks the monthly performance records and creates an
              immutable snapshot of {monthInfo.id}.
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/30 p-3.5">
              <div>
                <span className="text-muted-foreground">
                  Monthly Actual Hours
                </span>
                <div className="font-semibold text-sm mt-0.5">
                  {currentSummary.totalActualHours}h
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Active Days Logged
                </span>
                <div className="font-semibold text-sm mt-0.5">
                  {currentSummary.daysIncluded.length} days
                </div>
              </div>
            </div>

            <div>
              <Label>Executive Monthly Synthesis</Label>
              <Textarea
                rows={5}
                placeholder="Synthesize strategic trajectory, project completions, milestone advances, and strategic shifts for next month..."
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setFinalizeModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleFinalizeMonth}>
              <Check className="h-4 w-4" /> Save Monthly Snapshot
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
