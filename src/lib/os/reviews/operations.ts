import type {
  AuditRecord,
  DayRecord,
  ImprovementStatus,
  OSState,
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

  const updatedHistory = s.history.map((h) => (h.date === date ? updatedRecord : h));
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
    const merged: ReviewBottleneck = {
      ...existing,
      ...bottleneck,
      occurrenceCount: existing.occurrenceCount + 1,
      lastObservedDate: bottleneck.lastObservedDate,
      sourceDayDates: Array.from(new Set([...existing.sourceDayDates, ...bottleneck.sourceDayDates])),
    };
    updated = current.map((b, idx) => (idx === existingIndex ? merged : b));
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
  const current = s.reviewSettings ?? {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  };

  return { ...s, reviewSettings: { ...current, ...patch } };
}

