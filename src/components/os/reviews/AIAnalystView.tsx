import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Info,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import {
  calculatePeriodSummary,
  generateDeterministicInsights,
  getISOWeekRange,
} from "@/lib/os/reviews/analytics";
import { addImprovement } from "@/lib/os/reviews/operations";
import type { ReviewAIInsight } from "@/lib/os/types";
import { Badge, Button, Empty, Glass, PriorityIcon } from "@/components/os/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIAnalystViewProps {
  onGoToImprovements: () => void;
}

export function AIAnalystView({ onGoToImprovements }: AIAnalystViewProps) {
  const { state, update } = useOS();

  // Weekly period context
  const weekInfo = useMemo(() => getISOWeekRange(new Date()), []);
  const weekSummary = useMemo(() => {
    return calculatePeriodSummary(
      state.history,
      "weekly",
      weekInfo.id,
      weekInfo.startDate,
      weekInfo.endDate,
    );
  }, [state.history, weekInfo]);

  // Generate deterministic, evidence-based insights
  const generatedInsights = useMemo(() => {
    return generateDeterministicInsights(weekSummary, state.history);
  }, [weekSummary, state.history]);

  // Combine with any user/stored insights
  const allInsights = useMemo(() => {
    const custom = state.aiInsights ?? [];
    return [...generatedInsights, ...custom];
  }, [generatedInsights, state.aiInsights]);

  // Facts, Insights, Recommendations buckets
  const facts = allInsights.filter((i) => i.type === "fact");
  const analyticalInsights = allInsights.filter((i) => i.type === "insight");
  const recommendations = allInsights.filter(
    (i) => i.type === "recommendation",
  );

  // Insufficient evidence indicator
  const hasInsufficientEvidence = weekSummary.daysIncluded.length < 3;

  const handleAdoptRecommendation = (rec: ReviewAIInsight) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    update((s) =>
      addImprovement(s, {
        periodType: "weekly",
        periodRef: weekInfo.id,
        priorityId: rec.priorityId,
        problemStatement: rec.title,
        evidence: {
          metrics: rec.evidence.dataPoints,
          dayDates: [todayIso],
        },
        recommendation: rec.recommendedAction || rec.body,
        status: "proposed",
      }),
    );

    toast.success(`Converted "${rec.title}" into Improvement proposal.`);
    onGoToImprovements();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display">
              AI Performance Analyst
            </h2>
            <Badge className="border-cyan/30 text-cyan bg-cyan/10">
              Deterministic Grounding
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strictly separates empirical facts, analytical deductions, and
            actionable recommendations. Zero hallucinated metrics.
          </p>
        </div>

        <div className="text-right text-xs">
          <span className="text-muted-foreground">Basis: </span>
          <span className="font-semibold text-foreground">
            {weekSummary.daysIncluded.length} of 7 days in {weekInfo.id}
          </span>
        </div>
      </Glass>

      {/* Insufficient Evidence Warning Banner */}
      {hasInsufficientEvidence && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs space-y-1 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" />
            Limited Statistical Evidence Notice
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Only {weekSummary.daysIncluded.length} execution day(s) are recorded
            in the active period. The Analyst requires at least 3 closed days
            for high-confidence strategic synthesis. Confidence is flagged as
            Low.
          </p>
        </div>
      )}

      {/* THREE RIGOROUS SECTIONS: FACTS, INSIGHTS, RECOMMENDATIONS */}

      {/* 1. EMPIRICAL FACTS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
            1. Empirical Facts ({facts.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            · Directly verified from records
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {facts.map((f) => (
            <Glass key={f.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {f.priorityId && (
                    <PriorityIcon id={f.priorityId} className="h-6 w-6" />
                  )}
                  <span className="font-semibold text-sm text-foreground">
                    {f.title}
                  </span>
                </div>
                <Badge
                  className={cn(
                    "text-[10px]",
                    f.evidence.confidence === "High"
                      ? "border-success/30 text-success"
                      : "border-warning/30 text-warning",
                  )}
                >
                  {f.evidence.confidence} Confidence
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.body}
              </p>

              <div className="rounded-xl bg-secondary/30 p-2.5 text-[11px] text-muted-foreground space-y-1 border border-glass-border/40">
                <span className="font-semibold text-foreground block">
                  Verified Data Points:
                </span>
                {f.evidence.dataPoints.map((dp, idx) => (
                  <div key={idx}>· {dp}</div>
                ))}
              </div>
            </Glass>
          ))}
        </div>
      </div>

      {/* 2. ANALYTICAL INSIGHTS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-violet">
            2. Analytical Insights ({analyticalInsights.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            · Operational patterns & calibration
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {analyticalInsights.map((ins) => (
            <Glass key={ins.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-violet" />
                  {ins.title}
                </span>
                <Badge className="text-[10px] border-violet/30 text-violet bg-violet/10">
                  {ins.evidence.confidence}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {ins.body}
              </p>

              <div className="rounded-xl bg-secondary/30 p-2.5 text-[11px] text-muted-foreground space-y-1 border border-glass-border/40">
                <span className="font-semibold text-foreground block">
                  Deduction Basis:
                </span>
                {ins.evidence.dataPoints.map((dp, idx) => (
                  <div key={idx}>· {dp}</div>
                ))}
              </div>
            </Glass>
          ))}
        </div>
      </div>

      {/* 3. ACTIONABLE RECOMMENDATIONS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
            3. Actionable Recommendations ({recommendations.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            · Concrete proposals grounded in evidence
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-glass-border p-6 text-center text-xs text-muted-foreground">
            Zero friction recommendations detected in this period. Execution has
            minimal recurring stall.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec) => (
              <Glass
                key={rec.id}
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {rec.title}
                    </span>
                    <Badge className="text-[10px] border-primary/30 text-primary">
                      Recommendation
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.body}
                  </p>

                  <div className="rounded-xl bg-secondary/30 p-2.5 text-[11px] text-muted-foreground space-y-0.5 border border-glass-border/40">
                    <span className="font-semibold text-foreground block">
                      Evidence Trigger:
                    </span>
                    {rec.evidence.dataPoints.map((dp, idx) => (
                      <div key={idx}>· {dp}</div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="glass"
                  size="sm"
                  className="w-full text-xs text-cyan hover:bg-cyan/15 justify-between"
                  onClick={() => handleAdoptRecommendation(rec)}
                >
                  <span>Adopt into Improvement Intelligence</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Glass>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
