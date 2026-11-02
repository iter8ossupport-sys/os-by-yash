import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileCheck,
  FileText,
  HelpCircle,
  Lightbulb,
  Printer,
  ShieldCheck,
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
  getISOWeekRange,
} from "@/lib/os/reviews/analytics";
import { finalizePeriodReview } from "@/lib/os/reviews/operations";
import {
  exportPeriodToCSV,
  exportPeriodToJSON,
  printReviewReport,
} from "@/lib/os/reviews/exportService";
import type { DayRecord, PeriodReviewRecord, PriorityId } from "@/lib/os/types";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WeeklyReviewViewProps {
  initialDate?: string | undefined;
  onNavigateToDay?: ((date: string) => void) | undefined;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyReviewView({
  initialDate,
  onNavigateToDay,
}: WeeklyReviewViewProps) {
  const { state, update } = useOS();

  // Current reference date for week calculation
  const [refDate, setRefDate] = useState<Date>(
    initialDate ? new Date(initialDate) : new Date(),
  );

  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState("");

  // Determine ISO Week boundaries
  const weekInfo = useMemo(() => getISOWeekRange(refDate), [refDate]);

  // Aggregate period records
  const summary = useMemo(() => {
    return calculatePeriodSummary(
      state.history,
      "weekly",
      weekInfo.id,
      weekInfo.startDate,
      weekInfo.endDate,
    );
  }, [state.history, weekInfo]);

  // Previous week for Week-over-Week (WoW) comparison
  const prevWeekDate = useMemo(() => {
    const d = new Date(refDate);
    d.setDate(d.getDate() - 7);
    return d;
  }, [refDate]);
  const prevWeekInfo = useMemo(
    () => getISOWeekRange(prevWeekDate),
    [prevWeekDate],
  );
  const prevSummary = useMemo(() => {
    return calculatePeriodSummary(
      state.history,
      "weekly",
      prevWeekInfo.id,
      prevWeekInfo.startDate,
      prevWeekInfo.endDate,
    );
  }, [state.history, prevWeekInfo]);

  const wowComparison = useMemo(() => {
    if (!summary || !prevSummary) return null;
    return calculatePeriodComparison(summary, prevSummary);
  }, [summary, prevSummary]);

  // Check if this week was already finalized
  const finalizedRecord = useMemo(() => {
    return (state.periodReviews ?? []).find((r) => r.id === weekInfo.id);
  }, [state.periodReviews, weekInfo.id]);

  // Daily distribution data for Recharts (Monday through Sunday)
  const dailyDistributionData = useMemo(() => {
    const start = new Date(weekInfo.startDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayRec = state.history.find((h) => h.date === iso);

      return {
        dayName: DAYS_OF_WEEK[i],
        date: iso,
        recorded: Boolean(dayRec),
        P1: dayRec
          ? Math.round(((dayRec.actualMin?.[1] ?? 0) / 60) * 10) / 10
          : 0,
        P2: dayRec
          ? Math.round(((dayRec.actualMin?.[2] ?? 0) / 60) * 10) / 10
          : 0,
        P3: dayRec
          ? Math.round(((dayRec.actualMin?.[3] ?? 0) / 60) * 10) / 10
          : 0,
        Total: dayRec
          ? Math.round(
              (((dayRec.actualMin?.[1] ?? 0) +
                (dayRec.actualMin?.[2] ?? 0) +
                (dayRec.actualMin?.[3] ?? 0)) /
                60) *
                10,
            ) / 10
          : 0,
      };
    });
  }, [weekInfo.startDate, state.history]);

  // Week navigation
  const shiftWeek = (delta: number) => {
    setRefDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  };

  // Week Finalization Handler
  const handleFinalizeWeek = () => {
    if (!summary) return;

    const snapshot: PeriodReviewRecord = {
      id: weekInfo.id,
      type: "weekly",
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      daysIncluded: summary.daysIncluded,
      missingDaysCount: summary.missingDaysCount ?? 0,
      totalPlannedHours: summary.totalPlannedHours,
      totalActualHours: summary.totalActualHours,
      hoursByPriority: summary.hoursByPriority,
      plannedHoursByPriority: summary.plannedHoursByPriority,
      tasksPlannedTotal: summary.tasksPlannedTotal,
      tasksDoneTotal: summary.tasksDoneTotal,
      taskCompletionRate: summary.taskCompletionRate,
      p2HoursWorkstreamA: summary.p2HoursWorkstreamA,
      p2HoursWorkstreamB: summary.p2HoursWorkstreamB,
      p2OutputsWorkstreamA: summary.p2OutputsWorkstreamA,
      p2OutputsWorkstreamB: summary.p2OutputsWorkstreamB,
      outcomesPlannedTotal: summary.outcomesPlannedTotal,
      outcomesAchievedTotal: summary.outcomesAchievedTotal,
      outcomesRate: summary.outcomesRate,
      outcomesByPriority: summary.outcomesByPriority,
      executiveSummary: executiveSummary.trim() || "Weekly review approved.",
      keyOutputs: summary.keyOutputs,
      recurringBottlenecks: summary.repeatedUnfinishedTasks.map((t) => t.title),
      learningsSummary: summary.learningsSummary,
      approvedImprovementIds: [],
      finalizedAt: new Date().toISOString(),
    };

    update((s) => finalizePeriodReview(s, snapshot));
    toast.success(`Week ${weekInfo.id} finalized and saved to History.`);
    setFinalizeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Week Selector Bar */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftWeek(-1)}
              aria-label="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftWeek(1)}
              aria-label="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display">
                Week {weekInfo.id}
              </h2>
              <span className="text-xs text-muted-foreground font-normal">
                ({weekInfo.startDate} to {weekInfo.endDate})
              </span>
              {finalizedRecord ? (
                <Badge className="border-success/30 text-success bg-success/10">
                  Finalized Snapshot
                </Badge>
              ) : (
                <Badge className="border-cyan/30 text-cyan bg-cyan/10">
                  Active Period
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {summary.daysIncluded.length} of 7 days recorded ·{" "}
              {summary.missingDaysCount
                ? `${summary.missingDaysCount} unrecorded day(s)`
                : "Full week recorded"}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => exportPeriodToCSV(summary, state.history)}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() =>
              printReviewReport(summary, state.history, state.userName)
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
              <FileCheck className="h-3.5 w-3.5 mr-1" /> Finalize Week
            </Button>
          ) : (
            <Button
              variant="glass"
              size="sm"
              className="text-xs text-success"
              onClick={() => setFinalizeModalOpen(true)}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Review Conclusions
            </Button>
          )}
        </div>
      </Glass>

      {/* KPI Ribbon with Week-over-Week Deltas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Actual Hours */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Invested Time</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-2xl font-bold">
              {summary.totalActualHours}h
            </span>
            {wowComparison && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  wowComparison.totalHoursDelta > 0
                    ? "text-success"
                    : wowComparison.totalHoursDelta < 0
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {wowComparison.totalHoursDelta > 0 ? "+" : ""}
                {wowComparison.totalHoursDelta}h WoW
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Planned: {summary.totalPlannedHours}h (
            {summary.totalActualHours >= summary.totalPlannedHours
              ? "Met commitment"
              : "Under capacity"}
            )
          </div>
        </div>

        {/* Task Completion Rate */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Task Execution Rate</span>
            <CheckCircle2 className="h-4 w-4 text-cyan" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-2xl font-bold">
              {summary.taskCompletionRate}%
            </span>
            {wowComparison && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  wowComparison.taskCompletionRateDelta > 0
                    ? "text-success"
                    : wowComparison.taskCompletionRateDelta < 0
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {wowComparison.taskCompletionRateDelta > 0 ? "+" : ""}
                {wowComparison.taskCompletionRateDelta}% WoW
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.tasksDoneTotal} / {summary.tasksPlannedTotal} tasks
            completed
          </div>
        </div>

        {/* Outcome Delivery Rate */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Outcome Success Rate</span>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-display text-2xl font-bold text-success">
              {summary.outcomesRate}%
            </span>
            {wowComparison && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  wowComparison.outcomesRateDelta > 0
                    ? "text-success"
                    : wowComparison.outcomesRateDelta < 0
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {wowComparison.outcomesRateDelta > 0 ? "+" : ""}
                {wowComparison.outcomesRateDelta}% WoW
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.outcomesAchievedTotal} / {summary.outcomesPlannedTotal} key
            outcomes verified
          </div>
        </div>

        {/* Priority 2 Workstream Split */}
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>P2 Workstream Split</span>
            <Zap className="h-4 w-4 text-violet" />
          </div>
          <div className="font-display text-xl font-bold mt-2">
            {summary.p2HoursWorkstreamA}h / {summary.p2HoursWorkstreamB}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.p2OutputsWorkstreamA} cashflow /{" "}
            {summary.p2OutputsWorkstreamB} product deliverables
          </div>
        </div>
      </div>

      {/* Day by Day Execution Chart (Stacking Priorities & Highlighting Gaps) */}
      <Glass className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold">
              Weekly Execution Cadence · Day-by-Day
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identifies consistent execution rhythm vs unrecorded days
              (Mon–Sun). Click any recorded day to inspect.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-p1" /> #1 Founder
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan" /> #2 Cashflow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet" /> #3 Learning
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyDistributionData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="dayName"
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
                labelFormatter={(
                  label: unknown,
                  payload: readonly { payload?: { date?: string } }[],
                ) => {
                  const date = payload[0]?.payload?.date;
                  return `${label} (${date || ""})`;
                }}
              />
              <Bar
                dataKey="P1"
                name="Priority 1"
                stackId="a"
                fill="var(--p1)"
                radius={[0, 0, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="P2"
                name="Priority 2"
                stackId="a"
                fill="var(--cyan)"
                radius={[0, 0, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="P3"
                name="Priority 3"
                stackId="a"
                fill="var(--violet)"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day Status Badges Footer with Interactive Click-to-Drilldown */}
        <div className="mt-4 grid grid-cols-7 gap-2 border-t border-glass-border pt-3 text-center text-xs">
          {dailyDistributionData.map((d) => (
            <div
              key={d.dayName}
              onClick={() => {
                if (d.recorded && onNavigateToDay) {
                  onNavigateToDay(d.date);
                }
              }}
              className={cn(
                "rounded-xl p-2 transition-all",
                d.recorded
                  ? "bg-secondary/40 border border-glass-border hover:bg-secondary/70 hover:border-cyan/40 cursor-pointer"
                  : "bg-secondary/15 border border-dashed border-glass-border/40 text-muted-foreground/60",
              )}
            >
              <div className="font-semibold">{d.dayName}</div>
              <div className="text-[11px] mt-0.5">
                {d.recorded ? `${d.Total}h` : "Rest / Gap"}
              </div>
            </div>
          ))}
        </div>
      </Glass>

      {/* Priority Drill-Down & Recurring Friction Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Breakdown Table */}
        <Glass className="p-6">
          <h3 className="text-base font-semibold mb-3">
            Priority Allocation & Outcomes
          </h3>
          <div className="space-y-3">
            {state.priorities.map((p) => {
              const actual = summary.hoursByPriority[p.id] ?? 0;
              const planned = summary.plannedHoursByPriority[p.id] ?? 0;
              const outPlanned = summary.outcomesByPriority[p.id]?.planned ?? 0;
              const outAchieved =
                summary.outcomesByPriority[p.id]?.achieved ?? 0;
              const pct =
                summary.totalActualHours > 0
                  ? Math.round((actual / summary.totalActualHours) * 100)
                  : 0;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PriorityIcon id={p.id} className="h-7 w-7" />
                      <div>
                        <div className="font-semibold text-xs">
                          #{p.id} {p.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.project || "No active project"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {actual}h{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          / {planned}h
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {pct}% of weekly effort
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    tone={p.id === 1 ? "p1" : p.id === 2 ? "p2" : "p3"}
                    className="h-1"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      Outcomes delivered: {outAchieved} / {outPlanned}
                    </span>
                    <span className="font-medium text-foreground">
                      {outPlanned > 0
                        ? Math.round((outAchieved / outPlanned) * 100)
                        : 0}
                      % success
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>

        {/* Compounding Friction & Learnings */}
        <Glass className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold mb-2">
              Recurring Execution Friction
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Tasks repeatedly postponed in this week. These represent system
              bottlenecks.
            </p>

            {summary.repeatedUnfinishedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2 opacity-80" />
                Zero recurring unfinished tasks this week!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {summary.repeatedUnfinishedTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary/30 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-warning">
                        #{t.priorityId}
                      </span>
                      <span className="font-medium text-foreground">
                        {t.title}
                      </span>
                    </div>
                    <Badge className="border-warning/30 text-warning bg-warning/10">
                      Postponed {t.count}×
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-glass-border bg-secondary/20 p-4">
            <div className="text-xs font-semibold text-cyan uppercase tracking-wider mb-1">
              Top Operational Learnings ({summary.learningsSummary.length})
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground mt-2 max-h-32 overflow-y-auto pr-1">
              {summary.learningsSummary.slice(0, 3).map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-cyan text-[11px] shrink-0">
                    {l.date}:
                  </span>
                  <span className="text-foreground leading-relaxed">
                    {l.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Glass>
      </div>

      {/* Finalization Modal */}
      {finalizeModalOpen && (
        <Modal
          open
          onClose={() => setFinalizeModalOpen(false)}
          title={`Finalize Weekly Review · Week ${weekInfo.id}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Finalizing creates an immutable historical snapshot of Week{" "}
              {weekInfo.id}. This locks the performance metrics and saves
              executive conclusions into History.
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/30 p-3.5">
              <div>
                <span className="text-muted-foreground">
                  Total Effort Logged
                </span>
                <div className="font-semibold text-sm mt-0.5">
                  {summary.totalActualHours}h
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Task / Outcome Rate
                </span>
                <div className="font-semibold text-sm mt-0.5">
                  {summary.taskCompletionRate}% / {summary.outcomesRate}%
                </div>
              </div>
            </div>

            <div>
              <Label>Executive Summary & Conclusions</Label>
              <Textarea
                rows={4}
                placeholder="Synthesize this week's progress, major wins, and key execution adjustments for next week..."
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setFinalizeModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleFinalizeWeek}>
              <Check className="h-4 w-4" /> Save Finalized Review
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
