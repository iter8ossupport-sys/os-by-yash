import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import {
  addImprovement,
  addOrUpdateBottleneck,
  resolveBottleneck,
} from "@/lib/os/reviews/operations";
import { detectBottlenecks } from "@/lib/os/reviews/analytics";
import type { BottleneckSeverity, BottleneckStatus, PriorityId, ReviewBottleneck } from "@/lib/os/types";
import { Badge, Button, Empty, Glass, Input, Label, Modal, PriorityIcon, Textarea } from "@/components/os/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BottlenecksView() {
  const { state, update } = useOS();

  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [resolveModalTarget, setResolveModalTarget] = useState<ReviewBottleneck | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // New bottleneck form state
  const [newTitle, setNewTitle] = useState("");
  const [newPriorityId, setNewPriorityId] = useState<PriorityId>(1);
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState<BottleneckSeverity>("medium");
  const [newMitigation, setNewMitigation] = useState("");

  // Registry items
  const bottlenecks = useMemo(() => {
    return state.bottlenecks ?? [];
  }, [state.bottlenecks]);

  // Detected bottlenecks from history that aren't yet in the registry
  const detectedBottlenecks = useMemo(() => {
    const detected = detectBottlenecks(state.history, 14);
    const registryTitles = new Set(bottlenecks.map((b) => b.title.toLowerCase().trim()));
    return detected.filter((d) => !registryTitles.has(d.title.toLowerCase().trim()));
  }, [state.history, bottlenecks]);

  // Filtered list
  const filteredList = useMemo(() => {
    return bottlenecks.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (severityFilter !== "all" && b.severity !== severityFilter) return false;
      if (priorityFilter !== "all" && b.priorityId !== parseInt(priorityFilter, 10)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const str = `${b.title} ${b.description} ${b.mitigationPlan ?? ""}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [bottlenecks, statusFilter, severityFilter, priorityFilter, searchQuery]);

  // Stats
  const activeCount = bottlenecks.filter((b) => b.status === "active").length;
  const mitigatingCount = bottlenecks.filter((b) => b.status === "mitigating").length;
  const resolvedCount = bottlenecks.filter((b) => b.status === "resolved").length;

  const handleCreateBottleneck = () => {
    if (!newTitle.trim()) {
      toast.error("Please provide a bottleneck title.");
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    update((s) =>
      addOrUpdateBottleneck(s, {
        priorityId: newPriorityId,
        projectId: newProjectId ? newProjectId : undefined,
        title: newTitle.trim(),
        description: newDescription.trim(),
        severity: newSeverity,
        status: "active",
        firstObservedDate: todayIso,
        lastObservedDate: todayIso,
        occurrenceCount: 1,
        sourceDayDates: [todayIso],
        mitigationPlan: newMitigation.trim() || undefined,
      }),
    );

    toast.success("Bottleneck registered.");
    setAddModalOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewMitigation("");
    setNewProjectId("");
  };

  const handleConvertToImprovement = (b: ReviewBottleneck) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    update((s) =>
      addImprovement(s, {
        periodType: "daily",
        periodRef: todayIso,
        priorityId: b.priorityId,
        projectId: b.projectId,
        problemStatement: `Bottleneck: ${b.title}`,
        evidence: {
          metrics: [`Observed ${b.occurrenceCount} times in execution history`, `Severity: ${b.severity}`],
          dayDates: b.sourceDayDates,
        },
        recommendation: b.mitigationPlan || "Formulate concrete process change to remove blockage.",
        status: "proposed",
      }),
    );
    toast.success(`Converted "${b.title}" into Improvement proposal.`);
  };

  const handleResolve = () => {
    if (!resolveModalTarget || !resolutionNotes.trim()) {
      toast.error("Please enter resolution notes.");
      return;
    }

    update((s) => resolveBottleneck(s, resolveModalTarget.id, resolutionNotes));
    toast.success("Bottleneck marked as resolved.");
    setResolveModalTarget(null);
    setResolutionNotes("");
  };

  const handleAdoptDetected = (item: { title: string; priorityId: PriorityId; occurrences: number; days: string[] }) => {
    const firstDate = item.days[0] ?? new Date().toISOString().slice(0, 10);
    const lastDate = item.days[item.days.length - 1] ?? firstDate;

    update((s) =>
      addOrUpdateBottleneck(s, {
        priorityId: item.priorityId,
        title: item.title,
        description: `Detected from recurring unfinished tasks in history (${item.occurrences} occurrences).`,
        severity: item.occurrences >= 3 ? "critical" : "medium",
        status: "active",
        firstObservedDate: firstDate,
        lastObservedDate: lastDate,
        occurrenceCount: item.occurrences,
        sourceDayDates: item.days,
        mitigationPlan: "Deconstruct into verifiable sub-45m execution steps.",
      }),
    );

    toast.success(`Registered "${item.title}" into persistent Bottleneck Registry.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display">Persistent Bottleneck Registry</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bottlenecks persist across review periods until validated as resolved
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Register Bottleneck
          </Button>
        </div>
      </Glass>

      {/* Auto-Detected Bottlenecks Banner (if found in recent history) */}
      {detectedBottlenecks.length > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-warning text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Auto-Detected Friction Patterns ({detectedBottlenecks.length})
          </div>
          <p className="text-xs text-muted-foreground">
            The system detected tasks that stalled across multiple review days in the last 14 days. Click to adopt them into the registry.
          </p>

          <div className="space-y-2">
            {detectedBottlenecks.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-secondary/50 border border-glass-border p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-warning">#{d.priorityId}</span>
                  <span className="font-medium text-foreground">{d.title}</span>
                  <Badge className="border-warning/30 text-warning bg-warning/10">
                    Stalled across {d.occurrences} days
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-cyan hover:bg-cyan/10"
                  onClick={() => handleAdoptDetected(d)}
                >
                  Adopt to Registry
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">Active Blockers</div>
          <div className="font-display text-2xl font-bold mt-1 text-warning">{activeCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Requiring active mitigation</div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">Mitigating</div>
          <div className="font-display text-2xl font-bold mt-1 text-cyan">{mitigatingCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Actions underway in plans</div>
        </div>
        <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4">
          <div className="text-xs text-muted-foreground">Resolved Bottlenecks</div>
          <div className="font-display text-2xl font-bold mt-1 text-success">{resolvedCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Successfully eliminated</div>
        </div>
      </div>

      {/* Filter Bar */}
      <Glass className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex rounded-lg bg-secondary/60 p-1">
            {["active", "mitigating", "resolved", "all"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium capitalize transition-all",
                  statusFilter === st ? "bg-primary text-primary-foreground glow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-secondary/50 px-2.5 text-xs text-foreground outline-none"
          >
            <option value="all" className="bg-popover">All Severities</option>
            <option value="critical" className="bg-popover">Critical</option>
            <option value="high" className="bg-popover">High</option>
            <option value="medium" className="bg-popover">Medium</option>
            <option value="low" className="bg-popover">Low</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-secondary/50 px-2.5 text-xs text-foreground outline-none"
          >
            <option value="all" className="bg-popover">All Priorities</option>
            <option value="1" className="bg-popover">Priority #1</option>
            <option value="2" className="bg-popover">Priority #2</option>
            <option value="3" className="bg-popover">Priority #3</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search bottlenecks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 rounded-lg border border-input bg-secondary/50 text-xs text-foreground outline-none w-48"
          />
        </div>
      </Glass>

      {/* Bottlenecks List */}
      {filteredList.length === 0 ? (
        <Empty title="No bottlenecks match filter">
          {bottlenecks.length === 0
            ? "No bottlenecks currently registered. Register one or execute daily tasks to auto-detect friction."
            : "Try adjusting your status or severity filter."}
        </Empty>
      ) : (
        <div className="space-y-3">
          {filteredList.map((b) => {
            const isCritical = b.severity === "critical";
            const isHigh = b.severity === "high";

            return (
              <Glass key={b.id} className="p-5 space-y-3 transition-all hover:bg-secondary/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <PriorityIcon id={b.priorityId} className="h-8 w-8 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground">{b.title}</span>
                        <Badge
                          className={cn(
                            "capitalize text-[11px]",
                            isCritical
                              ? "border-destructive/40 bg-destructive/15 text-destructive"
                              : isHigh
                              ? "border-warning/40 bg-warning/15 text-warning"
                              : "border-cyan/30 text-cyan bg-cyan/10",
                          )}
                        >
                          {b.severity} severity
                        </Badge>
                        <Badge
                          className={cn(
                            "capitalize text-[11px]",
                            b.status === "resolved"
                              ? "border-success/30 text-success bg-success/10"
                              : b.status === "mitigating"
                              ? "border-cyan/30 text-cyan bg-cyan/10"
                              : "border-warning/30 text-warning bg-warning/10",
                          )}
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="glass"
                      size="sm"
                      className="text-xs text-cyan hover:bg-cyan/15 gap-1"
                      onClick={() => handleConvertToImprovement(b)}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Propose Action
                    </Button>
                    {b.status !== "resolved" && (
                      <Button
                        variant="glass"
                        size="sm"
                        className="text-xs text-success hover:bg-success/15"
                        onClick={() => setResolveModalTarget(b)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mitigation & Evidence Info */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-glass-border/40 pt-3">
                  <div className="rounded-xl bg-secondary/30 p-2.5">
                    <span className="text-muted-foreground block text-[11px] mb-0.5">
                      Mitigation Strategy:
                    </span>
                    <span className="text-foreground">{b.mitigationPlan || "None documented"}</span>
                  </div>

                  <div className="rounded-xl bg-secondary/30 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Occurred: <strong>{b.occurrenceCount}×</strong></span>
                      <span>Last seen: {b.lastObservedDate}</span>
                    </div>
                    {b.status === "resolved" && b.resolutionNotes && (
                      <div className="text-[11px] text-success mt-1">
                        Resolved ({b.resolvedAt}): "{b.resolutionNotes}"
                      </div>
                    )}
                  </div>
                </div>
              </Glass>
            );
          })}
        </div>
      )}

      {/* Register Bottleneck Modal */}
      {addModalOpen && (
        <Modal open onClose={() => setAddModalOpen(false)} title="Register Bottleneck">
          <div className="space-y-4 text-xs">
            <div>
              <Label>Bottleneck Title</Label>
              <Input
                placeholder="e.g. Stripe webhook verification failure on localhost"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <select
                  value={newPriorityId}
                  onChange={(e) => setNewPriorityId(parseInt(e.target.value, 10) as PriorityId)}
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value={1} className="bg-popover">#1 Founder Capability</option>
                  <option value={2} className="bg-popover">#2 Cashflow Infrastructure</option>
                  <option value={3} className="bg-popover">#3 Learning for Execution</option>
                </select>
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as BottleneckSeverity)}
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value="low" className="bg-popover">Low</option>
                  <option value="medium" className="bg-popover">Medium</option>
                  <option value="high" className="bg-popover">High</option>
                  <option value="critical" className="bg-popover">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Problem Description & Impact</Label>
              <Textarea
                rows={3}
                placeholder="Describe how this blocker manifests during execution and what tasks it stalls..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div>
              <Label>Initial Mitigation Plan</Label>
              <Input
                placeholder="e.g. Use Cloudflare Tunnel or Mock webhook worker"
                value={newMitigation}
                onChange={(e) => setNewMitigation(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateBottleneck}>
              Save Bottleneck
            </Button>
          </div>
        </Modal>
      )}

      {/* Resolve Bottleneck Modal */}
      {resolveModalTarget && (
        <Modal
          open
          onClose={() => setResolveModalTarget(null)}
          title={`Resolve Bottleneck · ${resolveModalTarget.title}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Documenting how you resolved this bottleneck creates permanent organizational memory and improves future planning.
            </p>

            <div>
              <Label>Resolution Notes & Verification</Label>
              <Textarea
                rows={4}
                placeholder="How was this issue resolved? What proof verifies it will not recur?..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setResolveModalTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleResolve}>
              <Check className="h-4 w-4" /> Confirm Resolution
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
