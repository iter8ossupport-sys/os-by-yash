import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  FolderGit2,
  Info,
  Layers,
  Lightbulb,
  PieChart as PieIcon,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOS, fmtMin } from "@/lib/os/store";
import {
  calculateDaySummary,
  calculatePeriodSummary,
  calculateProjectPerformance,
  calculateImprovementStats,
  getMonthRange,
} from "@/lib/os/reviews/analytics";
import type { DayRecord, PriorityId } from "@/lib/os/types";
import { Badge, Button, Glass, PriorityIcon, Progress } from "@/components/os/ui";
import { cn } from "@/lib/utils";

export type AnalyticalSubView = "execution" | "outcomes" | "priorities" | "projects" | "improvements";

interface AnalyticsHubViewProps {
  initialSubView?: AnalyticalSubView | undefined;
  onNavigateToTab?: ((tab: string, date?: string) => void) | undefined;
}

const SUB_VIEWS: { id: AnalyticalSubView; label: string; icon: typeof Activity }[] = [
  { id: "execution", label: "Execution Analytics", icon: Activity },
  { id: "outcomes", label: "Outcomes & Yield", icon: Target },
  { id: "priorities", label: "Priorities & P2 A/B", icon: Layers },
  { id: "projects", label: "Project Performance", icon: FolderGit2 },
  { id: "improvements", label: "Improvement Velocity", icon: Sparkles },
];

type RangeWindow = "7" | "14" | "30" | "month" | "all";

export function AnalyticsHubView({
  initialSubView = "execution",
  onNavigateToTab,
}: AnalyticsHubViewProps) {
  const { state } = useOS();

  const [subView, setSubView] = useState<AnalyticalSubView>(initialSubView);
  const [rangeWindow, setRangeWindow] = useState<RangeWindow>("14");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filter history records based on range window
  const filteredRecords = useMemo(() => {
    let list = [...state.history].sort((a, b) => a.date.localeCompare(b.date));
    if (rangeWindow === "all") return list;

    if (rangeWindow === "month") {
      const monthInfo = getMonthRange(new Date());
      return list.filter((r) => r.date >= monthInfo.startDate && r.date <= monthInfo.endDate);
    }

    const days = parseInt(rangeWindow, 10);
    const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    return list.filter((r) => r.date >= cutoff);
  }, [state.history, rangeWindow]);

  // Daily summaries for the active range
  const dailySummaries = useMemo(() => {
    return filteredRecords.map((rec) => ({
      date: rec.date,
      record: rec,
      summary: calculateDaySummary(rec),
    }));
  }, [filteredRecords]);

  // Overall aggregate across the range
  const aggregate = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        totalPlannedHours: 0,
        totalActualHours: 0,
        taskCompletionRate: 0,
        totalTasksPlanned: 0,
        totalTasksDone: 0,
        totalOutcomesAchieved: 0,
        totalOutcomesPlanned: 0,
        outcomesRate: 0,
        outcomeYieldPerHour: 0,
        hoursByPriority: { 1: 0, 2: 0, 3: 0 } as Record<PriorityId, number>,
        p2HoursA: 0,
        p2HoursB: 0,
        zeroOutcomeDays: 0,
      };
    }

    const start = filteredRecords[0]?.date ?? "";
    const end = filteredRecords[filteredRecords.length - 1]?.date ?? "";
    const period = calculatePeriodSummary(filteredRecords, "weekly", "agg", start, end);

    let zeroOutcomeDays = 0;
    dailySummaries.forEach(({ summary }) => {
      if (summary.outcomesAchieved === 0 && summary.totalActualHours > 0) {
        zeroOutcomeDays += 1;
      }
    });

    const outcomeYield =
      period.totalActualHours > 0
        ? Math.round((period.outcomesAchievedTotal / period.totalActualHours) * 100) / 100
        : 0;

    return {
      totalPlannedHours: period.totalPlannedHours,
      totalActualHours: period.totalActualHours,
      taskCompletionRate: period.taskCompletionRate,
      totalTasksPlanned: period.tasksPlannedTotal,
      totalTasksDone: period.tasksDoneTotal,
      totalOutcomesAchieved: period.outcomesAchievedTotal,
      totalOutcomesPlanned: period.outcomesPlannedTotal,
      outcomesRate: period.outcomesRate,
      outcomeYieldPerHour: outcomeYield,
      hoursByPriority: period.hoursByPriority,
      p2HoursA: period.p2HoursWorkstreamA,
      p2HoursB: period.p2HoursWorkstreamB,
      zeroOutcomeDays,
    };
  }, [filteredRecords, dailySummaries]);

  // 1. Execution Trend Data for Charts
  const executionChartData = useMemo(() => {
    return dailySummaries.map(({ date, summary }) => ({
      date: date.slice(5),
      fullDate: date,
      Planned: summary.totalPlannedHours,
      Actual: summary.totalActualHours,
      Realism: Math.round(summary.realismRatio * 100),
      TasksDone: summary.tasksDone,
      TasksPlanned: summary.tasksPlanned,
    }));
  }, [dailySummaries]);

  // 2. Outcomes & Yield Trend Data
  const outcomesChartData = useMemo(() => {
    return dailySummaries.map(({ date, summary }) => {
      const yieldRate =
        summary.totalActualHours > 0
          ? Math.round((summary.outcomesAchieved / summary.totalActualHours) * 10) / 10
          : 0;
      return {
        date: date.slice(5),
        fullDate: date,
        Outcomes: summary.outcomesAchieved,
        Hours: summary.totalActualHours,
        Yield: yieldRate,
      };
    });
  }, [dailySummaries]);

  // 3. Priorities & P2 Workstream Data
  const priorityChartData = useMemo(() => {
    return state.priorities.map((p) => {
      const actual = aggregate.hoursByPriority[p.id] ?? 0;
      const pct =
        aggregate.totalActualHours > 0
          ? Math.round((actual / aggregate.totalActualHours) * 100)
          : 0;
      return {
        name: `#${p.id} ${p.name.split(" ")[0]}`,
        fullName: p.name,
        actualHours: actual,
        percent: pct,
        id: p.id,
      };
    });
  }, [state.priorities, aggregate]);

  // 4. Projects Summaries
  const projectSummaries = useMemo(() => {
    return state.projects.map((proj) => {
      const perf = calculateProjectPerformance(proj.id, filteredRecords);
      return {
        project: proj,
        performance: perf,
      };
    });
  }, [state.projects, filteredRecords]);

  // 5. Improvement Lifecycle Stats
  const improvementStats = useMemo(() => {
    return calculateImprovementStats(state.improvements ?? []);
  }, [state.improvements]);

  return (
    <div className="space-y-6">
      {/* Analytics Sub-Header with Scope Selector */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Sub-view switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SUB_VIEWS.map((sv) => {
            const Icon = sv.icon;
            const active = subView === sv.id;
            return (
              <Button
                key={sv.id}
                variant={active ? "primary" : "ghost"}
                size="sm"
                className={cn("text-xs gap-1.5", active && "glow")}
                onClick={() => setSubView(sv.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {sv.label}
              </Button>
            );
          })}
        </div>

        {/* Date Scope Preset Filter */}
        <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl border border-glass-border">
          <span className="text-[11px] text-muted-foreground px-2 font-medium">Window:</span>
          {(["7", "14", "30", "month", "all"] as RangeWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setRangeWindow(w)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-lg transition-all font-medium",
                rangeWindow === w
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w === "7"
                ? "7d"
                : w === "14"
                ? "14d"
                : w === "30"
                ? "30d"
                : w === "month"
                ? "Month"
                : "All"}
            </button>
          ))}
        </div>
      </Glass>

      {/* VIEW 1: EXECUTION ANALYTICS */}
      {subView === "execution" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Actual Hours
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-foreground">
                {aggregate.totalActualHours}h
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {aggregate.totalPlannedHours}h planned · {filteredRecords.length} recorded days
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Task Completion Rate
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-cyan">
                {aggregate.taskCompletionRate}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {aggregate.totalTasksDone} / {aggregate.totalTasksPlanned} tasks done
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Planning Realism Index
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-foreground">
                {aggregate.totalPlannedHours > 0
                  ? Math.round((aggregate.totalActualHours / aggregate.totalPlannedHours) * 100)
                  : 100}
                %
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Ratio of actual execution vs planned scope
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Daily Consistency
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-violet">
                {filteredRecords.length > 0
                  ? Math.round((aggregate.totalActualHours / filteredRecords.length) * 10) / 10
                  : 0}
                h / day
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Average sustained output per recorded day
              </div>
            </Glass>
          </div>

          {/* Interactive Execution Chart */}
          <Glass className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold">Planned vs. Actual Daily Hours</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualizing execution realism and workload distribution over time
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Planned
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan" /> Actual
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={executionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="execPlannedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="execActualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} unit="h" />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-glass)",
                    }}
                    formatter={(val: any) => [`${val ?? 0}h`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Planned"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#execPlannedGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Actual"
                    stroke="var(--cyan)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#execActualGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </div>
      )}

      {/* VIEW 2: OUTCOMES & YIELD */}
      {subView === "outcomes" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Key Outcome Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Outcomes Delivered
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-foreground">
                {aggregate.totalOutcomesAchieved}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Key priority deliverables completed
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Outcome Delivery Rate
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-primary">
                {aggregate.outcomesRate}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {aggregate.totalOutcomesAchieved} / {aggregate.totalOutcomesPlanned} targets hit
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Outcome Yield Per Hour
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-cyan">
                {aggregate.outcomeYieldPerHour}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Deliverables achieved per hour invested
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Zero-Outcome Days
              </div>
              <div
                className={cn(
                  "font-display text-2xl font-bold mt-1",
                  aggregate.zeroOutcomeDays > 0 ? "text-warning" : "text-success",
                )}
              >
                {aggregate.zeroOutcomeDays}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Days with hours logged but 0 outcomes completed
              </div>
            </Glass>
          </div>

          {/* Outcome Yield Chart */}
          <Glass className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold">Deliverable Outcomes & Yield Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Separating mere busywork from concrete, tangible deliverable outcomes
                </p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-glass)",
                    }}
                  />
                  <Bar dataKey="Outcomes" fill="var(--cyan)" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>
        </div>
      )}

      {/* VIEW 3: PRIORITIES & P2 A/B WORKSTREAMS */}
      {subView === "priorities" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Priority Allocation Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {state.priorities.map((p) => {
              const actual = aggregate.hoursByPriority[p.id] ?? 0;
              const pct =
                aggregate.totalActualHours > 0
                  ? Math.round((actual / aggregate.totalActualHours) * 100)
                  : 0;
              return (
                <Glass key={p.id} className="p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PriorityIcon id={p.id} className="h-5 w-5" />
                      <span className="font-semibold text-sm">#{p.id} {p.name}</span>
                    </div>
                    <Badge className="font-mono text-xs">{pct}%</Badge>
                  </div>

                  <div className="my-4">
                    <div className="font-display text-3xl font-bold text-foreground">{actual}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Milestone: {p.milestone || "General"}
                    </div>
                  </div>

                  <Progress value={pct} className="h-1.5" />
                </Glass>
              );
            })}
          </div>

          {/* Deep Dive: Priority 2 Workstream A vs. Workstream B Isolation */}
          <Glass className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold">Priority 2 Workstream Isolation · Strict A / B Separation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verifying that trading sessions (Workstream A) never cannibalize software development (Workstream B).
                </p>
              </div>
              <Badge className="border-cyan/30 text-cyan bg-cyan/10">No Cross-Contamination</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-cyan">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
                    Workstream A · Cashflow / Trading Execution
                  </span>
                  <span className="font-display text-sm">{aggregate.p2HoursA}h</span>
                </div>
                <Progress
                  value={
                    aggregate.p2HoursA + aggregate.p2HoursB > 0
                      ? Math.round(
                          (aggregate.p2HoursA / (aggregate.p2HoursA + aggregate.p2HoursB)) * 100,
                        )
                      : 0
                  }
                  className="h-2"
                />
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Focus: LBES market sessions, liquidity analysis, execution journal. Generates operating cashflow.
                </p>
              </div>

              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-2 text-primary">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Workstream B · Fintech Product & Engineering
                  </span>
                  <span className="font-display text-sm">{aggregate.p2HoursB}h</span>
                </div>
                <Progress
                  value={
                    aggregate.p2HoursA + aggregate.p2HoursB > 0
                      ? Math.round(
                          (aggregate.p2HoursB / (aggregate.p2HoursA + aggregate.p2HoursB)) * 100,
                        )
                      : 0
                  }
                  className="h-2"
                />
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Focus: Yash OS core engine, automated tools, SaaS products. Generates lasting enterprise equity.
                </p>
              </div>
            </div>
          </Glass>
        </div>
      )}

      {/* VIEW 4: PROJECT PERFORMANCE */}
      {subView === "projects" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectSummaries.map(({ project, performance }) => (
              <Glass
                key={project.id}
                className={cn(
                  "p-5 flex flex-col justify-between cursor-pointer transition-all",
                  selectedProjectId === project.id
                    ? "border-primary bg-primary/10 glow"
                    : "hover:bg-secondary/40",
                )}
                onClick={() =>
                  setSelectedProjectId(selectedProjectId === project.id ? null : project.id)
                }
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm truncate">{project.name}</span>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        project.status === "active"
                          ? "border-primary/30 text-primary bg-primary/10"
                          : "text-muted-foreground",
                      )}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {project.objective || "Project track"}
                  </p>
                </div>

                <div className="space-y-2 border-t border-glass-border pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Invested Time</span>
                    <span className="font-semibold text-foreground font-display">
                      {performance.totalActualHours}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Task Completion</span>
                    <span className="font-semibold text-cyan">
                      {performance.taskCompletionRate}% ({performance.tasksDoneTotal}/{performance.tasksPlannedTotal})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deliverables</span>
                    <span className="font-semibold text-foreground">{performance.outputsCount} outputs</span>
                  </div>
                </div>
              </Glass>
            ))}
          </div>

          {/* Project Outputs Detail Drawer (if project selected) */}
          {selectedProjectId && (
            <Glass className="p-6">
              {(() => {
                const target = projectSummaries.find((p) => p.project.id === selectedProjectId);
                if (!target) return null;
                const { project, performance } = target;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          Project Audit Trail · {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Active across {performance.activeDaysCount} review days (
                          {performance.firstActiveDate || "N/A"} to {performance.lastActiveDate || "N/A"})
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProjectId(null)}
                      >
                        Close
                      </Button>
                    </div>

                    {performance.outputs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4">
                        No recorded deliverables logged for this project in the selected time window.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {performance.outputs.map((out, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-glass-border bg-secondary/30 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px] mb-1">
                              <span>{out.date}</span>
                              {out.workstream && (
                                <Badge className="text-[10px]">Workstream {out.workstream}</Badge>
                              )}
                            </div>
                            <div className="font-semibold text-foreground">{out.title}</div>
                            {out.text && (
                              <p className="text-muted-foreground mt-1 leading-relaxed">{out.text}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Glass>
          )}
        </div>
      )}

      {/* VIEW 5: IMPROVEMENT VELOCITY */}
      {subView === "improvements" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Proposals
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-foreground">
                {improvementStats.total}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {improvementStats.proposed} pending review
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Approved & Active
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-cyan">
                {improvementStats.approved + improvementStats.implemented}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Executing in current cycle
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Evaluated Actions
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-foreground">
                {improvementStats.evaluated}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Tested against actual execution
              </div>
            </Glass>

            <Glass className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Improvement Success Rate
              </div>
              <div className="font-display text-2xl font-bold mt-1 text-success">
                {improvementStats.successRate}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Proposals achieving expected results
              </div>
            </Glass>
          </div>

          <Glass className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Continuous Improvement Closed Loop</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PRE-THINK → ACT → POST-THINK → ANALYZE → IMPROVE → NEXT PLAN
                </p>
              </div>
              {onNavigateToTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateToTab("Improvements")}
                >
                  Manage Pipeline <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-4 text-xs">
              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5">
                <div className="font-semibold text-muted-foreground">1. Proposed</div>
                <div className="font-display text-xl font-bold text-foreground mt-1">
                  {improvementStats.proposed}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bottlenecks and recommendations queued for decision.
                </p>
              </div>

              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5">
                <div className="font-semibold text-muted-foreground">2. Approved</div>
                <div className="font-display text-xl font-bold text-cyan mt-1">
                  {improvementStats.approved}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Action accepted and committed to the plan.
                </p>
              </div>

              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5">
                <div className="font-semibold text-muted-foreground">3. Implemented</div>
                <div className="font-display text-xl font-bold text-primary mt-1">
                  {improvementStats.implemented}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Execution completed, awaiting empirical outcome evaluation.
                </p>
              </div>

              <div className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5">
                <div className="font-semibold text-muted-foreground">4. Evaluated & Promoted</div>
                <div className="font-display text-xl font-bold text-success mt-1">
                  {improvementStats.evaluated}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Verified learnings promoted into Yash OS permanent knowledge.
                </p>
              </div>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
