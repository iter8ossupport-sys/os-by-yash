import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  Calculator,
  Check,
  Download,
  FolderDown,
  Layers,
  Layout,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import {
  addCustomMetric,
  deleteCustomMetric,
  deleteCustomView,
  saveCustomView,
  updateAlertSettings,
  updateReflectionTemplates,
  updateReviewSettings,
} from "@/lib/os/reviews/operations";
import { calculatePeriodSummary, evaluateCustomMetric } from "@/lib/os/reviews/analytics";
import { demoReviewDays, defaultReviewSettings } from "@/lib/os/reviews/fixtures";
import type {
  AlertSettings,
  CustomMetricDefinition,
  CustomReviewView,
  PriorityId,
  ReflectionTemplate,
  ReviewSettings,
} from "@/lib/os/types";
import { Badge, Button, Input, Label, Modal } from "@/components/os/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const ALL_CARDS = [
  { id: "kpi_ribbon", label: "Executive KPI Ribbon" },
  { id: "realism_chart", label: "Workload Realism vs. Actual Hours" },
  { id: "outcomes_ratio", label: "Priority Distribution Ratio Chart" },
  { id: "p2_split", label: "Priority 2 Workstream A / B Separation" },
  { id: "bottlenecks", label: "Persistent Bottleneck Registry" },
  { id: "improvements", label: "Improvement Intelligence Funnel" },
];

export function ReviewSettingsModal({ open, onClose }: ReviewSettingsModalProps) {
  const { state, update } = useOS();

  const settings: ReviewSettings = state.reviewSettings ?? defaultReviewSettings;

  const [activeTab, setActiveTab] = useState<
    "general" | "views" | "metrics" | "questions" | "alerts" | "data"
  >("general");

  // --- Saved View & Layout State ---
  const [viewName, setViewName] = useState("");
  const [viewPriorityFilter, setViewPriorityFilter] = useState<string>("");
  const [viewPreset, setViewPreset] = useState<"last_7_days" | "last_14_days" | "last_30_days">("last_14_days");
  const [selectedCards, setSelectedCards] = useState<string[]>([
    "kpi_ribbon",
    "realism_chart",
    "outcomes_ratio",
    "p2_split",
  ]);
  const [chartPref, setChartPref] = useState<"bar" | "distribution" | "stacked">("bar");

  // --- Custom Metric Builder State ---
  const [metricName, setMetricName] = useState("");
  const [metricDesc, setMetricDesc] = useState("");
  const [metricFormula, setMetricFormula] = useState<CustomMetricDefinition["formula"]>("yield_per_hour");
  const [metricNum, setMetricNum] = useState<CustomMetricDefinition["numerator"]>("outcomesAchieved");
  const [metricDen, setMetricDen] = useState<CustomMetricDefinition["denominator"]>("totalActualHours");
  const [metricUnit, setMetricUnit] = useState<CustomMetricDefinition["unit"]>("ratio");
  const [metricTarget, setMetricTarget] = useState<number>(1);
  const [metricPriority, setMetricPriority] = useState<string>("");

  // --- Reflection Questions State ---
  const [questionCadence, setQuestionCadence] = useState<"daily" | "weekly" | "monthly">("daily");
  const [newQuestionInput, setNewQuestionInput] = useState("");

  const activeTemplates: ReflectionTemplate = settings.reflectionTemplates ?? defaultReviewSettings.reflectionTemplates!;

  // Trailing summary for live test preview of custom metrics
  const trailing14Summary = useMemo(() => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    return calculatePeriodSummary(state.history, "custom", "trailing-14", start, end);
  }, [state.history]);

  // Live preview metric evaluation
  const previewEvaluation = useMemo(() => {
    const mockMetric: CustomMetricDefinition = {
      id: "preview",
      name: metricName || "Preview Metric",
      description: metricDesc,
      formula: metricFormula,
      numerator: metricNum,
      denominator: metricDen,
      unit: metricUnit,
      targetValue: metricTarget,
      priorityFilter: metricPriority ? (parseInt(metricPriority, 10) as PriorityId) : undefined,
    };
    return evaluateCustomMetric(mockMetric, trailing14Summary);
  }, [metricName, metricDesc, metricFormula, metricNum, metricDen, metricUnit, metricTarget, metricPriority, trailing14Summary]);

  const handleUpdate = (patch: Partial<ReviewSettings>) => {
    update((s) => updateReviewSettings(s, patch));
    toast.success("Settings updated.");
  };

  const handleCreateView = () => {
    if (!viewName.trim()) {
      toast.error("Please enter a name for the view.");
      return;
    }

    const newView: CustomReviewView = {
      id: `view-${Math.random().toString(36).slice(2, 8)}`,
      name: viewName.trim(),
      priorityFilter: viewPriorityFilter ? (parseInt(viewPriorityFilter, 10) as PriorityId) : undefined,
      dateRangePreset: viewPreset,
      selectedMetricCards: selectedCards,
      chartTypePreference: chartPref,
    };

    update((s) => saveCustomView(s, newView));
    toast.success(`Custom view "${viewName}" saved.`);
    setViewName("");
  };

  const handleCreateMetric = () => {
    if (!metricName.trim()) {
      toast.error("Please enter a metric name.");
      return;
    }

    const newMetric: CustomMetricDefinition = {
      id: `metric-${Math.random().toString(36).slice(2, 8)}`,
      name: metricName.trim(),
      description: metricDesc.trim(),
      formula: metricFormula,
      numerator: metricNum,
      denominator: metricDen,
      unit: metricUnit,
      targetValue: metricTarget,
      priorityFilter: metricPriority ? (parseInt(metricPriority, 10) as PriorityId) : undefined,
    };

    update((s) => addCustomMetric(s, newMetric));
    toast.success(`Custom metric "${metricName}" created.`);
    setMetricName("");
    setMetricDesc("");
  };

  const handleAddQuestion = () => {
    if (!newQuestionInput.trim()) return;
    const currentList = activeTemplates[questionCadence] ?? [];
    const updated = {
      ...activeTemplates,
      [questionCadence]: [...currentList, newQuestionInput.trim()],
    };
    update((s) => updateReflectionTemplates(s, updated));
    setNewQuestionInput("");
    toast.success(`Added question to ${questionCadence} review.`);
  };

  const handleDeleteQuestion = (idx: number) => {
    const currentList = activeTemplates[questionCadence] ?? [];
    const updated = {
      ...activeTemplates,
      [questionCadence]: currentList.filter((_, i) => i !== idx),
    };
    update((s) => updateReflectionTemplates(s, updated));
    toast.success("Question removed.");
  };

  const handleResetQuestions = () => {
    if (confirm("Reset reflection questions to Yash OS default prompts?")) {
      update((s) => updateReflectionTemplates(s, defaultReviewSettings.reflectionTemplates!));
      toast.success("Questions reset to defaults.");
    }
  };

  const handleExportFullBackup = () => {
    const payload = {
      schemaVersion: "2.0",
      timestamp: new Date().toISOString(),
      history: state.history,
      bottlenecks: state.bottlenecks ?? [],
      improvements: state.improvements ?? [],
      periodReviews: state.periodReviews ?? [],
      forecastHistory: state.forecastHistory ?? [],
      reviewSettings: settings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yash-os-reviews-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    toast.success("Reviews backup downloaded.");
  };

  const handleLoadDemoFixtures = () => {
    if (confirm("Load 14 days of realistic demonstration review records? Your existing history will be merged safely.")) {
      const existingDates = new Set(state.history.map((h) => h.date));
      const newFixtures = demoReviewDays.filter((d) => !existingDates.has(d.date));

      update((s) => ({
        ...s,
        history: [...newFixtures, ...s.history].sort((a, b) => b.date.localeCompare(a.date)),
      }));

      toast.success(`Loaded ${newFixtures.length} demonstration review day records.`);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Reviews Configuration & Customization" wide>
      <div className="space-y-5 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-glass-border pb-2 gap-1.5 overflow-x-auto">
          <Button
            variant={activeTab === "general" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("general")}
            className="text-xs shrink-0"
          >
            General
          </Button>
          <Button
            variant={activeTab === "views" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("views")}
            className="text-xs shrink-0"
          >
            Layouts & Views ({settings.customViews?.length ?? 0})
          </Button>
          <Button
            variant={activeTab === "metrics" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("metrics")}
            className="text-xs shrink-0"
          >
            Custom Metrics ({settings.customMetrics?.length ?? 0})
          </Button>
          <Button
            variant={activeTab === "questions" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("questions")}
            className="text-xs shrink-0"
          >
            Reflection Prompts
          </Button>
          <Button
            variant={activeTab === "alerts" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("alerts")}
            className="text-xs shrink-0"
          >
            Alert Controls
          </Button>
          <Button
            variant={activeTab === "data" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("data")}
            className="text-xs shrink-0"
          >
            Data & Backup
          </Button>
        </div>

        {/* 1. GENERAL PREFERENCES TAB */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Review Period</Label>
                <select
                  value={settings.defaultPeriod}
                  onChange={(e) =>
                    handleUpdate({
                      defaultPeriod: e.target.value as ReviewSettings["defaultPeriod"],
                    })
                  }
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value="daily" className="bg-popover">Daily Review</option>
                  <option value="weekly" className="bg-popover">Weekly Review</option>
                  <option value="monthly" className="bg-popover">Monthly Review</option>
                  <option value="history" className="bg-popover">History</option>
                </select>
              </div>

              <div>
                <Label>Calendar Week Start Day</Label>
                <select
                  value={settings.weekStartDay}
                  onChange={(e) =>
                    handleUpdate({
                      weekStartDay: parseInt(e.target.value, 10) as 1 | 0,
                    })
                  }
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value={1} className="bg-popover">Monday (ISO 8601 Standard)</option>
                  <option value={0} className="bg-popover">Sunday</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    Priority 2 Workstream Split Tracking
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    Maintains isolated tracking for Cashflow Generation (A) vs Fintech Product (B).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.trackP2WorkstreamSplits}
                  onChange={(e) =>
                    handleUpdate({ trackP2WorkstreamSplits: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-primary"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum Data Threshold (Days)</Label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={settings.minDataThresholdDays}
                  onChange={(e) =>
                    handleUpdate({
                      minDataThresholdDays: parseInt(e.target.value, 10) || 3,
                    })
                  }
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Minimum closed days required before AI analyst grants High confidence.
                </span>
              </div>

              <div>
                <Label>Export Date Format</Label>
                <select
                  value={settings.exportDateFormat}
                  onChange={(e) =>
                    handleUpdate({
                      exportDateFormat: e.target.value as ReviewSettings["exportDateFormat"],
                    })
                  }
                  className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                >
                  <option value="YYYY-MM-DD" className="bg-popover">YYYY-MM-DD (ISO)</option>
                  <option value="DD/MM/YYYY" className="bg-popover">DD/MM/YYYY (UK/India)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 2. CUSTOMIZABLE DASHBOARD LAYOUTS & VIEWS */}
        {activeTab === "views" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-4">
              <span className="font-semibold text-foreground text-sm block">Create Customized View Preset</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>View Name</Label>
                  <Input
                    placeholder="e.g. Founder Executive Brief"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Priority Focus</Label>
                  <select
                    value={viewPriorityFilter}
                    onChange={(e) => setViewPriorityFilter(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                  >
                    <option value="" className="bg-popover">All Priorities</option>
                    <option value="1" className="bg-popover">#1 Founder Capability</option>
                    <option value="2" className="bg-popover">#2 Cashflow Infrastructure</option>
                    <option value="3" className="bg-popover">#3 Learning for Execution</option>
                  </select>
                </div>
                <div>
                  <Label>Date Range Window</Label>
                  <select
                    value={viewPreset}
                    onChange={(e) =>
                      setViewPreset(e.target.value as "last_7_days" | "last_14_days" | "last_30_days")
                    }
                    className="w-full h-10 rounded-xl border border-input bg-secondary/60 px-3 text-sm text-foreground outline-none"
                  >
                    <option value="last_7_days" className="bg-popover">Last 7 Days</option>
                    <option value="last_14_days" className="bg-popover">Last 14 Days</option>
                    <option value="last_30_days" className="bg-popover">Last 30 Days</option>
                  </select>
                </div>
              </div>

              {/* Card Visibility Selection */}
              <div className="space-y-2 pt-2 border-t border-glass-border/40">
                <Label>Visible Dashboard Cards & Layout Modules</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_CARDS.map((card) => {
                    const checked = selectedCards.includes(card.id);
                    return (
                      <label
                        key={card.id}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer",
                          checked
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-glass-border bg-secondary/20 text-muted-foreground",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCards([...selectedCards, card.id]);
                            } else {
                              setSelectedCards(selectedCards.filter((c) => c !== card.id));
                            }
                          }}
                          className="h-3.5 w-3.5 accent-primary rounded"
                        />
                        <span className="text-xs font-medium">{card.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <Label className="mb-0">Chart Preference:</Label>
                  <select
                    value={chartPref}
                    onChange={(e) => setChartPref(e.target.value as any)}
                    className="h-8 rounded-lg border border-input bg-secondary/60 px-2 text-xs"
                  >
                    <option value="bar">Grouped Bar</option>
                    <option value="distribution">Distribution Ratio</option>
                    <option value="stacked">Stacked Volume</option>
                  </select>
                </div>
                <Button variant="primary" size="sm" onClick={handleCreateView}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Save View Preset
                </Button>
              </div>
            </div>

            {/* Saved Custom Views List */}
            <div className="space-y-2">
              <span className="font-semibold text-muted-foreground block text-xs">
                Active Saved Views ({settings.customViews?.length ?? 0})
              </span>
              {(settings.customViews ?? []).length === 0 ? (
                <p className="text-muted-foreground italic">No custom views saved yet.</p>
              ) : (
                settings.customViews.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary/30 p-3"
                  >
                    <div>
                      <div className="font-semibold text-foreground text-sm">{v.name}</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">
                        {v.priorityFilter ? `Priority #${v.priorityFilter}` : "All Priorities"} ·{" "}
                        {v.dateRangePreset?.replace("_", " ") ?? "Default Range"} ·{" "}
                        {v.selectedMetricCards?.length ?? 4} visible cards
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8 hover:bg-destructive/15"
                      onClick={() => update((s) => deleteCustomView(s, v.id))}
                      aria-label="Delete View"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. CUSTOM METRIC FORMULA BUILDER */}
        {activeTab === "metrics" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-cyan" />
                <span className="font-semibold text-foreground text-sm">Custom Metric Formula Builder</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Construct deterministic mathematical metrics using atomic execution data. Formulas evaluate dynamically over review periods.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Metric Name</Label>
                  <Input
                    placeholder="e.g. Focus Ratio, P2 Cash Velocity"
                    value={metricName}
                    onChange={(e) => setMetricName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="What does this metric measure?"
                    value={metricDesc}
                    onChange={(e) => setMetricDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* Mathematical Equation Controls */}
              <div className="rounded-xl border border-glass-border/60 bg-secondary/20 p-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Formula Structure</Label>
                    <select
                      value={metricFormula}
                      onChange={(e) => setMetricFormula(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-2.5 text-xs outline-none"
                    >
                      <option value="yield_per_hour">Yield Density (Output / Hours)</option>
                      <option value="rate">Completion Rate (Num / Den %)</option>
                      <option value="ratio">Direct Ratio (Num / Den)</option>
                      <option value="velocity">Velocity per Day</option>
                    </select>
                  </div>

                  <div>
                    <Label>Numerator [ A ]</Label>
                    <select
                      value={metricNum}
                      onChange={(e) => setMetricNum(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-2.5 text-xs outline-none"
                    >
                      <option value="outcomesAchieved">Outcomes Achieved</option>
                      <option value="actualHours">Actual Hours Logged</option>
                      <option value="tasksDone">Tasks Completed</option>
                      <option value="p2HoursA">P2 Workstream A (Trading Hours)</option>
                      <option value="p2HoursB">P2 Workstream B (Product Hours)</option>
                    </select>
                  </div>

                  <div>
                    <Label>Denominator [ B ]</Label>
                    <select
                      value={metricDen}
                      onChange={(e) => setMetricDen(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-2.5 text-xs outline-none"
                    >
                      <option value="totalActualHours">Total Actual Hours</option>
                      <option value="plannedHours">Planned Hours Allocation</option>
                      <option value="tasksPlanned">Tasks Planned</option>
                      <option value="recordedDays">Recorded Days Count</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Display Unit</Label>
                    <select
                      value={metricUnit}
                      onChange={(e) => setMetricUnit(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-2.5 text-xs outline-none"
                    >
                      <option value="ratio">Ratio (e.g. 0.8)</option>
                      <option value="%">Percentage (%)</option>
                      <option value="h">Hours (h)</option>
                      <option value="count">Count</option>
                    </select>
                  </div>

                  <div>
                    <Label>Target Value</Label>
                    <Input
                      type="number"
                      step={0.1}
                      value={metricTarget}
                      onChange={(e) => setMetricTarget(parseFloat(e.target.value) || 0)}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div>
                    <Label>Priority Filter</Label>
                    <select
                      value={metricPriority}
                      onChange={(e) => setMetricPriority(e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-secondary/60 px-2.5 text-xs outline-none"
                    >
                      <option value="">All Priorities</option>
                      <option value="1">Priority #1 Only</option>
                      <option value="2">Priority #2 Only</option>
                      <option value="3">Priority #3 Only</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview Ribbon */}
                <div className="pt-2 border-t border-glass-border/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground mr-1.5">Live Trailing 14d Test Value:</span>
                    <span className="font-mono font-bold text-foreground">{previewEvaluation.formatted}</span>
                    <span className="text-muted-foreground ml-2">(Target: {metricTarget}{metricUnit})</span>
                  </div>
                  <Badge className={previewEvaluation.targetMet ? "border-success/30 text-success bg-success/10" : "border-warning/30 text-warning bg-warning/10"}>
                    {previewEvaluation.targetMet ? "Target Met" : "Below Target"}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="sm" onClick={handleCreateMetric}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Metric
                </Button>
              </div>
            </div>

            {/* List of Defined Metrics */}
            <div className="space-y-2">
              <span className="font-semibold text-muted-foreground block text-xs">
                Active Custom Metrics ({settings.customMetrics?.length ?? 0})
              </span>
              {(settings.customMetrics ?? []).length === 0 ? (
                <p className="text-muted-foreground italic">No custom metric formulas defined yet.</p>
              ) : (
                settings.customMetrics!.map((m) => {
                  const evalResult = evaluateCustomMetric(m, trailing14Summary);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary/30 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{m.name}</span>
                          <span className="font-mono font-bold text-xs text-cyan">{evalResult.formatted}</span>
                          <Badge className="text-[10px]">Target: {m.targetValue}{m.unit}</Badge>
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-0.5">
                          {m.description || `${m.numerator} / ${m.denominator}`} · Formula: {m.formula}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8 hover:bg-destructive/15"
                        onClick={() => update((s) => deleteCustomMetric(s, m.id))}
                        aria-label="Delete Metric"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. CUSTOM REFLECTION QUESTION EDITOR */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground text-sm">Reflection Prompt Customization</span>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Customize the specific reflection questions asked during Daily, Weekly, and Monthly reviews.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetQuestions}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Defaults
                </Button>
              </div>

              {/* Cadence Switcher */}
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setQuestionCadence(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-medium capitalize text-xs transition-all",
                      questionCadence === c
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "bg-secondary/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c} Questions ({(activeTemplates[c] ?? []).length})
                  </button>
                ))}
              </div>

              {/* Question list for active cadence */}
              <div className="space-y-2">
                {(activeTemplates[questionCadence] ?? []).map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-glass-border bg-secondary/20"
                  >
                    <span className="text-xs text-foreground flex-1">
                      <span className="font-bold text-primary mr-2">Q{idx + 1}.</span> {q}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-7 w-7 hover:bg-destructive/15 shrink-0"
                      onClick={() => handleDeleteQuestion(idx)}
                      aria-label="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Question */}
              <div className="flex gap-2 pt-2 border-t border-glass-border/40">
                <Input
                  placeholder={`Add a new question for ${questionCadence} review...`}
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
                />
                <Button variant="primary" size="sm" onClick={handleAddQuestion}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 5. CONFIGURABLE ALERT CONTROLS */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <span className="font-semibold text-foreground text-sm">Operational Alert Sensitivity & Thresholds</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Configure threshold triggers and sensitivity parameters for anomaly detection across review periods.
              </p>

              {(() => {
                const alt = settings.alertSettings ?? defaultReviewSettings.alertSettings!;
                const enabled = alt.enabledAlerts;

                const updateAlt = (patch: Partial<AlertSettings>) => {
                  update((s) => updateAlertSettings(s, { ...alt, ...patch }));
                  toast.success("Alert thresholds updated.");
                };

                const toggleEnabled = (key: keyof AlertSettings["enabledAlerts"]) => {
                  update((s) =>
                    updateAlertSettings(s, {
                      ...alt,
                      enabledAlerts: { ...alt.enabledAlerts, [key]: !alt.enabledAlerts[key] },
                    }),
                  );
                };

                return (
                  <div className="space-y-4">
                    {/* 1. Workstream Imbalance */}
                    <div className="p-3.5 rounded-xl border border-glass-border bg-secondary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={enabled.workstreamImbalance}
                            onChange={() => toggleEnabled("workstreamImbalance")}
                            className="h-3.5 w-3.5 accent-primary rounded"
                          />
                          Priority 2 Workstream Imbalance Alert
                        </label>
                        <span className="font-mono text-cyan font-bold">{alt.workstreamImbalanceThreshold}% split</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={5}
                        disabled={!enabled.workstreamImbalance}
                        value={alt.workstreamImbalanceThreshold}
                        onChange={(e) =>
                          updateAlt({ workstreamImbalanceThreshold: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-cyan h-2 bg-secondary rounded-lg cursor-pointer disabled:opacity-30"
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Triggers when Workstream A (Trading) exceeds this percentage of total Priority 2 hours with 0h logged in Workstream B.
                      </div>
                    </div>

                    {/* 2. Chronic Bottleneck */}
                    <div className="p-3.5 rounded-xl border border-glass-border bg-secondary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={enabled.chronicBottleneck}
                            onChange={() => toggleEnabled("chronicBottleneck")}
                            className="h-3.5 w-3.5 accent-primary rounded"
                          />
                          Chronic Bottleneck Recurrence Trigger
                        </label>
                        <span className="font-mono text-warning font-bold">{alt.chronicBottleneckThreshold} occurrences</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={6}
                        step={1}
                        disabled={!enabled.chronicBottleneck}
                        value={alt.chronicBottleneckThreshold}
                        onChange={(e) =>
                          updateAlt({ chronicBottleneckThreshold: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-warning h-2 bg-secondary rounded-lg cursor-pointer disabled:opacity-30"
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Triggers a critical alert when any unfinished task repeats across this many distinct review days.
                      </div>
                    </div>

                    {/* 3. Planning Realism Drift */}
                    <div className="p-3.5 rounded-xl border border-glass-border bg-secondary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={enabled.realismDrift}
                            onChange={() => toggleEnabled("realismDrift")}
                            className="h-3.5 w-3.5 accent-primary rounded"
                          />
                          Planning Realism Lower Tolerance Bound
                        </label>
                        <span className="font-mono text-primary font-bold">{Math.round(alt.realismDriftMin * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={85}
                        step={5}
                        disabled={!enabled.realismDrift}
                        value={Math.round(alt.realismDriftMin * 100)}
                        onChange={(e) =>
                          updateAlt({ realismDriftMin: parseInt(e.target.value, 10) / 100 })
                        }
                        className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer disabled:opacity-30"
                      />
                      <div className="text-[11px] text-muted-foreground">
                        Triggers when actual execution is under this percentage of planned workload (over-commitment signal).
                      </div>
                    </div>

                    {/* 4. Data Continuity Gap */}
                    <div className="p-3.5 rounded-xl border border-glass-border bg-secondary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={enabled.dataGap}
                            onChange={() => toggleEnabled("dataGap")}
                            className="h-3.5 w-3.5 accent-primary rounded"
                          />
                          Data Continuity Gap Tolerance
                        </label>
                        <span className="font-mono text-muted-foreground font-bold">{alt.dataGapDaysThreshold} gap days</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        disabled={!enabled.dataGap}
                        value={alt.dataGapDaysThreshold}
                        onChange={(e) =>
                          updateAlt({ dataGapDaysThreshold: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-muted-foreground h-2 bg-secondary rounded-lg cursor-pointer disabled:opacity-30"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 6. DATA & BACKUP TAB */}
        {activeTab === "data" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-3">
              <div className="font-semibold text-foreground text-sm">Full Reviews Backup & Restore</div>
              <p className="text-muted-foreground leading-relaxed">
                Exports or restores all closed day records, task snapshots, audit logs, bottlenecks, and improvement records into a portable JSON file.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleExportFullBackup}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download JSON Backup
                </Button>

                <label className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-xl glass hover:bg-accent text-foreground cursor-pointer transition-all">
                  <Upload className="h-3.5 w-3.5 mr-1" /> Restore Backup
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const parsed = JSON.parse(evt.target?.result as string);
                          if (!parsed || !Array.isArray(parsed.history)) {
                            toast.error("Invalid backup file: missing history records.");
                            return;
                          }
                          update((s) => ({
                            ...s,
                            history: parsed.history,
                            bottlenecks: parsed.bottlenecks || s.bottlenecks,
                            improvements: parsed.improvements || s.improvements,
                            periodReviews: parsed.periodReviews || s.periodReviews,
                            forecastHistory: parsed.forecastHistory || s.forecastHistory,
                            reviewSettings: parsed.reviewSettings || s.reviewSettings,
                          }));
                          toast.success(`Successfully restored ${parsed.history.length} review records.`);
                          onClose();
                        } catch (err) {
                          toast.error("Failed to parse backup JSON file.");
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-glass-border bg-secondary/30 p-4 space-y-3">
              <div className="font-semibold text-foreground text-sm">Demonstration Dataset</div>
              <p className="text-muted-foreground leading-relaxed">
                Merge 14 days of realistic review records (covering Cashflow sessions, Stripe migrations, auth flows, audit corrections, and bottlenecks) for benchmarking.
              </p>
              <Button variant="glass" size="sm" onClick={handleLoadDemoFixtures}>
                <Sparkles className="h-3.5 w-3.5 mr-1 text-cyan" /> Load 14-Day Demo Records
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
