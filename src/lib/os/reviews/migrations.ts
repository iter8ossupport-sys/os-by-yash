import type { DayRecord, OSState, PriorityId } from "../types";
import { initialState } from "../seed";
import { syncPrioritiesWithProjects } from "../logic";
import { defaultReviewSettings } from "./fixtures";

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Upgrades a single DayRecord from legacy schema to schema v2.
 * Preserves timestamps, audit logs, and existing user outputs.
 */
export function migrateDayRecord(record: DayRecord): DayRecord {
  const hasAudit = Boolean(
    record.auditHistory && record.auditHistory.length > 0,
  );
  const state = record.state ?? (hasAudit ? "corrected" : "finalized");
  const source = record.source ?? (hasAudit ? "corrected" : "closeout");

  // Ensure Priority 2 Workstream A vs B minutes are populated safely
  let p2WorkstreamMinutes = record.p2WorkstreamMinutes;
  if (!p2WorkstreamMinutes && (record.actualMin?.[2] ?? 0) > 0) {
    const p2Actual = record.actualMin[2] ?? 0;
    const outputs = record.outputs ?? [];
    const p2Outputs = outputs.filter((o) => o.priorityId === 2);
    const hasA = p2Outputs.some(
      (o) =>
        o.workstream === "A" ||
        /cash|trading|session/i.test(o.workstream ?? ""),
    );
    const hasB = p2Outputs.some(
      (o) =>
        o.workstream === "B" ||
        /fintech|product|saas|api/i.test(o.workstream ?? ""),
    );

    if (hasA && !hasB) {
      p2WorkstreamMinutes = { workstreamA: p2Actual, workstreamB: 0 };
    } else if (hasB && !hasA) {
      p2WorkstreamMinutes = { workstreamA: 0, workstreamB: p2Actual };
    } else if (hasA && hasB) {
      const half = Math.round(p2Actual / 2);
      p2WorkstreamMinutes = { workstreamA: half, workstreamB: p2Actual - half };
    } else {
      p2WorkstreamMinutes = { workstreamA: p2Actual, workstreamB: 0 };
    }
  }

  return {
    ...record,
    state,
    source,
    p2WorkstreamMinutes: p2WorkstreamMinutes ?? {
      workstreamA: 0,
      workstreamB: 0,
    },
    auditHistory: record.auditHistory ?? [],
    taskSnapshots: record.taskSnapshots ?? [],
  };
}

/**
 * Pure schema migration pipeline.
 * Safely migrates raw unparsed or older schema objects into guaranteed schema v2.
 * Never mutates or discards existing priorities, projects, or recorded history.
 */
export function migrateOSState(raw: unknown): OSState {
  if (!raw || typeof raw !== "object") {
    return syncPrioritiesWithProjects(initialState);
  }

  const p = raw as Record<string, unknown>;

  const legacyHistory = Array.isArray(p["history"])
    ? (p["history"] as DayRecord[])
    : [];

  const migratedHistory = legacyHistory.map(migrateDayRecord);

  const migrated: OSState = {
    ...initialState,
    ...(p as unknown as OSState),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userAvatar: typeof p["userAvatar"] === "string" ? p["userAvatar"] : null,
    history: migratedHistory,
    bottlenecks: Array.isArray(p["bottlenecks"])
      ? (p["bottlenecks"] as OSState["bottlenecks"])
      : [],
    improvements: Array.isArray(p["improvements"])
      ? (p["improvements"] as OSState["improvements"])
      : [],
    periodReviews: Array.isArray(p["periodReviews"])
      ? (p["periodReviews"] as OSState["periodReviews"])
      : [],
    aiInsights: Array.isArray(p["aiInsights"])
      ? (p["aiInsights"] as OSState["aiInsights"])
      : [],
    reviewAlerts: Array.isArray(p["reviewAlerts"])
      ? (p["reviewAlerts"] as OSState["reviewAlerts"])
      : [],
    reviewSettings:
      (p["reviewSettings"] as OSState["reviewSettings"]) ??
      defaultReviewSettings,
  };

  if (
    migrated.foundation?.northStar ===
    "Find human friction. Solve problems. Build systems. Scale impact."
  ) {
    migrated.foundation = {
      ...migrated.foundation,
      northStar: "Build systems that remove human friction.",
    };
  }

  return syncPrioritiesWithProjects(migrated);
}
