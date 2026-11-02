import type {
  AlertSettings,
  AuditRecord,
  CustomMetricDefinition,
  CustomReviewView,
  DayRecord,
  ForecastSnapshot,
  ImprovementStatus,
  KnowledgeItem,
  OSState,
  PeriodReviewRecord,
  ReflectionTemplate,
  ReportShareConfig,
  ReviewAIInsight,
  ReviewAlert,
  ReviewBottleneck,
  ReviewImprovement,
  ReviewSettings,
} from "../types";
import { uid, today } from "../seed";

/**
 * Applies a correction to a historical DayRecord while preserving a tamper-evident audit log.
 * Never silently overwrites historical data.
 */
export function correctDayRecord(
  s: OSState,
  date: string,
  field: keyof DayRecord,
  newValue: unknown,
  reason: string,
  nowIso = new Date().toISOString(),
): OSState {
  const existing = s.history.find((h) => h.date === date);
  if (!existing) return s;

  const oldValue = existing[field];

  const auditEntry: AuditRecord = {
    id: `aud-${uid()}`,
    timestamp: nowIso,
    field: String(field),
    oldValue,
    newValue,
    reason: reason.trim() || "Manual correction via Reviews audit",
    source: "user_correction",
  };

  const updatedRecord: DayRecord = {
    ...existing,
    [field]: newValue,
    state: "corrected",
    source: "corrected",
    correctedAt: nowIso,
    auditHistory: [...(existing.auditHistory ?? []), auditEntry],
  };

  const updatedHistory = s.history.map((h) =>
    h.date === date ? updatedRecord : h,
  );
  return { ...s, history: updatedHistory };
}

/**
 * Creates a new Improvement Intelligence record in the 8-stage lifecycle.
 */
export function addImprovement(
  s: OSState,
  item: Omit<ReviewImprovement, "id" | "createdAt">,
  nowIso = new Date().toISOString(),
): OSState {
  const newImprovement: ReviewImprovement = {
    ...item,
    id: `imp-${uid()}`,
    createdAt: nowIso,
  };

  const current = s.improvements ?? [];
  return { ...s, improvements: [newImprovement, ...current] };
}

/**
 * Transitions an Improvement through its lifecycle (Problem → Evidence → Decision → Action → Evaluation).
 */
export function updateImprovement(
  s: OSState,
  id: string,
  patch: Partial<ReviewImprovement>,
  nowIso = new Date().toISOString(),
): OSState {
  const current = s.improvements ?? [];
  const updated = current.map((imp) => {
    if (imp.id !== id) return imp;
    const next: ReviewImprovement = { ...imp, ...patch };
    if (patch.status === "approved" && !next.decisionDate) {
      next.decisionDate = nowIso;
    }
    if (patch.status === "evaluated" && !next.evaluatedAt) {
      next.evaluatedAt = nowIso;
    }
    return next;
  });

  return { ...s, improvements: updated };
}

/**
 * Adds or updates a persistent bottleneck in the registry.
 */
export function addOrUpdateBottleneck(
  s: OSState,
  bottleneck: Omit<ReviewBottleneck, "id">,
): OSState {
  const current = s.bottlenecks ?? [];
  const existingIndex = current.findIndex(
    (b) =>
      b.priorityId === bottleneck.priorityId &&
      b.title.toLowerCase().trim() === bottleneck.title.toLowerCase().trim(),
  );

  let updated: ReviewBottleneck[];
  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    if (existing) {
      const merged: ReviewBottleneck = {
        ...existing,
        ...bottleneck,
        id: existing.id,
        occurrenceCount: existing.occurrenceCount + 1,
        lastObservedDate: bottleneck.lastObservedDate,
        sourceDayDates: Array.from(
          new Set([...existing.sourceDayDates, ...bottleneck.sourceDayDates]),
        ),
      };
      updated = current.map((b, idx) => (idx === existingIndex ? merged : b));
    } else {
      updated = current;
    }
  } else {
    const newEntry: ReviewBottleneck = {
      ...bottleneck,
      id: `bot-${uid()}`,
    };
    updated = [newEntry, ...current];
  }

  return { ...s, bottlenecks: updated };
}

/**
 * Resolves a persistent bottleneck with resolution documentation.
 */
export function resolveBottleneck(
  s: OSState,
  id: string,
  resolutionNotes: string,
  nowIso = today(),
): OSState {
  const current = s.bottlenecks ?? [];
  const updated = current.map((b) => {
    if (b.id !== id) return b;
    return {
      ...b,
      status: "resolved" as const,
      resolvedAt: nowIso,
      resolutionNotes: resolutionNotes.trim(),
    };
  });

  return { ...s, bottlenecks: updated };
}

/**
 * Updates review settings and view preferences safely.
 */
export function updateReviewSettings(
  s: OSState,
  patch: Partial<ReviewSettings>,
): OSState {
  const current: ReviewSettings = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  return { ...s, reviewSettings: { ...current, ...patch } };
}

/**
 * Finalizes an immutable period review (Weekly or Monthly snapshot) in history.
 */
export function finalizePeriodReview(
  s: OSState,
  review: PeriodReviewRecord,
): OSState {
  const current = s.periodReviews ?? [];
  const exists = current.some((r) => r.id === review.id);
  const updated = exists
    ? current.map((r) => (r.id === review.id ? review : r))
    : [review, ...current];

  return { ...s, periodReviews: updated };
}

/**
 * Deletes a finalized period review snapshot.
 */
export function deletePeriodReview(s: OSState, id: string): OSState {
  const current = s.periodReviews ?? [];
  return { ...s, periodReviews: current.filter((r) => r.id !== id) };
}

/**
 * Records an evidence-based AI insight (Fact, Insight, or Recommendation).
 */
export function addAIInsight(
  s: OSState,
  insight: Omit<ReviewAIInsight, "id" | "createdAt">,
  nowIso = new Date().toISOString(),
): OSState {
  const newInsight: ReviewAIInsight = {
    ...insight,
    id: `ins-${uid()}`,
    createdAt: nowIso,
  };
  const current = s.aiInsights ?? [];
  return { ...s, aiInsights: [newInsight, ...current] };
}

/**
 * Updates an AI insight (e.g. status transition to dismissed or converted).
 */
export function updateAIInsight(
  s: OSState,
  id: string,
  patch: Partial<ReviewAIInsight>,
): OSState {
  const current = s.aiInsights ?? [];
  return {
    ...s,
    aiInsights: current.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

/**
 * Adds a smart operational review alert.
 */
export function addAlert(
  s: OSState,
  alert: Omit<ReviewAlert, "id" | "timestamp">,
  nowIso = new Date().toISOString(),
): OSState {
  const newAlert: ReviewAlert = {
    ...alert,
    id: `alt-${uid()}`,
    timestamp: nowIso,
  };
  const current = s.reviewAlerts ?? [];
  return { ...s, reviewAlerts: [newAlert, ...current] };
}

/**
 * Dismisses a review alert.
 */
export function dismissAlert(s: OSState, id: string): OSState {
  const current = s.reviewAlerts ?? [];
  return {
    ...s,
    reviewAlerts: current.map((a) =>
      a.id === id ? { ...a, dismissed: true } : a,
    ),
  };
}

/**
 * Promotes an evaluated improvement into an active Knowledge item.
 */
export function promoteImprovementToKnowledge(
  s: OSState,
  improvementId: string,
  nowIso = today(),
  customItem?: Partial<KnowledgeItem>,
): OSState {
  const imp = (s.improvements ?? []).find((i) => i.id === improvementId);
  if (!imp) return s;

  const defaultTitle = `Lesson: ${imp.problemStatement.slice(0, 60)}`;
  const defaultBody = `Problem: ${imp.problemStatement}\n\nEvidence: ${imp.evidence.metrics.join("; ")}\n\nApproved Action: ${imp.approvedAction || imp.recommendation}\n\nEvaluation Result (${imp.evaluationOutcome || "completed"}): ${imp.evaluationNotes || "Validated through execution."}`;

  const knowledgeItem: KnowledgeItem = {
    id: customItem?.id || `k-imp-${uid()}`,
    title: customItem?.title || defaultTitle,
    type: customItem?.type || "Learning",
    knowledgeFormat: customItem?.knowledgeFormat || "principle",
    formatData: customItem?.formatData || {
      principle: {
        corePrinciple: imp.approvedAction || imp.recommendation,
        whyItMatters: imp.problemStatement,
      },
    },
    body: customItem?.body || defaultBody,
    priorityId:
      customItem?.priorityId !== undefined
        ? customItem.priorityId
        : imp.priorityId,
    projectId:
      customItem?.projectId !== undefined
        ? customItem.projectId
        : imp.projectId,
    tags: customItem?.tags || `improvement, review, ${imp.periodRef}`,
    createdAt: customItem?.createdAt || nowIso,
    schemaVersion: 1,
  };

  const updatedImprovements = (s.improvements ?? []).map((i) =>
    i.id === improvementId
      ? { ...i, promotedToKnowledgeId: knowledgeItem.id }
      : i,
  );

  return {
    ...s,
    knowledge: [knowledgeItem, ...s.knowledge],
    improvements: updatedImprovements,
  };
}

/**
 * Adds or updates a saved custom analytical view.
 */
export function saveCustomView(s: OSState, view: CustomReviewView): OSState {
  const settings = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  const currentViews = settings.customViews ?? [];
  const exists = currentViews.some((v) => v.id === view.id);
  const updatedViews = exists
    ? currentViews.map((v) => (v.id === view.id ? view : v))
    : [...currentViews, view];

  return {
    ...s,
    reviewSettings: { ...settings, customViews: updatedViews },
  };
}

/**
 * Deletes a saved custom analytical view.
 */
export function deleteCustomView(s: OSState, id: string): OSState {
  if (!s.reviewSettings) return s;
  return {
    ...s,
    reviewSettings: {
      ...s.reviewSettings,
      customViews: s.reviewSettings.customViews.filter((v) => v.id !== id),
    },
  };
}

/**
 * Adds or updates a user-defined custom metric formula.
 */
export function addCustomMetric(
  s: OSState,
  metric: CustomMetricDefinition,
): OSState {
  const settings = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  const currentMetrics = settings.customMetrics ?? [];
  const exists = currentMetrics.some((m) => m.id === metric.id);
  const updatedMetrics = exists
    ? currentMetrics.map((m) => (m.id === metric.id ? metric : m))
    : [...currentMetrics, metric];

  return {
    ...s,
    reviewSettings: {
      ...settings,
      customMetrics: updatedMetrics,
    },
  };
}

/**
 * Deletes a user-defined custom metric.
 */
export function deleteCustomMetric(s: OSState, id: string): OSState {
  if (!s.reviewSettings) return s;
  return {
    ...s,
    reviewSettings: {
      ...s.reviewSettings,
      customMetrics: (s.reviewSettings.customMetrics ?? []).filter(
        (m) => m.id !== id,
      ),
    },
  };
}

/**
 * Updates configurable alert sensitivity thresholds.
 */
export function updateAlertSettings(
  s: OSState,
  alertSettings: AlertSettings,
): OSState {
  const settings = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  return {
    ...s,
    reviewSettings: {
      ...settings,
      alertSettings,
    },
  };
}

/**
 * Updates customizable reflection questions.
 */
export function updateReflectionTemplates(
  s: OSState,
  reflectionTemplates: ReflectionTemplate,
): OSState {
  const settings = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  return {
    ...s,
    reviewSettings: {
      ...settings,
      reflectionTemplates,
    },
  };
}

/**
 * Archives a milestone forecast snapshot for accuracy and calibration tracking.
 */
export function addForecastSnapshot(
  s: OSState,
  snapshot: Omit<ForecastSnapshot, "id" | "createdAt">,
): OSState {
  const current = s.forecastHistory ?? [];
  const newSnapshot: ForecastSnapshot = {
    ...snapshot,
    id: `fc-${uid()}`,
    createdAt: new Date().toISOString(),
  };

  return {
    ...s,
    forecastHistory: [newSnapshot, ...current],
  };
}

/**
 * Marks a forecast milestone as delivered and computes variance days and calibration rating.
 */
export function markForecastDelivered(
  s: OSState,
  id: string,
  actualDate: string,
): OSState {
  const current = s.forecastHistory ?? [];
  const updated = current.map((f) => {
    if (f.id !== id) return f;
    const predTime = new Date(f.predictedDate).getTime();
    const actTime = new Date(actualDate).getTime();
    const diffDays = Math.round((actTime - predTime) / 864e5);

    let rating: ForecastSnapshot["calibrationRating"] = "accurate";
    if (diffDays > 5)
      rating = "optimistic_bias"; // took longer than predicted
    else if (diffDays < -5) rating = "conservative_bias"; // delivered faster

    return {
      ...f,
      actualDeliveredDate: actualDate,
      status: "delivered" as const,
      accuracyVarianceDays: diffDays,
      calibrationRating: rating,
    };
  });

  return {
    ...s,
    forecastHistory: updated,
  };
}

/**
 * Creates a report-sharing configuration with specific permission levels.
 */
export function createReportShare(
  s: OSState,
  config: Omit<ReportShareConfig, "id" | "shareToken" | "createdAt">,
): { state: OSState; share: ReportShareConfig } {
  const current = s.sharedReports ?? [];
  const shareToken = `sec_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  const newShare: ReportShareConfig = {
    ...config,
    id: `shr-${uid()}`,
    shareToken,
    createdAt: new Date().toISOString(),
  };

  return {
    state: { ...s, sharedReports: [newShare, ...current] },
    share: newShare,
  };
}

/**
 * Revokes a shared report.
 */
export function deleteReportShare(s: OSState, id: string): OSState {
  const current = s.sharedReports ?? [];
  return {
    ...s,
    sharedReports: current.filter((r) => r.id !== id),
  };
}
