/**
 * Cloud Adapter Contract & Blueprint for Yash OS Reviews
 *
 * Defines the future HTTP/REST/RPC adapter contract for Supabase and Cloudflare Workers.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * - Does NOT initiate network requests or expose external endpoints in this phase.
 * - Enforces authentication boundaries, tenant isolation, and optimistic locking.
 * - Throws ReviewsBackendNotConfiguredError if invoked before the backend is deployed.
 */

import type {
  IReviewsService,
  DayReviewQuery,
  DayReviewResponse,
  SaveDayCorrectionRequest,
  FinalizePeriodRequest,
  SaveForecastSnapshotRequest,
  MarkForecastDeliveredRequest,
  CreateReportShareRequest,
} from "./types";
import type {
  DayRecord,
  PeriodReviewRecord,
  ReviewBottleneck,
  ReviewImprovement,
  ReviewAIInsight,
  ReviewSettings,
  ForecastSnapshot,
  ReportShareConfig,
  CustomMetricDefinition,
  AlertSettings,
  ReflectionTemplate,
} from "../../types";

// ============================================================================
// Future Cloud HTTP Endpoints Mapping
// ============================================================================
export const CLOUD_ENDPOINTS = {
  DAY_REVIEW: "/api/v1/reviews/day",
  DAY_CORRECTION: "/api/v1/reviews/day/correction",
  PERIOD_GET: "/api/v1/reviews/period/:id",
  PERIOD_LIST: "/api/v1/reviews/period",
  PERIOD_FINALIZE: "/api/v1/reviews/period/finalize",
  PERIOD_DELETE: "/api/v1/reviews/period/:id",
  BOTTLENECKS: "/api/v1/reviews/bottlenecks",
  IMPROVEMENTS: "/api/v1/reviews/improvements",
  AI_INSIGHTS: "/api/v1/reviews/ai-insights",
  FORECAST_HISTORY: "/api/v1/reviews/forecast",
  REPORT_SHARES: "/api/v1/reviews/shares",
  SETTINGS: "/api/v1/reviews/settings",
} as const;

// ============================================================================
// Typed Cloud Errors
// ============================================================================
export class ReviewsAPIError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(`[ReviewsAPI ${code}] ${message}`);
    this.name = "ReviewsAPIError";
  }
}

export class ReviewsAuthenticationError extends ReviewsAPIError {
  constructor(
    message = "Authentication session expired or missing Bearer token",
  ) {
    super(401, "AUTH_REQUIRED", message);
    this.name = "ReviewsAuthenticationError";
  }
}

export class ReviewsConflictError extends ReviewsAPIError {
  constructor(
    message = "Concurrent edit conflict detected. Re-fetch latest snapshot.",
  ) {
    super(409, "CONCURRENT_CONFLICT", message);
    this.name = "ReviewsConflictError";
  }
}

export class ReviewsBackendNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloud backend is not yet configured or connected. " +
        "The application is operating in local-first mode using LocalStorageReviewsAdapter. " +
        "Cloud backend integration will occur in the designated backend phase.",
    );
    this.name = "ReviewsBackendNotConfiguredError";
  }
}

// ============================================================================
// Cloud Reviews Adapter Blueprint
// ============================================================================
export interface CloudAdapterConfig {
  baseUrl: string;
  workspaceId: string;
  getAuthToken: () => Promise<string | null>;
}

export class CloudReviewsAdapter implements IReviewsService {
  constructor(private readonly config?: CloudAdapterConfig) {}

  private checkConfigured(): void {
    if (!this.config || !this.config.baseUrl) {
      throw new ReviewsBackendNotConfiguredError();
    }
  }

  // Future helper for injecting secure headers
  protected async getHeaders(
    idempotencyKey?: string,
  ): Promise<Record<string, string>> {
    this.checkConfigured();
    const token = await this.config!.getAuthToken();
    if (!token) throw new ReviewsAuthenticationError();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-YashOS-WorkspaceId": this.config!.workspaceId,
      "X-YashOS-SchemaVersion": "1.0.0",
    };

    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    return headers;
  }

  async getDayReview(_query: DayReviewQuery): Promise<DayReviewResponse> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async saveDayCorrection(_req: SaveDayCorrectionRequest): Promise<DayRecord> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getPeriodReview(_id: string): Promise<PeriodReviewRecord | null> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async listPeriodReviews(
    _type?: "weekly" | "monthly",
  ): Promise<PeriodReviewRecord[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async finalizePeriodReview(
    _req: FinalizePeriodRequest,
  ): Promise<PeriodReviewRecord> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async deletePeriodReview(_id: string): Promise<boolean> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getBottlenecks(): Promise<ReviewBottleneck[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async createBottleneck(
    _req: Omit<ReviewBottleneck, "id">,
  ): Promise<ReviewBottleneck> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async updateBottleneck(
    _id: string,
    _patch: Partial<ReviewBottleneck>,
  ): Promise<ReviewBottleneck> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async deleteBottleneck(_id: string): Promise<boolean> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getImprovements(): Promise<ReviewImprovement[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async createImprovement(
    _req: Omit<ReviewImprovement, "id">,
  ): Promise<ReviewImprovement> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async updateImprovement(
    _id: string,
    _patch: Partial<ReviewImprovement>,
  ): Promise<ReviewImprovement> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async deleteImprovement(_id: string): Promise<boolean> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getAIInsights(): Promise<ReviewAIInsight[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async dismissAIInsight(_id: string): Promise<boolean> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async convertAIInsightToImprovement(
    _id: string,
    _improvementTitle: string,
  ): Promise<ReviewImprovement> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getForecastHistory(): Promise<ForecastSnapshot[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async saveForecastSnapshot(
    _req: SaveForecastSnapshotRequest,
  ): Promise<ForecastSnapshot> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async markForecastDelivered(
    _req: MarkForecastDeliveredRequest,
  ): Promise<ForecastSnapshot> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getSharedReports(): Promise<ReportShareConfig[]> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async createReportShare(
    _req: CreateReportShareRequest,
  ): Promise<ReportShareConfig> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async revokeReportShare(_id: string): Promise<boolean> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async getSettings(): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async updateSettings(
    _settings: Partial<ReviewSettings>,
  ): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async saveCustomMetric(
    _metric: CustomMetricDefinition,
  ): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async deleteCustomMetric(_metricId: string): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async updateAlertSettings(
    _alertSettings: AlertSettings,
  ): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }

  async updateReflectionTemplates(
    _templates: ReflectionTemplate,
  ): Promise<ReviewSettings> {
    this.checkConfigured();
    throw new ReviewsBackendNotConfiguredError();
  }
}
