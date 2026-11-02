import { useMemo, useState } from "react";
import {
  Award,
  BookMarked,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Edit,
  ExternalLink,
  Filter,
  Lightbulb,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import {
  addImprovement,
  promoteImprovementToKnowledge,
  updateImprovement,
} from "@/lib/os/reviews/operations";
import { calculateImprovementStats } from "@/lib/os/reviews/analytics";
import type {
  ImprovementOutcome,
  ImprovementStatus,
  KnowledgeItem,
  PriorityId,
  ReviewImprovement,
} from "@/lib/os/types";
import {
  Badge,
  Button,
  Empty,
  Glass,
  Input,
  Label,
  Modal,
  PriorityIcon,
  Textarea,
} from "@/components/os/ui";
import { KnowledgeEditorModal } from "@/components/os/KnowledgeEditorModal";
import { today, uid } from "@/lib/os/seed";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function ImprovementsView() {
  const { state, update } = useOS();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [decisionModalTarget, setDecisionModalTarget] =
    useState<ReviewImprovement | null>(null);
  const [evalModalTarget, setEvalModalTarget] =
    useState<ReviewImprovement | null>(null);

  // Form states for creation
  const [prob, setProb] = useState("");
  const [rec, setRec] = useState("");
  const [prioId, setPrioId] = useState<PriorityId>(1);
  const [evidenceMetrics, setEvidenceMetrics] = useState("");
  const [expectedRes, setExpectedRes] = useState("");

  // Form states for decision
  const [approvedAct, setApprovedAct] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");

  // Form states for evaluation
  const [evalOutcome, setEvalOutcome] =
    useState<ImprovementOutcome>("succeeded");
  const [evalNotes, setEvalNotes] = useState("");

  const improvements = useMemo(() => {
    return state.improvements ?? [];
  }, [state.improvements]);

  const stats = useMemo(() => {
    return calculateImprovementStats(improvements);
  }, [improvements]);

  const filtered = useMemo(() => {
    return improvements.filter((imp) => {
      if (statusFilter !== "all" && imp.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchScope =
          `${imp.problemStatement} ${imp.recommendation} ${imp.approvedAction ?? ""}`.toLowerCase();
        if (!searchScope.includes(q)) return false;
      }
      return true;
    });
  }, [improvements, statusFilter, searchQuery]);

  const handleCreate = () => {
    if (!prob.trim() || !rec.trim()) {
      toast.error("Please provide both problem statement and recommendation.");
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    update((s) =>
      addImprovement(s, {
        periodType: "daily",
        periodRef: todayIso,
        priorityId: prioId,
        problemStatement: prob.trim(),
        evidence: {
          metrics: evidenceMetrics
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
          dayDates: [todayIso],
        },
        recommendation: rec.trim(),
        status: "proposed",
        expectedResult: expectedRes.trim() || undefined,
      }),
    );

    toast.success("Improvement proposal added to intelligence loop.");
    setCreateModalOpen(false);
    setProb("");
    setRec("");
    setEvidenceMetrics("");
    setExpectedRes("");
  };

  const handleSaveDecision = (action: "approve" | "reject") => {
    if (!decisionModalTarget) return;

    if (action === "approve") {
      update((s) =>
        updateImprovement(s, decisionModalTarget.id, {
          status: "approved",
          approvedAction:
            approvedAct.trim() || decisionModalTarget.recommendation,
          decisionNote: decisionNotes.trim() || undefined,
        }),
      );
      toast.success("Improvement approved for action.");
    } else {
      update((s) =>
        updateImprovement(s, decisionModalTarget.id, {
          status: "rejected",
          decisionNote: decisionNotes.trim() || "Rejected by user.",
        }),
      );
      toast.info("Improvement marked as rejected.");
    }

    setDecisionModalTarget(null);
    setApprovedAct("");
    setDecisionNotes("");
  };

  const handleSaveEvaluation = () => {
    if (!evalModalTarget) return;

    update((s) =>
      updateImprovement(s, evalModalTarget.id, {
        status: "evaluated",
        evaluationOutcome: evalOutcome,
        evaluationNotes: evalNotes.trim() || undefined,
      }),
    );

    toast.success("Improvement evaluated.");
    setEvalModalTarget(null);
    setEvalNotes("");
  };

  const [promotingImp, setPromotingImp] = useState<ReviewImprovement | null>(
    null,
  );

  const proposedKnowledgeItem = useMemo((): KnowledgeItem | null => {
    if (!promotingImp) return null;
    const actionText =
      promotingImp.approvedAction || promotingImp.recommendation || "";
    const isStepMethod =
      actionText.toLowerCase().includes("step") ||
      actionText.toLowerCase().includes("process");
    const format = isStepMethod ? "method" : "principle";

    return {
      id: `k-imp-${uid()}`,
      title: `Lesson: ${promotingImp.problemStatement.slice(0, 60)}`,
      type: "Learning",
      knowledgeFormat: format,
      formatData: {
        principle: {
          corePrinciple: actionText,
          whyItMatters: promotingImp.problemStatement,
          whenToApply: promotingImp.periodRef
            ? `During ${promotingImp.periodRef} review cycles`
            : undefined,
        },
        method: {
          purpose: promotingImp.problemStatement,
          steps: [actionText],
          expectedResult:
            promotingImp.expectedResult || promotingImp.evaluationNotes,
        },
        custom: {
          content: `Problem: ${promotingImp.problemStatement}\nRecommendation: ${promotingImp.recommendation}\nApproved Action: ${actionText}\nEvaluation Result: ${promotingImp.evaluationNotes || "Validated"}`,
        },
      },
      body: `Problem: ${promotingImp.problemStatement}\n\nEvidence: ${(promotingImp.evidence.metrics || []).join("; ")}\n\nApproved Action: ${actionText}\n\nEvaluation Result (${promotingImp.evaluationOutcome || "completed"}): ${promotingImp.evaluationNotes || "Validated through execution."}`,
      priorityId: promotingImp.priorityId,
      projectId: promotingImp.projectId,
      tags: `improvement, review, ${promotingImp.periodRef}`,
      createdAt: today(),
      schemaVersion: 1,
    };
  }, [promotingImp]);

  const handleConfirmPromote = (saved: KnowledgeItem) => {
    if (!promotingImp) return;
    update((s) =>
      promoteImprovementToKnowledge(s, promotingImp.id, saved.createdAt, saved),
    );
    toast.success("Learning promoted to Yash OS Knowledge registry.");
    setPromotingImp(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display">
            Improvement Intelligence Loop
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Problem → Evidence → Recommendation → Decision → Approved Action →
            Evaluation → Learning
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="text-xs"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Propose Improvement
        </Button>
      </Glass>

      {/* KPI Stats Ribbon */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">
            Proposed (Pending)
          </div>
          <div className="font-display text-2xl font-bold mt-1 text-cyan">
            {stats.proposed}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Awaiting decision
          </div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">Approved / Active</div>
          <div className="font-display text-2xl font-bold mt-1 text-primary">
            {stats.approved}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Actions in progress
          </div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">Evaluated Actions</div>
          <div className="font-display text-2xl font-bold mt-1 text-success">
            {stats.evaluated}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Execution completed
          </div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">
            Evaluation Success Rate
          </div>
          <div className="font-display text-2xl font-bold mt-1 text-foreground">
            {stats.successRate}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Empirical effectiveness
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Glass className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "proposed", "approved", "evaluated", "rejected"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium capitalize transition-all",
                  statusFilter === st
                    ? "bg-primary text-primary-foreground glow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {st}
              </button>
            ),
          )}
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search improvements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 rounded-lg border border-input bg-secondary/50 text-xs text-foreground outline-none w-48"
          />
        </div>
      </Glass>

      {/* Improvements Pipeline List */}
      {filtered.length === 0 ? (
        <Empty title="No improvement actions in this view">
          {improvements.length === 0
            ? "No improvements recorded yet. Click 'Propose Improvement' to create your first action."
            : "No items match your selected status or search query."}
        </Empty>
      ) : (
        <div className="space-y-4">
          {filtered.map((imp) => {
            const isProposed = imp.status === "proposed";
            const isApproved = imp.status === "approved";
            const isEvaluated = imp.status === "evaluated";

            return (
              <Glass
                key={imp.id}
                className="p-5 space-y-3 transition-all hover:bg-secondary/40"
              >
                {/* Stage Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {imp.priorityId && (
                      <PriorityIcon
                        id={imp.priorityId}
                        className="h-8 w-8 mt-0.5"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground">
                          {imp.problemStatement}
                        </span>
                        <Badge
                          className={cn(
                            "capitalize text-[11px]",
                            isProposed
                              ? "border-cyan/30 text-cyan bg-cyan/10"
                              : isApproved
                                ? "border-primary/30 text-primary bg-primary/10"
                                : isEvaluated
                                  ? "border-success/30 text-success bg-success/10"
                                  : "text-muted-foreground",
                          )}
                        >
                          {imp.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Period Ref: {imp.periodRef} · Created:{" "}
                        {new Date(imp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions based on status */}
                  <div className="flex items-center gap-2">
                    {isProposed && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setDecisionModalTarget(imp);
                          setApprovedAct(imp.recommendation);
                        }}
                      >
                        Make Decision
                      </Button>
                    )}

                    {isApproved && (
                      <Button
                        variant="glass"
                        size="sm"
                        className="text-xs text-cyan hover:bg-cyan/10"
                        onClick={() => setEvalModalTarget(imp)}
                      >
                        Evaluate Outcome
                      </Button>
                    )}

                    {isEvaluated && !imp.promotedToKnowledgeId && (
                      <Button
                        variant="glass"
                        size="sm"
                        className="text-xs text-violet hover:bg-violet/10"
                        onClick={() => setPromotingImp(imp)}
                      >
                        <BookMarked className="h-3.5 w-3.5 mr-1" /> Promote to
                        Knowledge
                      </Button>
                    )}

                    {imp.promotedToKnowledgeId && (
                      <Badge className="border-violet/30 text-violet bg-violet/10">
                        Promoted to Knowledge
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Evidence & Recommendation */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-glass-border/40 pt-3">
                  <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan" />
                      Recommendation
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {imp.recommendation}
                    </p>
                    {imp.expectedResult && (
                      <div className="text-[11px] text-cyan pt-1">
                        Expected Outcome: {imp.expectedResult}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
                    <span className="font-semibold text-foreground">
                      Evidence Basis
                    </span>
                    <ul className="text-muted-foreground space-y-0.5">
                      {imp.evidence.metrics.map((m, idx) => (
                        <li key={idx}>· {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Approved Action & Evaluation Details */}
                {(imp.approvedAction || imp.evaluationOutcome) && (
                  <div className="rounded-2xl border border-glass-border bg-secondary/20 p-3.5 text-xs space-y-1.5">
                    {imp.approvedAction && (
                      <div>
                        <span className="font-semibold text-foreground">
                          Approved Action:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {imp.approvedAction}
                        </span>
                      </div>
                    )}
                    {imp.evaluationOutcome && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-semibold text-foreground">
                          Evaluation Result:
                        </span>
                        <Badge
                          className={cn(
                            "capitalize text-[11px]",
                            imp.evaluationOutcome === "succeeded"
                              ? "border-success/30 text-success bg-success/10"
                              : "border-warning/30 text-warning bg-warning/10",
                          )}
                        >
                          {imp.evaluationOutcome.replace("_", " ")}
                        </Badge>
                        {imp.evaluationNotes && (
                          <span className="text-muted-foreground italic">
                            "{imp.evaluationNotes}"
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Glass>
            );
          })}
        </div>
      )}

      {/* Propose Modal */}
      {createModalOpen && (
        <Modal
          open
          onClose={() => setCreateModalOpen(false)}
          title="Propose Improvement"
        >
          <div className="space-y-4 text-xs">
            <div>
              <Label>Problem Statement</Label>
              <Textarea
                rows={2}
                placeholder="What recurring friction, dropoff or inefficiency occurred?..."
                value={prob}
                onChange={(e) => setProb(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <select
                  value={prioId}
                  onChange={(e) =>
                    setPrioId(parseInt(e.target.value, 10) as PriorityId)
                  }
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value={1} className="bg-popover">
                    #1 Founder Capability
                  </option>
                  <option value={2} className="bg-popover">
                    #2 Cashflow Infrastructure
                  </option>
                  <option value={3} className="bg-popover">
                    #3 Learning for Execution
                  </option>
                </select>
              </div>

              <div>
                <Label>Evidence Metrics (comma separated)</Label>
                <Input
                  placeholder="e.g. 3 tasks postponed, Dropoff 40%"
                  value={evidenceMetrics}
                  onChange={(e) => setEvidenceMetrics(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Concrete Recommendation</Label>
              <Textarea
                rows={2}
                placeholder="What specific adjustment or solution is recommended?..."
                value={rec}
                onChange={(e) => setRec(e.target.value)}
              />
            </div>

            <div>
              <Label>Expected Result</Label>
              <Input
                placeholder="e.g. Save 30m daily on manual data entry"
                value={expectedRes}
                onChange={(e) => setExpectedRes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>
              Submit Proposal
            </Button>
          </div>
        </Modal>
      )}

      {/* Decision Modal */}
      {decisionModalTarget && (
        <Modal
          open
          onClose={() => setDecisionModalTarget(null)}
          title="User Decision · Improvement Proposal"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-secondary/30 p-3">
              <span className="text-muted-foreground">Problem:</span>
              <div className="font-semibold text-sm mt-0.5">
                {decisionModalTarget.problemStatement}
              </div>
            </div>

            <div>
              <Label>Approved Action (Edit or refine if needed)</Label>
              <Textarea
                rows={3}
                value={approvedAct}
                onChange={(e) => setApprovedAct(e.target.value)}
              />
            </div>

            <div>
              <Label>Decision Note</Label>
              <Input
                placeholder="Optional decision context or conditions..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-between gap-2">
            <Button
              variant="danger"
              onClick={() => handleSaveDecision("reject")}
            >
              Reject
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => setDecisionModalTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveDecision("approve")}
              >
                <Check className="h-4 w-4" /> Approve Action
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Evaluation Modal */}
      {evalModalTarget && (
        <Modal
          open
          onClose={() => setEvalModalTarget(null)}
          title="Evaluate Improvement Effectiveness"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-secondary/30 p-3">
              <span className="text-muted-foreground">Action:</span>
              <div className="font-semibold text-sm mt-0.5">
                {evalModalTarget.approvedAction ||
                  evalModalTarget.recommendation}
              </div>
            </div>

            <div>
              <Label>Outcome Evaluation</Label>
              <select
                value={evalOutcome}
                onChange={(e) =>
                  setEvalOutcome(e.target.value as ImprovementOutcome)
                }
                className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
              >
                <option value="succeeded" className="bg-popover">
                  Succeeded (Achieved expected result)
                </option>
                <option value="partially_succeeded" className="bg-popover">
                  Partially Succeeded
                </option>
                <option value="failed" className="bg-popover">
                  Failed (Did not resolve issue)
                </option>
                <option value="untested" className="bg-popover">
                  Untested / Inconclusive
                </option>
              </select>
            </div>

            <div>
              <Label>Evaluation Notes & Evidence</Label>
              <Textarea
                rows={3}
                placeholder="What tangible evidence proves this succeeded or failed?..."
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setEvalModalTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEvaluation}>
              <Check className="h-4 w-4" /> Save Evaluation
            </Button>
          </div>
        </Modal>
      )}

      {/* Promotion to Knowledge Modal with Format Classification & Confirmation */}
      {proposedKnowledgeItem && (
        <KnowledgeEditorModal
          open={!!proposedKnowledgeItem}
          onClose={() => setPromotingImp(null)}
          item={proposedKnowledgeItem}
          onSave={handleConfirmPromote}
          titleOverride="Promote Learning to Yash OS Knowledge"
          confirmLabel="Confirm & Promote to Knowledge"
        />
      )}
    </div>
  );
}
