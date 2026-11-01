/**
 * Yash OS Reviews — Service Interface & API Contracts
 *
 * Defines stable interfaces and strongly typed request/response DTOs for all Reviews operations.
 * Separates UI presentation from underlying persistence (LocalStorage today, Cloud tomorrow).
 */

import type {
  DayRecord,
  PeriodReviewRecord,
  ReviewBottleneck,
  ReviewImprovement,
  ReviewAIInsight,
  ReviewAlert,
  ReviewSettings,
  ForecastSnapshot,
  ReportShareConfig,
  CustomMetricDefinition,
  AlertSettings,
  ReflectionTemplate,
  PriorityId,
} from "../../types";

// ============================================================================
// DTOs & Query Contracts
// ============================================================================

export interface DayReviewQuery {
  date: string; // YYYY-MM-DD
}

export interface DayReviewResponse {
  dayRecord: DayRecord | null;
  isClosedOut: boolean;
}

export interface SaveDayCorrectionRequest {
  date: string;
  field: keyof DayRecord;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface PeriodReviewQuery {
  id?: string; // e.g. "2026-W44"
  type: "weekly" | "monthly" | "custom";
  startDate: string;
  endDate: string;
}

export interface PeriodReviewResponse {
  review: PeriodReviewRecord | null;
}

export interface FinalizePeriodRequest {
  review: PeriodReviewRecord;
}

export interface SaveForecastSnapshotRequest {
  priorityId: PriorityId;
  milestoneTitle: string;
  hoursNeeded?: number | undefined;
  predictedDate: string;
  predictedWeeks: number;
  confidenceScore?: "Low" | "Medium" | "High" | undefined;
  velocityBasisHoursPerWeek?: number | undefined;
}

export interface MarkForecastDeliveredRequest {
  snapshotId: string;
  actualDate: string;
}

export interface CreateReportShareRequest {
  title: string;
  recipient?: string | undefined;
  permissionLevel: "summary_only" | "full_with_reflections" | "anonymized_founder";
  includeFinancials: boolean;
  includeAuditHistory: boolean;
  expiresInDays?: number | undefined;
}

// ============================================================================
// Core Reviews Service Interface
// ============================================================================

export interface IReviewsService {
  // Day Reviews
  getDayReview(query: DayReviewQuery): Promise<DayReviewResponse>;
  saveDayCorrection(req: SaveDayCorrectionRequest): Promise<DayRecord>;

  // Period Reviews
  getPeriodReview(id: string): Promise<PeriodReviewRecord | null>;
  listPeriodReviews(type?: "weekly" | "monthly"): Promise<PeriodReviewRecord[]>;
  finalizePeriodReview(req: FinalizePeriodRequest): Promise<PeriodReviewRecord>;
  deletePeriodReview(id: string): Promise<boolean>;

  // Bottlenecks
  getBottlenecks(): Promise<ReviewBottleneck[]>;
  createBottleneck(req: Omit<ReviewBottleneck, "id">): Promise<ReviewBottleneck>;
  updateBottleneck(id: string, patch: Partial<ReviewBottleneck>): Promise<ReviewBottleneck>;
  deleteBottleneck(id: string): Promise<boolean>;

  // Improvements
  getImprovements(): Promise<ReviewImprovement[]>;
  createImprovement(req: Omit<ReviewImprovement, "id">): Promise<ReviewImprovement>;
  updateImprovement(id: string, patch: Partial<ReviewImprovement>): Promise<ReviewImprovement>;
  deleteImprovement(id: string): Promise<boolean>;

  // AI Insights
  getAIInsights(): Promise<ReviewAIInsight[]>;
  dismissAIInsight(id: string): Promise<boolean>;
  convertAIInsightToImprovement(id: string, improvementTitle: string): Promise<ReviewImprovement>;

  // Forecast Calibration
  getForecastHistory(): Promise<ForecastSnapshot[]>;
  saveForecastSnapshot(req: SaveForecastSnapshotRequest): Promise<ForecastSnapshot>;
  markForecastDelivered(req: MarkForecastDeliveredRequest): Promise<ForecastSnapshot>;

  // Report Sharing & Permissions
  getSharedReports(): Promise<ReportShareConfig[]>;
  createReportShare(req: CreateReportShareRequest): Promise<ReportShareConfig>;
  revokeReportShare(id: string): Promise<boolean>;

  // Settings & Configuration
  getSettings(): Promise<ReviewSettings>;
  updateSettings(settings: Partial<ReviewSettings>): Promise<ReviewSettings>;
  saveCustomMetric(metric: CustomMetricDefinition): Promise<ReviewSettings>;
  deleteCustomMetric(metricId: string): Promise<ReviewSettings>;
  updateAlertSettings(alertSettings: AlertSettings): Promise<ReviewSettings>;
  updateReflectionTemplates(templates: ReflectionTemplate): Promise<ReviewSettings>;
}
