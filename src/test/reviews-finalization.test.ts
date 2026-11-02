import { describe, it, expect } from "vitest";
import { initialState } from "@/lib/os/seed";
import {
  evaluateCustomMetric,
  generatePeriodAlerts,
  calculateMilestoneForecast,
} from "@/lib/os/reviews/analytics";
import {
  addCustomMetric,
  deleteCustomMetric,
  updateAlertSettings,
  updateReflectionTemplates,
  addForecastSnapshot,
  markForecastDelivered,
  createReportShare,
  deleteReportShare,
} from "@/lib/os/reviews/operations";
import { getReviewsService } from "@/lib/os/reviews/service";
import type {
  CustomMetricDefinition,
  AlertSettings,
  ReflectionTemplate,
  ReviewPeriodSummary,
} from "@/lib/os/types";

describe("Reviews Frontend Finalization & Service Architecture", () => {
  const mockSummary: ReviewPeriodSummary = {
    id: "2026-W44",
    type: "weekly",
    startDate: "2026-10-26",
    endDate: "2026-11-01",
    daysIncluded: ["2026-10-26", "2026-10-27", "2026-10-28"],
    totalPlannedHours: 40,
    totalActualHours: 36,
    hoursByPriority: { 1: 18, 2: 12, 3: 6 },
    plannedHoursByPriority: { 1: 20, 2: 12, 3: 8 },
    tasksPlannedTotal: 25,
    tasksDoneTotal: 22,
    taskCompletionRate: 88,
    p2HoursWorkstreamA: 10,
    p2HoursWorkstreamB: 2,
    p2OutputsWorkstreamA: 4,
    p2OutputsWorkstreamB: 1,
    outcomesPlannedTotal: 5,
    outcomesAchievedTotal: 4,
    outcomesRate: 80,
    outcomesByPriority: {
      1: { planned: 2, achieved: 2 },
      2: { planned: 2, achieved: 1 },
      3: { planned: 1, achieved: 1 },
    },
    repeatedUnfinishedTasks: [],
    keyOutputs: [],
    learningsSummary: [],
  };

  it("1. Custom metric formula builder correctly calculates ratios, rates, and yields", () => {
    const yieldMetric: CustomMetricDefinition = {
      id: "cm-yield",
      name: "Outcome Yield Density",
      description: "Outputs per 10 hours",
      formula: "yield_per_hour",
      numerator: "outcomesAchieved",
      denominator: "totalActualHours",
      unit: "ratio",
      targetValue: 0.1,
    };

    const res = evaluateCustomMetric(yieldMetric, mockSummary);
    // 4 outcomes / 36 hours = 0.111 -> 0.1 outputs per hour
    expect(res.value).toBe(0.1);
    expect(res.formatted).toBe("0.1");
    expect(res.targetMet).toBe(true);

    const completionMetric: CustomMetricDefinition = {
      id: "cm-rate",
      name: "Task Velocity",
      description: "Tasks done per planned",
      formula: "rate",
      numerator: "tasksDone",
      denominator: "tasksPlanned",
      unit: "%",
      targetValue: 85,
    };

    const rateRes = evaluateCustomMetric(completionMetric, mockSummary);
    // 22 / 25 * 100 = 88%
    expect(rateRes.value).toBe(88);
    expect(rateRes.formatted).toBe("88%");
    expect(rateRes.targetMet).toBe(true);
  });

  it("2. Configurable alert controls respect custom thresholds and toggles", () => {
    // With 10h in A and 0h in B (or test with p2HoursWorkstreamB = 0)
    const summaryWithImbalance: ReviewPeriodSummary = {
      ...mockSummary,
      p2HoursWorkstreamA: 8,
      p2HoursWorkstreamB: 0,
    };

    const strictAlerts: AlertSettings = {
      workstreamImbalanceThreshold: 80,
      chronicBottleneckThreshold: 2,
      realismDriftMin: 0.7,
      realismDriftMax: 1.3,
      dataGapDaysThreshold: 2,
      enabledAlerts: {
        workstreamImbalance: true,
        chronicBottleneck: true,
        realismDrift: true,
        dataGap: true,
      },
    };

    const alertsTriggered = generatePeriodAlerts(
      summaryWithImbalance,
      [],
      strictAlerts,
    );
    const imbalanceAlert = alertsTriggered.find(
      (a) => a.category === "workstream_imbalance",
    );
    expect(imbalanceAlert).toBeDefined();

    // Now disable workstreamImbalance alert
    const relaxedAlerts: AlertSettings = {
      ...strictAlerts,
      enabledAlerts: {
        ...strictAlerts.enabledAlerts,
        workstreamImbalance: false,
      },
    };

    const alertsSuppressed = generatePeriodAlerts(
      summaryWithImbalance,
      [],
      relaxedAlerts,
    );
    expect(
      alertsSuppressed.find((a) => a.category === "workstream_imbalance"),
    ).toBeUndefined();
  });

  it("3. Custom reflection questions and custom metrics can be stored and mutated in reviewSettings", () => {
    const metric: CustomMetricDefinition = {
      id: "cm-test",
      name: "Test Metric",
      description: "A test",
      formula: "ratio",
      numerator: "actualHours",
      denominator: "plannedHours",
      unit: "ratio",
      targetValue: 0.9,
    };

    let state = addCustomMetric(initialState, metric);
    expect(
      state.reviewSettings?.customMetrics?.some((m) => m.id === "cm-test"),
    ).toBe(true);

    state = deleteCustomMetric(state, "cm-test");
    expect(
      state.reviewSettings?.customMetrics?.some((m) => m.id === "cm-test"),
    ).toBe(false);

    const customTemplates: ReflectionTemplate = {
      daily: ["What was today's high-leverage win?"],
      weekly: ["Did Priority 1 lead execution?"],
      monthly: ["Did we meet our quarterly OKR trajectory?"],
    };

    state = updateReflectionTemplates(state, customTemplates);
    expect(state.reviewSettings?.reflectionTemplates?.daily[0]).toBe(
      "What was today's high-leverage win?",
    );
  });

  it("4. Forecast accuracy & calibration ledger logs predictions and calculates delivery variance", () => {
    let state = addForecastSnapshot(initialState, {
      priorityId: 1,
      milestoneTitle: "V1 Alpha Engine",
      predictedDate: "2026-11-15",
      predictedWeeks: 2,
      hoursNeeded: 30,
      velocityBasisHoursPerWeek: 15,
      confidenceScore: "High",
      status: "projecting",
    });

    const snapshotId = state.forecastHistory![0]!.id;
    expect(snapshotId).toBeDefined();

    // Actual delivered on 2026-11-14 (1 day early -> accurate)
    state = markForecastDelivered(state, snapshotId, "2026-11-14");
    const delivered = state.forecastHistory?.find((f) => f.id === snapshotId);
    expect(delivered?.status).toBe("delivered");
    expect(delivered?.accuracyVarianceDays).toBe(-1);
    expect(delivered?.calibrationRating).toBe("accurate");

    // Test optimistic bias (delivered 8 days late)
    let lateState = addForecastSnapshot(initialState, {
      priorityId: 2,
      milestoneTitle: "Trading API",
      predictedDate: "2026-11-10",
      predictedWeeks: 1,
      status: "projecting",
    });
    const lateId = lateState.forecastHistory![0]!.id;
    lateState = markForecastDelivered(lateState, lateId, "2026-11-18");
    const lateSnapshot = lateState.forecastHistory?.find(
      (f) => f.id === lateId,
    );
    expect(lateSnapshot?.accuracyVarianceDays).toBe(8);
    expect(lateSnapshot?.calibrationRating).toBe("optimistic_bias");
  });

  it("5. Report sharing interface generates scoped permissions and tokenized grants", () => {
    const res = createReportShare(initialState, {
      title: "Week 44 Summary",
      permissionLevel: "summary_only",
      includeFinancials: false,
      includeAuditHistory: false,
    });

    expect(res.share.shareToken).toMatch(/^sec_/);
    expect(res.share.permissionLevel).toBe("summary_only");
    expect(res.share.includeFinancials).toBe(false);

    const revokedState = deleteReportShare(res.state, res.share.id);
    expect(revokedState.sharedReports?.some((s) => s.id === res.share.id)).toBe(
      false,
    );
  });

  it("6. Stable LocalStorageReviewsAdapter service returns typed data matching IReviewsService", async () => {
    const service = getReviewsService();
    expect(service).toBeDefined();

    const settings = await service.getSettings();
    expect(settings).toBeDefined();
    expect(settings.defaultPeriod).toBeDefined();

    const bottlenecks = await service.getBottlenecks();
    expect(Array.isArray(bottlenecks)).toBe(true);

    const improvements = await service.getImprovements();
    expect(Array.isArray(improvements)).toBe(true);
  });
});
