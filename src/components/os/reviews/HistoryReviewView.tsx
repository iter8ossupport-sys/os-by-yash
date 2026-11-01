import { useMemo, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  Layers,
  Search,
  SlidersHorizontal,
  Trash2,
  Zap,
} from "lucide-react";
import { useOS, fmtMin } from "@/lib/os/store";
import { calculateDaySummary, calculatePeriodSummary } from "@/lib/os/reviews/analytics";
import { deletePeriodReview } from "@/lib/os/reviews/operations";
import { exportPeriodToCSV } from "@/lib/os/reviews/exportService";
import type { DayRecord, PeriodReviewRecord, PriorityId } from "@/lib/os/types";
import { Badge, Button, Empty, Glass, Input, Label, Modal, PriorityIcon, Select } from "@/components/os/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HistoryReviewViewProps {
  onSelectDate: (date: string) => void;
}

type RangePreset = "all" | "7" | "14" | "30" | "90" | "custom";

export function HistoryReviewView({ onSelectDate }: HistoryReviewViewProps) {
  const { state, update } = useOS();

  const [activeTab, setActiveTab] = useState<"daily" | "periods">("daily");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [rangePreset, setRangePreset] = useState<RangePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<DayRecord | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PeriodReviewRecord | null>(null);

  // Side-by-side comparison state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareDateA, setCompareDateA] = useState<string>(() => state.history[0]?.date ?? "");
  const [compareDateB, setCompareDateB] = useState<string>(() => state.history[1]?.date ?? "");

  // Filter day records
  const filteredDays = useMemo(() => {
    let list = [...state.history].sort((a, b) => b.date.localeCompare(a.date));

    // Date Range Presets
    if (rangePreset !== "all") {
      if (rangePreset === "custom") {
        if (customStart) list = list.filter((r) => r.date >= customStart);
        if (customEnd) list = list.filter((r) => r.date <= customEnd);
      } else {
        const days = parseInt(rangePreset, 10);
        const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
        list = list.filter((r) => r.date >= cutoff);
      }
    }

    // State Filter
    if (stateFilter !== "all") {
      if (stateFilter === "corrected") {
        list = list.filter((r) => r.state === "corrected" || (r.auditHistory && r.auditHistory.length > 0));
      } else if (stateFilter === "manual") {
        list = list.filter((r) => r.source === "manual");
      } else if (stateFilter === "finalized") {
        list = list.filter((r) => r.state === "finalized");
      }
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const outputsText = (r.outputs ?? []).map((o) => `${o.title} ${o.text}`).join(" ");
        const unfText = (r.unfinished ?? []).join(" ");
        const searchScope = `${r.date} ${r.learning} ${outputsText} ${unfText}`.toLowerCase();
        return searchScope.includes(q);
      });
    }

    return list;
  }, [state.history, rangePreset, customStart, customEnd, stateFilter, searchQuery]);

  // Period Snapshots
  const periodSnapshots = useMemo(() => {
    return (state.periodReviews ?? []).sort((a, b) => b.finalizedAt.localeCompare(a.finalizedAt));
  }, [state.periodReviews]);

  // CSV Export for filtered days
  const handleExportFilteredCSV = () => {
    if (filteredDays.length === 0) {
      toast.error("No historical records to export.");
      return;
    }
    const start = filteredDays[filteredDays.length - 1]?.date ?? "";
    const end = filteredDays[0]?.date ?? "";
    const sum = calculatePeriodSummary(filteredDays, "weekly", `history-${rangePreset}`, start, end);
    exportPeriodToCSV(sum, filteredDays);
    toast.success("CSV export downloaded.");
  };

  // Comparison summaries & records
  const dayRecordA = useMemo(() => state.history.find((h) => h.date === compareDateA), [state.history, compareDateA]);
  const dayRecordB = useMemo(() => state.history.find((h) => h.date === compareDateB), [state.history, compareDateB]);

  const daySummaryA = useMemo(() => {
    return dayRecordA ? calculateDaySummary(dayRecordA) : null;
  }, [dayRecordA]);

  const daySummaryB = useMemo(() => {
    return dayRecordB ? calculateDaySummary(dayRecordB) : null;
  }, [dayRecordB]);

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <Glass className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "daily" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("daily")}
            className="text-xs"
          >
            Daily Records ({state.history.length})
          </Button>
          <Button
            variant={activeTab === "periods" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("periods")}
            className="text-xs"
          >
            Finalized Period Snapshots ({periodSnapshots.length})
          </Button>
        </div>

        {activeTab === "daily" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary/40 p-0.5 rounded-lg border border-glass-border">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2 py-0.5 text-xs rounded transition-all",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "px-2 py-0.5 text-xs rounded transition-all",
                  viewMode === "timeline"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Timeline
              </button>
            </div>

            {/* Compare Button */}
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                if (state.history.length < 2) {
                  toast.info("Need at least 2 historical review records to run side-by-side comparison.");
                  return;
                }
                setCompareModalOpen(true);
              }}
              className="h-8 text-xs gap-1 text-cyan"
            >
              <SlidersHorizontal className="h-3 w-3" /> Compare
            </Button>

            {/* Export CSV Button */}
            <Button
              variant="glass"
              size="sm"
              onClick={handleExportFilteredCSV}
              className="h-8 text-xs gap-1"
            >
              <Download className="h-3 w-3" /> CSV
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 rounded-lg border border-input bg-secondary/50 text-xs text-foreground outline-none w-36 focus:w-48 transition-all"
              />
            </div>

            {/* Presets */}
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as RangePreset)}
              className="h-8 rounded-lg border border-input bg-secondary/50 px-2 text-xs text-foreground outline-none"
            >
              <option value="all" className="bg-popover">All Time</option>
              <option value="7" className="bg-popover">Last 7d</option>
              <option value="14" className="bg-popover">Last 14d</option>
              <option value="30" className="bg-popover">Last 30d</option>
              <option value="90" className="bg-popover">Last 90d</option>
              <option value="custom" className="bg-popover">Custom...</option>
            </select>

            {/* State */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-secondary/50 px-2 text-xs text-foreground outline-none"
            >
              <option value="all" className="bg-popover">All States</option>
              <option value="finalized" className="bg-popover">Finalized</option>
              <option value="corrected" className="bg-popover">Corrected</option>
              <option value="manual" className="bg-popover">Manual</option>
            </select>
          </div>
        )}
      </Glass>

      {/* Custom Date Range Picker (when preset is custom) */}
      {activeTab === "daily" && rangePreset === "custom" && (
        <Glass className="p-4 flex flex-wrap items-center gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs">
            <Label className="mb-0">Start Date:</Label>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Label className="mb-0">End Date:</Label>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
          {(customStart || customEnd) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setCustomStart("");
                setCustomEnd("");
              }}
            >
              Clear
            </Button>
          )}
        </Glass>
      )}

      {/* DAILY RECORDS TAB */}
      {activeTab === "daily" && (
        filteredDays.length === 0 ? (
          <Empty title="No review records match criteria">
            {state.history.length === 0
              ? "Complete your first Daily Closeout in Execute to create a permanent review record."
              : "Try adjusting your search query or date range filters."}
          </Empty>
        ) : viewMode === "timeline" ? (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-cyan before:to-violet">
            {filteredDays.map((rec) => {
              const totalMin =
                (rec.actualMin[1] ?? 0) + (rec.actualMin[2] ?? 0) + (rec.actualMin[3] ?? 0);
              const totalHrs = Math.round((totalMin / 60) * 10) / 10;
              const hasCorrection = Boolean(rec.auditHistory && rec.auditHistory.length > 0);

              return (
                <div key={rec.date} className="relative group">
                  <div className="absolute -left-[1.625rem] top-2 h-3.5 w-3.5 rounded-full border-2 border-background bg-cyan shadow-sm transition-transform group-hover:scale-125" />
                  <Glass
                    className="p-4 transition-all hover:bg-secondary/40 cursor-pointer"
                    onClick={() => setSelectedRecord(rec)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-semibold text-base text-foreground">
                          {rec.date}
                        </span>
                        <Badge className="font-mono text-xs">{totalHrs}h</Badge>
                        {hasCorrection && (
                          <Badge className="border-cyan/40 bg-cyan/15 text-cyan text-[10px]">
                            Corrected
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{rec.dayType ?? "Standard"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{rec.tasksDone}/{rec.tasksPlanned} tasks</span>
                        <span className="text-success font-medium">{rec.outcomesAchieved?.length ?? 0}/3 outcomes</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-cyan"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDate(rec.date);
                          }}
                        >
                          Inspect in Daily <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>

                    {rec.learning && (
                      <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
                        "{rec.learning}"
                      </p>
                    )}

                    {rec.outputs && rec.outputs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rec.outputs.map((o, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            #{o.priorityId} {o.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </Glass>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDays.map((rec) => {
              const totalMin =
                (rec.actualMin[1] ?? 0) + (rec.actualMin[2] ?? 0) + (rec.actualMin[3] ?? 0);
              const totalHrs = Math.round((totalMin / 60) * 10) / 10;
              const hasCorrection = Boolean(rec.auditHistory && rec.auditHistory.length > 0);

              return (
                <Glass
                  key={rec.date}
                  className="p-4 transition-all hover:bg-secondary/40 cursor-pointer"
                  onClick={() => setSelectedRecord(rec)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold text-base text-foreground">
                        {rec.date}
                      </span>
                      {hasCorrection ? (
                        <Badge className="border-cyan/40 bg-cyan/15 text-cyan">
                          Corrected ({rec.auditHistory!.length})
                        </Badge>
                      ) : (
                        <Badge className="border-success/30 text-success bg-success/10">
                          Finalized
                        </Badge>
                      )}
                      {rec.source === "manual" && (
                        <Badge className="border-warning/30 text-warning bg-warning/10">
                          Manual
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {rec.dayType ?? "Standard"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold text-foreground">{totalHrs}h logged</span>
                      <span className="text-muted-foreground">
                        {rec.tasksDone}/{rec.tasksPlanned} tasks
                      </span>
                      <span className="text-muted-foreground">
                        Outcomes:{" "}
                        <strong className="text-success font-medium">
                          {rec.outcomesAchieved?.length ?? 0}/3
                        </strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-cyan"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(rec.date);
                        }}
                      >
                        Inspect in Daily <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>

                  {rec.outputs && rec.outputs.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {rec.outputs.slice(0, 3).map((o, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground truncate max-w-xs"
                        >
                          #{o.priorityId} {o.title}
                        </span>
                      ))}
                      {rec.outputs.length > 3 && (
                        <span className="text-[11px] text-muted-foreground self-center">
                          +{rec.outputs.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {rec.learning && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-1 italic">
                      "{rec.learning}"
                    </p>
                  )}
                </Glass>
              );
            })}
          </div>
        )
      )}

      {/* FINALIZED PERIOD SNAPSHOTS TAB */}
      {activeTab === "periods" && (
        periodSnapshots.length === 0 ? (
          <Empty title="No finalized period snapshots yet">
            Navigate to the Weekly or Monthly tab and click "Finalize Week / Month" to lock an immutable period snapshot.
          </Empty>
        ) : (
          <div className="space-y-3">
            {periodSnapshots.map((snap) => (
              <Glass
                key={snap.id}
                className="p-5 space-y-3 transition-all hover:bg-secondary/40 cursor-pointer"
                onClick={() => setSelectedSnapshot(snap)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-lg text-foreground">
                      {snap.id}
                    </span>
                    <Badge className="capitalize border-primary/30 text-primary bg-primary/10">
                      {snap.type} Review
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {snap.startDate} to {snap.endDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-foreground">
                      {snap.totalActualHours}h actual
                    </span>
                    <span className="text-muted-foreground">
                      Tasks: {snap.taskCompletionRate}%
                    </span>
                    <span className="text-success font-medium">
                      Outcomes: {snap.outcomesRate}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        update((s) => deletePeriodReview(s, snap.id));
                        toast.success(`Deleted snapshot ${snap.id}`);
                      }}
                      aria-label="Delete Snapshot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {snap.executiveSummary}
                </p>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-glass-border/40 pt-2">
                  <span>Finalized at: {new Date(snap.finalizedAt).toLocaleDateString()}</span>
                  <span>{snap.daysIncluded.length} days recorded</span>
                </div>
              </Glass>
            ))}
          </div>
        )
      )}

      {/* Day Detail Modal */}
      {selectedRecord && (
        <Modal
          open
          onClose={() => setSelectedRecord(null)}
          title={`Day Detail · ${selectedRecord.date}`}
          wide
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">P1 Time</span>
                <div className="font-semibold text-sm mt-0.5">
                  {fmtMin(selectedRecord.actualMin[1] ?? 0)}
                </div>
              </div>
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">P2 Time</span>
                <div className="font-semibold text-sm mt-0.5">
                  {fmtMin(selectedRecord.actualMin[2] ?? 0)}
                </div>
              </div>
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">P3 Time</span>
                <div className="font-semibold text-sm mt-0.5">
                  {fmtMin(selectedRecord.actualMin[3] ?? 0)}
                </div>
              </div>
              <div className="rounded-xl bg-secondary/30 p-3">
                <span className="text-muted-foreground">Outcomes</span>
                <div className="font-semibold text-sm text-success mt-0.5">
                  {selectedRecord.outcomesAchieved?.length ?? 0} / 3
                </div>
              </div>
            </div>

            <div>
              <Label>Recorded Deliverables & Outputs ({selectedRecord.outputs?.length ?? 0})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedRecord.outputs?.map((o, idx) => (
                  <div key={idx} className="rounded-xl border border-glass-border bg-secondary/20 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">#{o.priorityId} {o.title}</span>
                      {o.workstream && <Badge className="text-[10px]">Workstream {o.workstream}</Badge>}
                    </div>
                    <p className="text-muted-foreground mt-0.5">{o.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Operational Learning</Label>
              <div className="rounded-xl border border-glass-border bg-secondary/20 p-3 text-foreground leading-relaxed">
                {selectedRecord.learning || "None logged."}
              </div>
            </div>

            {selectedRecord.auditHistory && selectedRecord.auditHistory.length > 0 && (
              <div>
                <Label>Audit Correction History</Label>
                <div className="space-y-1.5">
                  {selectedRecord.auditHistory.map((a) => (
                    <div key={a.id} className="rounded-lg bg-secondary/30 p-2 text-[11px] text-muted-foreground">
                      <span>Field "{a.field}" changed from <strong>{String(a.oldValue)}</strong> to <strong>{String(a.newValue)}</strong></span>
                      <div className="italic">Reason: {a.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-between gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSelectDate(selectedRecord.date);
                setSelectedRecord(null);
              }}
            >
              Open in Daily Review
            </Button>
            <Button onClick={() => setSelectedRecord(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Period Snapshot Detail Modal */}
      {selectedSnapshot && (
        <Modal
          open
          onClose={() => setSelectedSnapshot(null)}
          title={`Snapshot · ${selectedSnapshot.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-secondary/30 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{selectedSnapshot.id} ({selectedSnapshot.type})</span>
                <span className="text-muted-foreground">{selectedSnapshot.startDate} to {selectedSnapshot.endDate}</span>
              </div>
              <div className="text-muted-foreground">
                {selectedSnapshot.totalActualHours}h actual · {selectedSnapshot.taskCompletionRate}% task rate · {selectedSnapshot.outcomesRate}% outcome rate
              </div>
            </div>

            <div>
              <Label>Executive Summary</Label>
              <div className="rounded-xl border border-glass-border bg-secondary/20 p-3 text-foreground leading-relaxed">
                {selectedSnapshot.executiveSummary}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-glass-border bg-secondary/20 p-3">
                <span className="text-muted-foreground">P2 Workstream A</span>
                <div className="font-semibold mt-1">{selectedSnapshot.p2HoursWorkstreamA}h ({selectedSnapshot.p2OutputsWorkstreamA} outputs)</div>
              </div>
              <div className="rounded-xl border border-glass-border bg-secondary/20 p-3">
                <span className="text-muted-foreground">P2 Workstream B</span>
                <div className="font-semibold mt-1">{selectedSnapshot.p2HoursWorkstreamB}h ({selectedSnapshot.p2OutputsWorkstreamB} outputs)</div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setSelectedSnapshot(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Side-by-Side Day Comparison Modal */}
      {compareModalOpen && (
        <Modal
          open
          onClose={() => setCompareModalOpen(false)}
          title="Side-by-Side Review Comparison"
        >
          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Compare actual execution metrics and reflections between any two review days.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Baseline Date (Day A)</Label>
                <select
                  value={compareDateA}
                  onChange={(e) => setCompareDateA(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-3 text-xs text-foreground outline-none"
                >
                  {state.history.map((h) => (
                    <option key={h.date} value={h.date} className="bg-popover">
                      {h.date} ({Math.round((((h.actualMin[1] ?? 0) + (h.actualMin[2] ?? 0) + (h.actualMin[3] ?? 0)) / 60) * 10) / 10}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Comparison Date (Day B)</Label>
                <select
                  value={compareDateB}
                  onChange={(e) => setCompareDateB(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-3 text-xs text-foreground outline-none"
                >
                  {state.history.map((h) => (
                    <option key={h.date} value={h.date} className="bg-popover">
                      {h.date} ({Math.round((((h.actualMin[1] ?? 0) + (h.actualMin[2] ?? 0) + (h.actualMin[3] ?? 0)) / 60) * 10) / 10}h)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {daySummaryA && daySummaryB && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
                    <div className="font-semibold text-sm text-foreground">{compareDateA}</div>
                    <div className="font-display text-xl font-bold mt-1 text-primary">
                      {daySummaryA.totalActualHours}h
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {daySummaryA.tasksDone}/{daySummaryA.tasksPlanned} tasks · {daySummaryA.outcomesAchieved}/3 outcomes
                    </div>
                  </div>

                  <div className="rounded-xl border border-glass-border bg-secondary/30 p-3">
                    <div className="font-semibold text-sm text-foreground">{compareDateB}</div>
                    <div className="font-display text-xl font-bold mt-1 text-cyan">
                      {daySummaryB.totalActualHours}h
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {daySummaryB.tasksDone}/{daySummaryB.tasksPlanned} tasks · {daySummaryB.outcomesAchieved}/3 outcomes
                    </div>
                  </div>
                </div>

                {/* Delta comparison summary */}
                <div className="rounded-xl border border-glass-border bg-secondary/20 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Actual Invested Hours Delta:</span>
                    <span
                      className={cn(
                        "font-semibold font-mono",
                        daySummaryB.totalActualHours - daySummaryA.totalActualHours >= 0
                          ? "text-success"
                          : "text-warning",
                      )}
                    >
                      {daySummaryB.totalActualHours - daySummaryA.totalActualHours >= 0 ? "+" : ""}
                      {Math.round((daySummaryB.totalActualHours - daySummaryA.totalActualHours) * 10) / 10}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Task Completion Rate Delta:</span>
                    <span
                      className={cn(
                        "font-semibold font-mono",
                        daySummaryB.taskCompletionRate - daySummaryA.taskCompletionRate >= 0
                          ? "text-success"
                          : "text-warning",
                      )}
                    >
                      {daySummaryB.taskCompletionRate - daySummaryA.taskCompletionRate >= 0 ? "+" : ""}
                      {daySummaryB.taskCompletionRate - daySummaryA.taskCompletionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Outcomes Achieved Delta:</span>
                    <span className="font-semibold font-mono text-foreground">
                      {daySummaryB.outcomesAchieved - daySummaryA.outcomesAchieved >= 0 ? "+" : ""}
                      {daySummaryB.outcomesAchieved - daySummaryA.outcomesAchieved}
                    </span>
                  </div>
                </div>

                {/* Reflections side-by-side */}
                <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-foreground pt-1">
                  <div className="rounded-xl bg-secondary/20 p-2.5">
                    <span className="font-semibold text-foreground block mb-0.5">Day A Takeaway:</span>
                    {dayRecordA?.learning || "No reflection"}
                  </div>
                  <div className="rounded-xl bg-secondary/20 p-2.5">
                    <span className="font-semibold text-foreground block mb-0.5">Day B Takeaway:</span>
                    {dayRecordB?.learning || "No reflection"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setCompareModalOpen(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
