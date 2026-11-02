import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Compass,
  FileCheck,
  HelpCircle,
  Info,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  BookmarkCheck,
  Scale,
  History,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import { calculateMilestoneForecast } from "@/lib/os/reviews/analytics";
import {
  addForecastSnapshot,
  markForecastDelivered,
} from "@/lib/os/reviews/operations";
import type { PriorityId, ForecastSnapshot } from "@/lib/os/types";
import {
  Badge,
  Button,
  Glass,
  Input,
  Label,
  PriorityIcon,
  Progress,
} from "@/components/os/ui";
import { cn } from "@/lib/utils";

export function ForecastView() {
  const { state, update } = useOS();

  const [selectedPriorityId, setSelectedPriorityId] = useState<PriorityId>(1);
  const [hoursNeeded, setHoursNeeded] = useState<number>(25);
  const [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(
    null,
  );
  const [deliveredDateInput, setDeliveredDateInput] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // What-If Scenario Simulator state
  const [weeklyCapacity, setWeeklyCapacity] = useState<number>(35);
  const [priorityFocusPct, setPriorityFocusPct] = useState<number>(45);

  const selectedPriority = state.priorities.find(
    (p) => p.id === selectedPriorityId,
  )!;

  // Milestone forecast computed deterministically from real history
  const forecast = useMemo(() => {
    return calculateMilestoneForecast(
      selectedPriorityId,
      selectedPriority.milestone || "Deliverable",
      hoursNeeded,
      state.history,
      14,
    );
  }, [selectedPriorityId, selectedPriority, hoursNeeded, state.history]);

  // What-If Simulation
  const simulatedWeeklyHours = useMemo(() => {
    return Math.max(
      1,
      Math.round(weeklyCapacity * (priorityFocusPct / 100) * 10) / 10,
    );
  }, [weeklyCapacity, priorityFocusPct]);

  const simulatedWeeks = useMemo(() => {
    return Math.max(1, Math.ceil(hoursNeeded / simulatedWeeklyHours));
  }, [hoursNeeded, simulatedWeeklyHours]);

  const simulatedCompletionDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + simulatedWeeks * 7);
    return d.toISOString().slice(0, 10);
  }, [simulatedWeeks]);

  const forecastHistory = state.forecastHistory ?? [];

  const calibrationStats = useMemo(() => {
    const delivered = forecastHistory.filter((f) => f.status === "delivered");
    if (delivered.length === 0) {
      return {
        total: forecastHistory.length,
        deliveredCount: 0,
        accuracyRate: 0,
        avgVariance: 0,
      };
    }
    const accurateCount = delivered.filter(
      (f) => f.calibrationRating === "accurate",
    ).length;
    const totalVariance = delivered.reduce(
      (sum, f) => sum + Math.abs(f.accuracyVarianceDays ?? 0),
      0,
    );
    return {
      total: forecastHistory.length,
      deliveredCount: delivered.length,
      accuracyRate: Math.round((accurateCount / delivered.length) * 100),
      avgVariance: Math.round((totalVariance / delivered.length) * 10) / 10,
    };
  }, [forecastHistory]);

  const handleSaveBenchmark = () => {
    update((s) =>
      addForecastSnapshot(s, {
        priorityId: selectedPriorityId,
        milestoneTitle:
          selectedPriority.milestone ||
          `Priority #${selectedPriorityId} Target`,
        hoursNeeded,
        predictedDate: forecast.scenarios.realistic.estimatedCompletionDate,
        predictedWeeks: forecast.scenarios.realistic.weeksRemaining,
        confidenceScore: forecast.confidenceScore,
        velocityBasisHoursPerWeek: forecast.historicalVelocityHoursPerWeek,
        status: "projecting",
      }),
    );
  };

  const handleConfirmDelivered = (id: string) => {
    if (!deliveredDateInput) return;
    update((s) => markForecastDelivered(s, id, deliveredDateInput));
    setMarkingDeliveredId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display">
              Milestone Velocity & Scenario Forecasting
            </h2>
            <Badge className="border-cyan/30 text-cyan bg-cyan/10">
              Deterministic Scenarios
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Projects milestone completion dates using empirical execution
            velocity and historical outcome calibration
          </p>
        </div>
      </Glass>

      {/* Priority Selection & Estimate Input Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Glass className="p-6 space-y-4">
          <h3 className="text-base font-semibold">
            1. Select Priority & Milestone
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {state.priorities.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPriorityId(p.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition-all text-center",
                  selectedPriorityId === p.id
                    ? "border-primary bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                    : "border-glass-border bg-secondary/30 hover:bg-secondary/50",
                )}
              >
                <PriorityIcon id={p.id} className="h-7 w-7" />
                <span className="font-semibold text-xs text-foreground">
                  #{p.id} {p.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-secondary/30 p-3 text-xs space-y-1">
            <span className="text-muted-foreground">
              Current Active Milestone:
            </span>
            <div className="font-semibold text-sm text-foreground">
              {selectedPriority.milestone || "No milestone defined"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Project: {selectedPriority.project || "Unassigned"}
            </div>
          </div>
        </Glass>

        {/* Hours Needed Calibration */}
        <Glass className="p-6 space-y-4">
          <h3 className="text-base font-semibold">
            2. Estimate Scope (Remaining Hours)
          </h3>
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <Label className="mb-0">
                Estimated Hours to Deliver Milestone
              </Label>
              <span className="font-display font-bold text-sm text-primary">
                {hoursNeeded} hours
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={500}
              value={hoursNeeded}
              onChange={(e) =>
                setHoursNeeded(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="font-mono text-base"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            {[10, 25, 50].map((h) => (
              <Button
                key={h}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setHoursNeeded(h)}
              >
                {h}h Quick Scope
              </Button>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground italic leading-relaxed">
            Derived from your real closed execution days in the past 14 days. If
            a priority was starved of hours, projected completion reflects that
            reality.
          </div>
        </Glass>
      </div>

      {/* Scenario Results Ribbon */}
      <Glass className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">
              3. Projected Delivery Scenarios
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {forecast.evidenceBasis}
            </p>
          </div>

          <Badge
            className={cn(
              forecast.confidenceScore === "High"
                ? "border-success/30 text-success bg-success/10"
                : forecast.confidenceScore === "Medium"
                  ? "border-cyan/30 text-cyan bg-cyan/10"
                  : "border-warning/30 text-warning bg-warning/10",
            )}
          >
            {forecast.confidenceScore} Confidence Rating
          </Badge>
        </div>

        {/* 3 Scenario Cards: Conservative, Realistic, Optimistic */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Optimistic */}
          <div className="rounded-2xl border border-glass-border bg-secondary/30 p-5 space-y-2 relative overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan">
              Optimistic (High Focus)
            </span>
            <div className="font-display text-2xl font-bold text-foreground">
              {forecast.scenarios.optimistic.estimatedCompletionDate}
            </div>
            <div className="text-xs text-muted-foreground">
              ~{forecast.scenarios.optimistic.weeksRemaining} week(s) remaining
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-glass-border/40">
              Assumes uninterrupted deep execution blocks and zero recurring
              bottlenecks.
            </p>
          </div>

          {/* Realistic (Highlighted) */}
          <div className="rounded-2xl border-2 border-primary/50 bg-primary/10 p-5 space-y-2 relative shadow-lg glow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Realistic (Historical Trend)
              </span>
              <Badge className="border-primary/40 bg-primary/20 text-primary text-[10px]">
                Recommended
              </Badge>
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {forecast.scenarios.realistic.estimatedCompletionDate}
            </div>
            <div className="text-xs text-foreground font-medium">
              ~{forecast.scenarios.realistic.weeksRemaining} week(s) remaining
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-primary/20">
              Grounded in current average velocity (
              {forecast.historicalVelocityHoursPerWeek}h/wk) calibrated by
              outcome success rate (
              {Math.round(forecast.outcomeSuccessRate * 100)}%).
            </p>
          </div>

          {/* Conservative */}
          <div className="rounded-2xl border border-glass-border bg-secondary/30 p-5 space-y-2 relative overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">
              Conservative (Friction Margin)
            </span>
            <div className="font-display text-2xl font-bold text-foreground">
              {forecast.scenarios.conservative.estimatedCompletionDate}
            </div>
            <div className="text-xs text-muted-foreground">
              ~{forecast.scenarios.conservative.weeksRemaining} week(s)
              remaining
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-glass-border/40">
              Includes 35% time buffer for unexpected bugs, external blockers,
              and college commitments.
            </p>
          </div>
        </div>
      </Glass>

      {/* 4. Interactive What-If Scenario Simulator */}
      <Glass className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan" />
              <h3 className="text-base font-semibold">
                4. Interactive What-If Scenario Simulator
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate how adjusting your total weekly work capacity and
              priority focus allocation accelerates or delays milestone
              delivery.
            </p>
          </div>
          <Badge className="border-cyan/30 text-cyan bg-cyan/10">
            Interactive Modeling
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Controls */}
          <div className="space-y-5 rounded-2xl bg-secondary/20 p-4 border border-glass-border/40">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-foreground">
                  Total Weekly Execution Capacity
                </span>
                <span className="font-mono font-bold text-primary">
                  {weeklyCapacity} hrs / week
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={weeklyCapacity}
                onChange={(e) =>
                  setWeeklyCapacity(parseInt(e.target.value, 10))
                }
                className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>15h (Part-time / Exams)</span>
                <span>35h (Standard)</span>
                <span>60h (Founder Sprint)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-foreground">
                  Priority #{selectedPriorityId} Focus Allocation
                </span>
                <span className="font-mono font-bold text-cyan">
                  {priorityFocusPct}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={priorityFocusPct}
                onChange={(e) =>
                  setPriorityFocusPct(parseInt(e.target.value, 10))
                }
                className="w-full accent-cyan h-2 bg-secondary rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>10% (Low Focus)</span>
                <span>45% (Balanced)</span>
                <span>90% (Deep Sprint)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-glass-border/30 flex items-center justify-between text-xs text-muted-foreground">
              <span>Simulated Priority Effort:</span>
              <span className="font-mono font-semibold text-foreground">
                {simulatedWeeklyHours} hrs/week
              </span>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="rounded-2xl border border-glass-border bg-gradient-to-br from-cyan/10 via-background/40 to-primary/10 p-5 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                Simulated Completion Date
              </span>
              <div className="text-3xl font-display font-bold text-foreground mt-1">
                {simulatedCompletionDate}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                ~{simulatedWeeks} week(s) at {simulatedWeeklyHours} hrs/week
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  Variance vs. Realistic Trend:
                </span>
                <span
                  className={cn(
                    "font-mono font-bold text-xs px-2 py-0.5 rounded-full border",
                    simulatedWeeks < forecast.scenarios.realistic.weeksRemaining
                      ? "border-success/30 text-success bg-success/10"
                      : simulatedWeeks >
                          forecast.scenarios.realistic.weeksRemaining
                        ? "border-warning/30 text-warning bg-warning/10"
                        : "border-glass-border text-muted-foreground bg-secondary/30",
                  )}
                >
                  {simulatedWeeks < forecast.scenarios.realistic.weeksRemaining
                    ? `${forecast.scenarios.realistic.weeksRemaining - simulatedWeeks} weeks faster`
                    : simulatedWeeks >
                        forecast.scenarios.realistic.weeksRemaining
                      ? `${simulatedWeeks - forecast.scenarios.realistic.weeksRemaining} weeks slower`
                      : "Matches Realistic Baseline"}
                </span>
              </div>
              <Progress
                value={Math.min(
                  100,
                  Math.round((simulatedWeeklyHours / 25) * 100),
                )}
                className="h-2"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {simulatedWeeks < forecast.scenarios.realistic.weeksRemaining
                  ? `🚀 Squeezing ${simulatedWeeklyHours}h/wk into Priority #${selectedPriorityId} delivers the milestone ~${forecast.scenarios.realistic.weeksRemaining - simulatedWeeks} week(s) ahead of your historical pace.`
                  : simulatedWeeks > forecast.scenarios.realistic.weeksRemaining
                    ? `⚠️ At ${simulatedWeeklyHours}h/wk, this priority is receiving less than its historical pace, adding ~${simulatedWeeks - forecast.scenarios.realistic.weeksRemaining} week(s) to completion.`
                    : `🎯 This scenario closely tracks your trailing 14-day execution velocity.`}
              </p>
            </div>
          </div>
        </div>
      </Glass>

      {/* Section 5: Forecast Accuracy & Calibration History */}
      <Glass className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">
                5. Forecast Calibration & Historical Accuracy
              </h3>
              <Badge className="border-primary/30 text-primary bg-primary/10">
                Evidence Ledger
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tracks whether previous projected delivery dates matched reality
              to expose optimism or conservatism bias
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSaveBenchmark}
            className="flex items-center gap-2 text-xs"
          >
            <BookmarkCheck className="h-4 w-4" />
            Archive Current Projection as Benchmark
          </Button>
        </div>

        {/* Calibration Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Glass className="p-3 bg-secondary/20">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">
              Total Benchmarks
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {calibrationStats.total}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {calibrationStats.deliveredCount} delivered & verified
            </div>
          </Glass>

          <Glass className="p-3 bg-secondary/20">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">
              Calibration Accuracy
            </div>
            <div className="text-2xl font-bold font-mono text-success mt-1">
              {calibrationStats.deliveredCount > 0
                ? `${calibrationStats.accuracyRate}%`
                : "Pending"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Target date met within +/- 5 days
            </div>
          </Glass>

          <Glass className="p-3 bg-secondary/20">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">
              Mean Variance
            </div>
            <div className="text-2xl font-bold font-mono text-cyan mt-1">
              {calibrationStats.deliveredCount > 0
                ? `+/- ${calibrationStats.avgVariance}d`
                : "Pending"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Average delivery deviation from prediction
            </div>
          </Glass>
        </div>

        {/* Benchmarks List */}
        {forecastHistory.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-lg border-glass-border">
            <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <div className="text-sm font-semibold text-foreground">
              No Calibration Snapshots Saved Yet
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Click &quot;Archive Current Projection as Benchmark&quot; to log
              your realistic completion date (
              {forecast.scenarios.realistic.estimatedCompletionDate}). Once the
              milestone completes, mark it delivered to compute historical
              calibration variance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forecastHistory.map((item) => (
              <Glass
                key={item.id}
                className={cn(
                  "p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border",
                  item.status === "delivered"
                    ? "border-glass-border bg-secondary/10"
                    : "border-primary/20 bg-primary/5",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {item.milestoneTitle}
                    </span>
                    <Badge className="text-[10px] font-mono">
                      Priority #{item.priorityId}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        item.status === "delivered"
                          ? item.calibrationRating === "accurate"
                            ? "border-success/30 text-success bg-success/10"
                            : item.calibrationRating === "optimistic_bias"
                              ? "border-warning/30 text-warning bg-warning/10"
                              : "border-cyan/30 text-cyan bg-cyan/10"
                          : "border-primary/30 text-primary bg-primary/10",
                      )}
                    >
                      {item.status === "delivered"
                        ? item.calibrationRating === "accurate"
                          ? "Accurate (±5d)"
                          : item.calibrationRating === "optimistic_bias"
                            ? "Optimistic Bias (Late)"
                            : "Conservative Bias (Early)"
                        : "Active Milestone"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Target:{" "}
                      <strong className="text-foreground font-mono">
                        {item.predictedDate}
                      </strong>{" "}
                      (~{item.predictedWeeks}w)
                    </span>
                    {item.velocityBasisHoursPerWeek != null && (
                      <>
                        <span>•</span>
                        <span>
                          Pace Basis:{" "}
                          <strong className="text-foreground font-mono">
                            {item.velocityBasisHoursPerWeek}h/wk
                          </strong>
                        </span>
                      </>
                    )}
                    {item.confidenceScore && (
                      <>
                        <span>•</span>
                        <span>
                          Confidence:{" "}
                          <strong className="text-foreground">
                            {item.confidenceScore}
                          </strong>
                        </span>
                      </>
                    )}
                    {item.actualDeliveredDate && (
                      <>
                        <span>•</span>
                        <span>
                          Delivered:{" "}
                          <strong className="text-foreground font-mono">
                            {item.actualDeliveredDate}
                          </strong>
                        </span>
                        <span>•</span>
                        <span
                          className={cn(
                            "font-mono font-semibold",
                            (item.accuracyVarianceDays ?? 0) <= 0
                              ? "text-success"
                              : "text-warning",
                          )}
                        >
                          {(item.accuracyVarianceDays ?? 0) > 0
                            ? `+${item.accuracyVarianceDays} days late`
                            : `${Math.abs(item.accuracyVarianceDays ?? 0)} days early`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === "projecting" ? (
                    markingDeliveredId === item.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={deliveredDateInput}
                          onChange={(e) =>
                            setDeliveredDateInput(e.target.value)
                          }
                          className="w-36 text-xs h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleConfirmDelivered(item.id)}
                          className="h-8 text-xs"
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarkingDeliveredId(null)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          setMarkingDeliveredId(item.id);
                          setDeliveredDateInput(
                            new Date().toISOString().slice(0, 10),
                          );
                        }}
                        className="text-xs h-8 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        Mark Delivered
                      </Button>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      Archived in ledger
                    </span>
                  )}
                </div>
              </Glass>
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
}
