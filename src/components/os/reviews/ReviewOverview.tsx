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
  Flame,
  FolderGit2,
  Info,
  Layers,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOS, fmtMin } from "@/lib/os/store";
import { buildDayRecord } from "@/lib/os/logic";
import {
  calculateDaySummary,
  calculatePeriodSummary,
  evaluateCustomMetric,
  generatePeriodAlerts,
  getISOWeekRange,
  getMonthRange,
} from "@/lib/os/reviews/analytics";
import type { DayRecord, PriorityId } from "@/lib/os/types";
import { Badge, Button, Glass, PriorityIcon, Progress } from "@/components/os/ui";
import { cn } from "@/lib/utils";

interface ReviewOverviewProps {
  onSelectTab: (tab: string, view?: string) => void;
  onOpenSettings: () => void;
  useDemoData?: boolean;
  onToggleDemoData?: () => void;
}

const PRIORITY_COLORS: Record<PriorityId, string> = {
  1: "var(--p1)",
  2: "var(--p2)",
  3: "var(--p3)",
};

export function ReviewOverview({
  onSelectTab,
  onOpenSettings,
  useDemoData = false,
  onToggleDemoData,
}: ReviewOverviewProps) {
  const { state } = useOS();
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Active today live record (if plan exists)
  const liveDayRecord = useMemo(() => {
    return state.plan ? buildDayRecord(state.plan, "") : null;
  }, [state.plan]);

  // Today summary
  const todaySummary = useMemo(() => {
    if (liveDayRecord) return calculateDaySummary(liveDayRecord);
    const latestClosed = state.history.find(
      (h) => h.date === new Date().toISOString().slice(0, 10),
    );
    if (latestClosed) return calculateDaySummary(latestClosed);
    return null;
  }, [liveDayRecord, state.history]);

  // Active dataset (real history vs demo data)
  const historyData = useMemo(() => {
    return state.history;
  }, [state.history]);

  // Current ISO Week calculation
  const weekRange = useMemo(() => getISOWeekRange(new Date()), []);
  const weekSummary = useMemo(() => {
    return calculatePeriodSummary(
      historyData,
      "weekly",
      weekRange.id,
      weekRange.startDate,
      weekRange.endDate,
    );
  }, [historyData, weekRange]);

  // Current Month calculation
  const monthRange = useMemo(() => getMonthRange(new Date()), []);
  const monthSummary = useMemo(() => {
    return calculatePeriodSummary(
      historyData,
      "monthly",
      monthRange.id,
      monthRange.startDate,
      monthRange.endDate,
    );
  }, [historyData, monthRange]);

  // Operational alerts
  const alerts = useMemo(() => {
    const periodAlerts = generatePeriodAlerts(
      weekSummary,
      historyData,
      state.reviewSettings?.alertSettings,
    );
    const manualAlerts = (state.reviewAlerts ?? []).filter((a) => !a.dismissed);
    return [...manualAlerts, ...periodAlerts].slice(0, 3);
  }, [weekSummary, historyData, state.reviewAlerts, state.reviewSettings?.alertSettings]);

  // Priority Chart data
  const priorityChartData = useMemo(() => {
    return state.priorities.map((p) => {
      const planned = weekSummary.plannedHoursByPriority[p.id] ?? 0;
      const actual = weekSummary.hoursByPriority[p.id] ?? 0;
      return {
        name: `#${p.id} ${p.name.split(" ")[0]}`,
        fullName: p.name,
        Planned: planned,
        Actual: actual,
        id: p.id,
      };
    });
  }, [state.priorities, weekSummary]);

  // Priority 2 Workstream Split data
  const p2WorkstreamData = useMemo(() => {
    const a = weekSummary.p2HoursWorkstreamA;
    const b = weekSummary.p2HoursWorkstreamB;
    const total = a + b;
    return [
      {
        name: "A · Cashflow / Trading",
        value: a,
        percent: total > 0 ? Math.round((a / total) * 100) : 0,
        color: "var(--cyan)",
      },
      {
        name: "B · Fintech Product",
        value: b,
        percent: total > 0 ? Math.round((b / total) * 100) : 0,
        color: "var(--primary)",
      },
    ];
  }, [weekSummary]);

  // Unresolved bottlenecks count
  const activeBottlenecksCount = (state.bottlenecks ?? []).filter(
    (b) => b.status === "active" || b.status === "mitigating",
  ).length;

  // Active improvement pipeline
  const activeImprovements = (state.improvements ?? []).filter(
    (i) => i.status === "proposed" || i.status === "approved" || i.status === "implemented",
  ).length;

  return (
    <div className="space-y-6">
      {/* Smart Alerts Banner (if any) */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-2xl border p-4 transition-all",
                alt.severity === "critical"
                  ? "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/30"
                  : alt.severity === "warning"
                  ? "border-warning/40 bg-warning/10 text-warning dark:border-warning/30"
                  : "border-cyan/40 bg-cyan/10 text-cyan dark:border-cyan/30",
              )}
            >
              <div className="flex items-start gap-3">
                {alt.severity === "critical" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                ) : alt.severity === "warning" ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-warning" />
                ) : (
                  <Info className="h-5 w-5 shrink-0 mt-0.5 text-cyan" />
                )}
                <div>
                  <div className="font-semibold text-sm">{alt.title}</div>
                  <div className="text-xs opacity-90 mt-0.5">{alt.message}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => onSelectTab(alt.category === "chronic_bottleneck" ? "Bottlenecks" : "Weekly")}
              >
                Inspect <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Performance Intelligence Ribbon */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today Card */}
        <Glass className="p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan">
              Today · {liveDayRecord ? "Live State" : "Execution"}
            </span>
            <Badge
              className={cn(
                liveDayRecord
                  ? "border-primary/40 bg-primary/15 text-primary animate-pulse"
                  : todaySummary
                  ? "border-success/30 text-success bg-success/10"
                  : "text-muted-foreground",
              )}
            >
              {liveDayRecord ? "Live Tracking" : todaySummary ? "Closed" : "No Plan"}
            </Badge>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">
                {todaySummary ? `${todaySummary.totalActualHours}h` : "0.0h"}
              </span>
              <span className="text-xs text-muted-foreground">
                actual / {todaySummary ? `${todaySummary.totalPlannedHours}h` : "0h"} planned
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Tasks: {todaySummary ? `${todaySummary.tasksDone}/${todaySummary.tasksPlanned}` : "0/0"}</span>
              <span className="font-medium text-foreground">
                Outcomes: {todaySummary ? `${todaySummary.outcomesAchieved}/3` : "0/3"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-muted-foreground group-hover:text-foreground"
            onClick={() => onSelectTab("Daily")}
          >
            <span>Open Daily Review</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Glass>

        {/* This Week Card */}
        <Glass className="p-5 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan">
              This Week · {weekRange.id}
            </span>
            <span className="text-xs text-muted-foreground">
              {weekSummary.daysIncluded.length} / 7 days recorded
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">
                {weekSummary.totalActualHours}h
              </span>
              <span className="text-xs text-muted-foreground">
                invested ({weekSummary.totalPlannedHours}h planned)
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-secondary/30 p-2">
                <div className="text-muted-foreground">Task Completion</div>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {weekSummary.taskCompletionRate}%
                </div>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2">
                <div className="text-muted-foreground">Outcome Delivery</div>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {weekSummary.outcomesRate}%
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-muted-foreground group-hover:text-foreground"
            onClick={() => onSelectTab("Weekly")}
          >
            <span>Inspect Weekly Patterns</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Glass>

        {/* Compounding & Strategy Card */}
        <Glass className="p-5 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet">
              Strategic Velocity
            </span>
            <Badge className="border-violet/30 text-violet bg-violet/10">
              {monthRange.id}
            </Badge>
          </div>

          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monthly Investment</span>
              <span className="font-semibold text-foreground">{monthSummary.totalActualHours}h</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Active Bottlenecks</span>
              <span className={cn("font-semibold", activeBottlenecksCount > 0 ? "text-warning" : "text-muted-foreground")}>
                {activeBottlenecksCount} tracked
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Improvement Actions</span>
              <span className="font-semibold text-cyan">{activeImprovements} active</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-muted-foreground group-hover:text-foreground"
            onClick={() => onSelectTab("Improvements")}
          >
            <span>Improvement Pipeline</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </Glass>
      </div>

      {/* User-Defined Custom Metrics Ribbon (if configured) */}
      {(state.reviewSettings?.customMetrics ?? []).length > 0 && (
        <div className="rounded-2xl border border-glass-border/70 bg-gradient-to-r from-cyan/5 via-secondary/20 to-primary/5 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Active Custom Metric Formulas
              </span>
            </div>
            <Badge className="border-cyan/30 text-cyan bg-cyan/10 text-[10px]">
              {(state.reviewSettings?.customMetrics ?? []).length} Custom Formulas
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(state.reviewSettings?.customMetrics ?? []).map((m) => {
              const res = evaluateCustomMetric(m, weekSummary);
              return (
                <div key={m.id} className="p-3 rounded-xl border border-glass-border/40 bg-secondary/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate">{m.name}</span>
                    <span className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                      res.targetMet ? "text-success bg-success/15" : "text-warning bg-warning/15"
                    )}>
                      {res.targetMet ? "Met" : "Below"}
                    </span>
                  </div>
                  <div className="font-display text-xl font-bold text-foreground">
                    {res.formatted}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Target: {m.targetValue}{m.unit} · {m.description || m.formula}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Five Analytical Perspectives Hub Ribbon */}
      <div className="rounded-2xl border border-glass-border bg-secondary/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-cyan" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Five Analytical Perspectives
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-cyan hover:text-cyan/80"
            onClick={() => onSelectTab("Analytics")}
          >
            Open Analytics Hub <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 text-xs">
          <button
            type="button"
            onClick={() => onSelectTab("Analytics", "execution")}
            className="flex flex-col items-start p-3 rounded-xl border border-glass-border bg-secondary/30 hover:bg-secondary/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-cyan">
              <span className="font-semibold">Execution</span>
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-lg font-bold text-foreground mt-1">
              {weekSummary.taskCompletionRate}%
            </div>
            <div className="text-[10px] text-muted-foreground">Task Realism</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("Analytics", "outcomes")}
            className="flex flex-col items-start p-3 rounded-xl border border-glass-border bg-secondary/30 hover:bg-secondary/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-cyan">
              <span className="font-semibold">Outcomes</span>
              <Target className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-lg font-bold text-cyan mt-1">
              {weekSummary.outcomesAchievedTotal} dlvs
            </div>
            <div className="text-[10px] text-muted-foreground">Tangible Yield</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("Analytics", "priorities")}
            className="flex flex-col items-start p-3 rounded-xl border border-glass-border bg-secondary/30 hover:bg-secondary/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-cyan">
              <span className="font-semibold">Priorities</span>
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-lg font-bold text-violet mt-1">
              {weekSummary.p2HoursWorkstreamA}h / {weekSummary.p2HoursWorkstreamB}h
            </div>
            <div className="text-[10px] text-muted-foreground">P2 Trading / Fintech</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("Analytics", "projects")}
            className="flex flex-col items-start p-3 rounded-xl border border-glass-border bg-secondary/30 hover:bg-secondary/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-cyan">
              <span className="font-semibold">Projects</span>
              <FolderGit2 className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-lg font-bold text-foreground mt-1">
              {state.projects.length} tracks
            </div>
            <div className="text-[10px] text-muted-foreground">Milestone Progress</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("Analytics", "improvements")}
            className="flex flex-col items-start p-3 rounded-xl border border-glass-border bg-secondary/30 hover:bg-secondary/60 text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-cyan">
              <span className="font-semibold">Improvements</span>
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-lg font-bold text-success mt-1">
              {activeImprovements} active
            </div>
            <div className="text-[10px] text-muted-foreground">Closed Loop</div>
          </button>
        </div>
      </div>

      {/* Main Analytical Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Planned vs Actual by Priority Chart */}
        <Glass className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold">Priority Hours · Plan vs. Actual</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deterministic distribution across permanent priorities ({weekRange.id})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Planned
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-violet" /> Actual
                </span>
              </div>
              <div className="flex items-center bg-secondary/40 p-0.5 rounded-lg border border-glass-border">
                <button
                  type="button"
                  onClick={() => setChartType("bar")}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded transition-all",
                    chartType === "bar"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Bar
                </button>
                <button
                  type="button"
                  onClick={() => setChartType("pie")}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded transition-all",
                    chartType === "pie"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Ratio
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} unit="h" />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-glass)",
                    }}
                    formatter={(val: any) => [`${val ?? 0}h`, ""]}
                  />
                  <Bar dataKey="Planned" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={26} />
                  <Bar dataKey="Actual" fill="var(--violet)" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              ) : (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                    formatter={(val: any) => [`${val ?? 0}h`, "Actual"]}
                  />
                  <Pie
                    data={priorityChartData}
                    dataKey="Actual"
                    nameKey="fullName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {priorityChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={
                          entry.id === 1
                            ? "var(--p1)"
                            : entry.id === 2
                            ? "var(--p2)"
                            : "var(--p3)"
                        }
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    formatter={(val: string) => (
                      <span className="text-xs text-foreground font-medium">{val}</span>
                    )}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Quick Drill-Down Footer */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border pt-4 text-center">
            {priorityChartData.map((p) => (
              <div key={p.id} className="rounded-xl bg-secondary/30 p-2.5">
                <div className="text-[11px] text-muted-foreground font-medium truncate">{p.fullName}</div>
                <div className="text-sm font-semibold mt-1">
                  {p.Actual}h <span className="text-xs text-muted-foreground font-normal">/ {p.Planned}h</span>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* Priority 2 Workstream A / B Split Panel */}
        <Glass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Priority 2 Workstream Split</h2>
              <Badge className="border-cyan/30 text-cyan bg-cyan/10">Isolated A / B</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Cashflow Infrastructure strictly separated into Trading vs. Fintech Product Capability.
            </p>

            <div className="space-y-4 my-2">
              {p2WorkstreamData.map((ws, i) => (
                <div key={i} className="rounded-2xl border border-glass-border bg-secondary/30 p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ws.color }} />
                      {ws.name}
                    </span>
                    <span className="font-display text-sm">{ws.value}h ({ws.percent}%)</span>
                  </div>
                  <Progress value={ws.percent} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-glass-border bg-secondary/20 p-4 mt-4">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-warning" />
              Strategic Balance Rule
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Workstream A provides immediate cash funding; Workstream B builds long-term equity and product value. Do not let one starve the other.
            </p>
          </div>
        </Glass>
      </div>

      {/* Recurring Friction & Learning Highlights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Compounding Friction */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Recurring Execution Friction</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tasks postponed multiple times across review periods
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelectTab("Bottlenecks")}>
              View All
            </Button>
          </div>

          {weekSummary.repeatedUnfinishedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2 opacity-80" />
              No recurring unfinished work recorded in this period.
            </div>
          ) : (
            <div className="space-y-2">
              {weekSummary.repeatedUnfinishedTasks.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary/30 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <PriorityIcon id={item.priorityId} className="h-6 w-6" />
                    <span className="font-medium text-foreground">{item.title}</span>
                  </div>
                  <Badge className="border-warning/30 bg-warning/10 text-warning">
                    Postponed {item.count}×
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Glass>

        {/* Recent Operational Learnings */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Operational Learnings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evidence captured during Daily Closeouts
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelectTab("History")}>
              History
            </Button>
          </div>

          {weekSummary.learningsSummary.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-xs text-muted-foreground">
              No learnings logged yet this week. Complete Daily Closeout to record lessons.
            </div>
          ) : (
            <div className="space-y-2.5">
              {weekSummary.learningsSummary.slice(0, 3).map((l, i) => (
                <div key={i} className="rounded-xl border border-glass-border bg-secondary/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px] mb-1">
                    <span>{l.date}</span>
                    <span className="text-cyan">Daily Insight</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{l.text}</p>
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}
