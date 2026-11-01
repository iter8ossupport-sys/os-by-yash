/**
 * Yash OS Reviews — Versioned Data Contracts & Schema Boundaries
 *
 * Current Schema Version: 1.0.0
 *
 * This document specifies the entity relationships, ownership hierarchy,
 * migration boundaries, and relational schema mappings for future cloud persistence.
 */

export const REVIEWS_SCHEMA_VERSION = "1.0.0";

/**
 * ENTITY RELATIONSHIPS & OWNERSHIP HIERARCHY
 *
 * 1. User Workspace (Root Tenant Boundary)
 *    ├── Priorities (1:N, strict 3 priorities)
 *    ├── Projects (1:N, linked to priorities)
 *    ├── Knowledge Items (1:N, principles, learnings)
 *    │
 *    ├── DayRecord (1:N, indexed by YYYY-MM-DD)
 *    │   ├── taskSnapshots (1:N)
 *    │   ├── outputs (1:N)
 *    │   └── DayReviewRecord (1:1 embedded)
 *    │       └── RetroactiveAdjustments (1:N audit trail)
 *    │
 *    ├── PeriodReviewRecord (1:N, weekly / monthly / custom snapshots)
 *    │   ├── summaryMetrics (denormalized immutable metrics snapshot)
 *    │   ├── recurringBottleneckRefs (string[] -> ReviewBottleneck.id)
 *    │   ├── approvedImprovementRefs (string[] -> ReviewImprovement.id)
 *    │   └── auditHistory (1:N audit changes)
 *    │
 *    ├── ReviewBottleneck (1:N, identified system friction)
 *    │   ├── priorityRef? (nullable foreign key)
 *    │   ├── projectRef? (nullable foreign key)
 *    │   └── linkedImprovementIds (1:N -> ReviewImprovement.id)
 *    │
 *    ├── ReviewImprovement (1:N, concrete actionable adjustments)
 *    │   ├── bottleneckRef? (nullable foreign key)
 *    │   └── validationHistory (status progression trail)
 *    │
 *    ├── ForecastSnapshot (1:N, milestone prediction & calibration log)
 *    │   └── calibrationRating (immutable once delivered)
 *    │
 *    ├── ReportShareConfig (1:N, permission-scoped snapshot grant)
 *    │   └── shareToken (client/server signed gating key)
 *    │
 *    └── ReviewSettings (1:1 per workspace)
 *        ├── customMetrics (1:N definitions)
 *        ├── alertSettings (thresholds)
 *        └── reflectionTemplates (custom prompt arrays)
 */

/**
 * IMMUTABILITY & AUDIT BOUNDARIES
 *
 * 1. Finalized Period Reviews:
 *    - Once `PeriodReviewRecord` is finalized, its performance metrics are frozen.
 *    - Any retroactive recalculation appends an entry to `auditHistory` with timestamp and reason.
 *
 * 2. Day Closeout:
 *    - `closedAt` timestamp marks execution freeze for that date.
 *    - Later edits through the History correction modal record a `RetroactiveAdjustment`.
 *
 * 3. Forecast Benchmarks:
 *    - `predictedDate`, `predictedWeeks`, and `velocityBasisHoursPerWeek` are immutable once saved.
 *    - Delivery date input sets `actualDeliveredDate`, `accuracyVarianceDays`, and `calibrationRating`.
 *
 * 4. Report Sharing Gating:
 *    - Permission level `summary_only` strips all qualitative reflections and founder journal notes.
 *    - Flag `includeFinancials = false` strips all P2 trading PnL and cash allocations.
 */

export interface DatabaseTableDefinition {
  tableName: string;
  primaryKey: string;
  foreignKeys: Record<string, string>;
  indexes: string[];
  description: string;
}

export const FUTURE_DATABASE_MAPPING: DatabaseTableDefinition[] = [
  {
    tableName: "day_reviews",
    primaryKey: "date",
    foreignKeys: { workspace_id: "workspaces.id" },
    indexes: ["workspace_id", "date", "reviewed_at"],
    description: "Daily review closeout records with qualitative reflections and audit deltas.",
  },
  {
    tableName: "period_reviews",
    primaryKey: "id",
    foreignKeys: { workspace_id: "workspaces.id" },
    indexes: ["workspace_id", "type", "start_date", "end_date"],
    description: "Immutable finalized snapshots of weekly, monthly, and quarterly performance reviews.",
  },
  {
    tableName: "review_bottlenecks",
    primaryKey: "id",
    foreignKeys: { workspace_id: "workspaces.id", priority_id: "priorities.id", project_id: "projects.id" },
    indexes: ["workspace_id", "status", "category", "severity"],
    description: "System friction log with recurrence count, impact rating, and resolution status.",
  },
  {
    tableName: "review_improvements",
    primaryKey: "id",
    foreignKeys: { workspace_id: "workspaces.id", bottleneck_id: "review_bottlenecks.id" },
    indexes: ["workspace_id", "status", "action_cadence"],
    description: "Continuous improvement loop actions with validation results.",
  },
  {
    tableName: "forecast_snapshots",
    primaryKey: "id",
    foreignKeys: { workspace_id: "workspaces.id", priority_id: "priorities.id" },
    indexes: ["workspace_id", "status", "predicted_date"],
    description: "Milestone velocity projections and historical accuracy calibration ledger.",
  },
  {
    tableName: "report_shares",
    primaryKey: "id",
    foreignKeys: { workspace_id: "workspaces.id" },
    indexes: ["share_token", "workspace_id", "expires_at"],
    description: "Permission-scoped report access grants and redaction configurations.",
  },
  {
    tableName: "review_settings",
    primaryKey: "workspace_id",
    foreignKeys: { workspace_id: "workspaces.id" },
    indexes: ["workspace_id"],
    description: "User dashboard configurations, custom metric formulas, and alert controls.",
  },
];
