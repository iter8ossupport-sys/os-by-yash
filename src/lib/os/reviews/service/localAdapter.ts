/**
 * LocalStorage Adapter for Yash OS Reviews
 *
 * Implements IReviewsService using browser local storage and deterministic operations.
 * Preserves 100% offline, local-first operation without cloud dependencies.
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
  OSState,
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
import { defaultReviewSettings } from "../fixtures";
import {
  correctDayRecord,
  addOrUpdateBottleneck,
  addImprovement,
  updateImprovement as opUpdateImprovement,
  finalizePeriodReview as opFinalizePeriodReview,
  deletePeriodReview as opDeletePeriodReview,
  addCustomMetric,
  deleteCustomMetric as opDeleteCustomMetric,
  updateAlertSettings as opUpdateAlertSettings,
  updateReflectionTemplates as opUpdateReflectionTemplates,
  addForecastSnapshot,
  markForecastDelivered as opMarkForecastDelivered,
  createReportShare,
  deleteReportShare,
  updateAIInsight,
} from "../operations";

const STORAGE_KEY = "yash-os-v1";

function readState(): OSState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {} as OSState;
}

function writeState(updater: (s: OSState) => OSState): OSState {
  const current = readState();
  const next = updater(current);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export class LocalStorageReviewsAdapter implements IReviewsService {
  async getDayReview(query: DayReviewQuery): Promise<DayReviewResponse> {
    const state = readState();
    const day = state.history?.find((d) => d.date === query.date) ?? null;
    return {
      dayRecord: day,
      isClosedOut: Boolean(day?.finalizedAt || day?.state === "finalized"),
    };
  }

  async saveDayCorrection(req: SaveDayCorrectionRequest): Promise<DayRecord> {
    let corrected: DayRecord | undefined;
    writeState((s) => {
      const next = correctDayRecord(s, req.date, req.field, req.newValue, req.reason);
      corrected = next.history?.find((d: DayRecord) => d.date === req.date);
      return next;
    });
    return corrected!;
  }

  async getPeriodReview(id: string): Promise<PeriodReviewRecord | null> {
    const state = readState();
    return state.periodReviews?.find((p) => p.id === id) ?? null;
  }

  async listPeriodReviews(type?: "weekly" | "monthly"): Promise<PeriodReviewRecord[]> {
    const state = readState();
    const list = state.periodReviews ?? [];
    if (!type) return list;
    return list.filter((p) => p.type === type);
  }

  async finalizePeriodReview(req: FinalizePeriodRequest): Promise<PeriodReviewRecord> {
    writeState((s) => opFinalizePeriodReview(s, req.review));
    return req.review;
  }

  async deletePeriodReview(id: string): Promise<boolean> {
    writeState((s) => opDeletePeriodReview(s, id));
    return true;
  }

  async getBottlenecks(): Promise<ReviewBottleneck[]> {
    const state = readState();
    return state.bottlenecks ?? [];
  }

  async createBottleneck(req: Omit<ReviewBottleneck, "id">): Promise<ReviewBottleneck> {
    let created: ReviewBottleneck | undefined;
    writeState((s) => {
      const next = addOrUpdateBottleneck(s, req);
      created = next.bottlenecks?.find((b: ReviewBottleneck) => b.title === req.title);
      return next;
    });
    return created!;
  }

  async updateBottleneck(id: string, patch: Partial<ReviewBottleneck>): Promise<ReviewBottleneck> {
    let updated: ReviewBottleneck | undefined;
    writeState((s) => {
      const current = s.bottlenecks ?? [];
      const nextBottlenecks = current.map((b) => (b.id === id ? { ...b, ...patch } : b));
      updated = nextBottlenecks.find((b) => b.id === id);
      return { ...s, bottlenecks: nextBottlenecks };
    });
    return updated!;
  }

  async deleteBottleneck(id: string): Promise<boolean> {
    writeState((s) => {
      const current = s.bottlenecks ?? [];
      return { ...s, bottlenecks: current.filter((b) => b.id !== id) };
    });
    return true;
  }

  async getImprovements(): Promise<ReviewImprovement[]> {
    const state = readState();
    return state.improvements ?? [];
  }

  async createImprovement(req: Omit<ReviewImprovement, "id">): Promise<ReviewImprovement> {
    let created: ReviewImprovement | undefined;
    writeState((s) => {
      const next = addImprovement(s, req);
      created = next.improvements?.[0];
      return next;
    });
    return created!;
  }

  async updateImprovement(id: string, patch: Partial<ReviewImprovement>): Promise<ReviewImprovement> {
    let updated: ReviewImprovement | undefined;
    writeState((s) => {
      const next = opUpdateImprovement(s, id, patch);
      updated = next.improvements?.find((i) => i.id === id);
      return next;
    });
    return updated!;
  }

  async deleteImprovement(id: string): Promise<boolean> {
    writeState((s) => {
      const current = s.improvements ?? [];
      return { ...s, improvements: current.filter((i) => i.id !== id) };
    });
    return true;
  }

  async getAIInsights(): Promise<ReviewAIInsight[]> {
    const state = readState();
    return state.aiInsights ?? [];
  }

  async dismissAIInsight(id: string): Promise<boolean> {
    writeState((s) => updateAIInsight(s, id, { status: "dismissed" }));
    return true;
  }

  async convertAIInsightToImprovement(id: string, improvementTitle: string): Promise<ReviewImprovement> {
    const insight = (readState().aiInsights ?? []).find((i) => i.id === id);
    const imp = await this.createImprovement({
      periodType: "weekly",
      periodRef: insight?.evidence.sourcePeriod ?? new Date().toISOString().slice(0, 10),
      priorityId: insight?.priorityId,
      problemStatement: insight?.title ?? "Identified Friction",
      evidence: {
        metrics: insight?.evidence.dataPoints ?? [],
        dayDates: [],
      },
      recommendation: insight?.recommendedAction ?? insight?.body ?? improvementTitle,
      status: "proposed",
      createdAt: new Date().toISOString(),
    });
    writeState((s) => updateAIInsight(s, id, { status: "converted_to_improvement" }));
    return imp;
  }

  async getForecastHistory(): Promise<ForecastSnapshot[]> {
    const state = readState();
    return state.forecastHistory ?? [];
  }

  async saveForecastSnapshot(req: SaveForecastSnapshotRequest): Promise<ForecastSnapshot> {
    let created: ForecastSnapshot | undefined;
    writeState((s) => {
      const next = addForecastSnapshot(s, {
        priorityId: req.priorityId,
        milestoneTitle: req.milestoneTitle,
        hoursNeeded: req.hoursNeeded,
        predictedDate: req.predictedDate,
        predictedWeeks: req.predictedWeeks,
        confidenceScore: req.confidenceScore,
        velocityBasisHoursPerWeek: req.velocityBasisHoursPerWeek,
        status: "projecting",
      });
      created = next.forecastHistory?.[0];
      return next;
    });
    return created!;
  }

  async markForecastDelivered(req: MarkForecastDeliveredRequest): Promise<ForecastSnapshot> {
    let delivered: ForecastSnapshot | undefined;
    writeState((s) => {
      const next = opMarkForecastDelivered(s, req.snapshotId, req.actualDate);
      delivered = next.forecastHistory?.find((f) => f.id === req.snapshotId);
      return next;
    });
    return delivered!;
  }

  async getSharedReports(): Promise<ReportShareConfig[]> {
    const state = readState();
    return state.sharedReports ?? [];
  }

  async createReportShare(req: CreateReportShareRequest): Promise<ReportShareConfig> {
    let share: ReportShareConfig | undefined;
    const expiresAt = req.expiresInDays && req.expiresInDays > 0
      ? new Date(Date.now() + req.expiresInDays * 864e5).toISOString()
      : undefined;

    writeState((s) => {
      const res = createReportShare(s, {
        title: req.title,
        recipient: req.recipient,
        periodType: "period",
        periodRef: req.title,
        permissionLevel: req.permissionLevel,
        includeFinancials: req.includeFinancials,
        includeAuditHistory: req.includeAuditHistory,
        expiresAt,
      });
      share = res.share;
      return res.state;
    });

    return share!;
  }

  async revokeReportShare(id: string): Promise<boolean> {
    writeState((s) => deleteReportShare(s, id));
    return true;
  }

  async getSettings(): Promise<ReviewSettings> {
    const state = readState();
    return state.reviewSettings ?? defaultReviewSettings;
  }

  async updateSettings(settings: Partial<ReviewSettings>): Promise<ReviewSettings> {
    let updated: ReviewSettings | undefined;
    writeState((s) => {
      const current = s.reviewSettings ?? defaultReviewSettings;
      const nextSettings: ReviewSettings = { ...current, ...settings };
      updated = nextSettings;
      return { ...s, reviewSettings: nextSettings };
    });
    return updated!;
  }

  async saveCustomMetric(metric: CustomMetricDefinition): Promise<ReviewSettings> {
    let nextSettings: ReviewSettings | undefined;
    writeState((s) => {
      const next = addCustomMetric(s, metric);
      nextSettings = next.reviewSettings;
      return next;
    });
    return nextSettings ?? defaultReviewSettings;
  }

  async deleteCustomMetric(metricId: string): Promise<ReviewSettings> {
    let nextSettings: ReviewSettings | undefined;
    writeState((s) => {
      const next = opDeleteCustomMetric(s, metricId);
      nextSettings = next.reviewSettings;
      return next;
    });
    return nextSettings ?? defaultReviewSettings;
  }

  async updateAlertSettings(alertSettings: AlertSettings): Promise<ReviewSettings> {
    let nextSettings: ReviewSettings | undefined;
    writeState((s) => {
      const next = opUpdateAlertSettings(s, alertSettings);
      nextSettings = next.reviewSettings;
      return next;
    });
    return nextSettings ?? defaultReviewSettings;
  }

  async updateReflectionTemplates(templates: ReflectionTemplate): Promise<ReviewSettings> {
    let nextSettings: ReviewSettings | undefined;
    writeState((s) => {
      const next = opUpdateReflectionTemplates(s, templates);
      nextSettings = next.reviewSettings;
      return next;
    });
    return nextSettings ?? defaultReviewSettings;
  }
}
