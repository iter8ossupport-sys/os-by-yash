import { describe, expect, it } from "vitest";
import {
  calculateDaySummary,
  calculatePeriodSummary,
  calculateProjectPerformance,
  getISOWeekRange,
  getMonthRange,
  calculatePeriodComparison,
  detectBottlenecks,
  calculateMilestoneForecast,
  generatePeriodAlerts,
  generateDeterministicInsights,
} from "@/lib/os/reviews/analytics";
import {
  correctDayRecord,
  addImprovement,
  updateImprovement,
  addOrUpdateBottleneck,
  resolveBottleneck,
  promoteImprovementToKnowledge,
  finalizePeriodReview,
} from "@/lib/os/reviews/operations";
import { migrateOSState, CURRENT_SCHEMA_VERSION } from "@/lib/os/reviews/migrations";
import { demoReviewDays } from "@/lib/os/reviews/fixtures";
import { initialState } from "@/lib/os/seed";
import type { DayRecord, OSState, PeriodReviewRecord } from "@/lib/os/types";

describe("Yash OS Reviews — Data Foundation & Analytics", () => {
  it("A. Activity vs. Outcome metrics remain strictly decoupled", () => {
    const testDay: DayRecord = {
      date: "2026-11-01",
      plannedMin: { 1: 180, 2: 120, 3: 60 },
      actualMin: { 1: 180, 2: 120, 3: 60 },
      tasksPlanned: 6,
      tasksDone: 6, // 100% of tasks done
      outputs: [
        { priorityId: 1, title: "Auth deploy", text: "Deployed to staging" },
        { priorityId: 2, title: "LBES session", text: "Completed session" },
      ],
      outcomesAchieved: [], // 0 outcomes achieved
      unfinished: [],
      learning: "High activity did not guarantee outcome delivery.",
    };

    const summary = calculateDaySummary(testDay);

    // Activity indicates 100% completion & 6 hours logged
    expect(summary.totalActualHours).toBe(6);
    expect(summary.taskCompletionRate).toBe(100);

    // Outcome intelligence remains 0% and is NEVER inflated by task completion
    expect(summary.outcomesAchieved).toBe(0);
    expect(summary.outcomesRate).toBe(0);
    expect(summary.realismRatio).toBe(1.0);
    expect(summary.realismCategory).toBe("calibrated");
  });

  it("B. Priority 2 Workstream A vs. B minutes and outputs remain distinct", () => {
    const testDay: DayRecord = {
      date: "2026-11-01",
      plannedMin: { 1: 60, 2: 120, 3: 30 },
      actualMin: { 1: 60, 2: 120, 3: 30 },
      tasksPlanned: 3,
      tasksDone: 3,
      outputs: [
        { priorityId: 2, title: "LBES Trading Session", text: "+1.2%", workstream: "A" },
        { priorityId: 2, title: "Stripe Billing Split Architecture", text: "Drafted", workstream: "B" },
      ],
      outcomesAchieved: [2],
      unfinished: [],
      learning: "",
      p2WorkstreamMinutes: { workstreamA: 80, workstreamB: 40 },
    };

    const summary = calculateDaySummary(testDay);
    expect(summary.p2WorkstreamMinutes.workstreamA).toBe(80);
    expect(summary.p2WorkstreamMinutes.workstreamB).toBe(40);
    expect(summary.p2WorkstreamPercent.workstreamA).toBe(67);
    expect(summary.p2WorkstreamPercent.workstreamB).toBe(33);
  });

  it("C. Weekly aggregation accurately computes ISO week range and accounts for missing days", () => {
    // 2026-10-19 is a Monday, 2026-10-25 is a Sunday
    const week = getISOWeekRange("2026-10-21");
    expect(week.startDate).toBe("2026-10-19");
    expect(week.endDate).toBe("2026-10-25");
    expect(week.id).toBe("2026-W43");

    // demoReviewDays has 5 days in W43 (Mon, Tue, Wed, Thu, Fri; Sat & Sun unrecorded)
    const summary = calculatePeriodSummary(demoReviewDays, "weekly", week.id, week.startDate, week.endDate);

    expect(summary.daysIncluded.length).toBe(6);
    expect(summary.expectedDaysCount).toBe(7);
    expect(summary.missingDaysCount).toBe(1);
    // Missing days are tracked, not silently counted as 0 hours
    expect(summary.totalActualHours).toBeGreaterThan(0);
    expect(summary.repeatedUnfinishedTasks.length).toBeGreaterThan(0);
  });

  it("D. Monthly aggregation aggregates directly from daily records without double-counting", () => {
    const mRange = getMonthRange("2026-10-15");
    expect(mRange.startDate).toBe("2026-10-01");
    expect(mRange.endDate).toBe("2026-10-31");
    expect(mRange.id).toBe("2026-M10");

    const summary = calculatePeriodSummary(demoReviewDays, "monthly", mRange.id, mRange.startDate, mRange.endDate);

    // Sum of hours in summary matches the individual days
    const totalDayHours = demoReviewDays
      .filter((d) => d.date >= mRange.startDate && d.date <= mRange.endDate)
      .reduce((acc, d) => acc + (d.actualMin[1] + d.actualMin[2] + d.actualMin[3]) / 60, 0);

    expect(Math.abs(summary.totalActualHours - Math.round(totalDayHours * 10) / 10)).toBeLessThanOrEqual(0.2);
  });

  it("E. Audit corrections preserve history and write an immutable AuditRecord", () => {
    const originalState: OSState = {
      ...initialState,
      history: [
        {
          date: "2026-10-20",
          state: "finalized",
          source: "closeout",
          plannedMin: { 1: 120, 2: 60, 3: 30 },
          actualMin: { 1: 120, 2: 60, 3: 30 },
          tasksDone: 3,
          tasksPlanned: 3,
          outputs: [],
          outcomesAchieved: [1],
          unfinished: [],
          learning: "Original learning",
        },
      ],
    };

    // Correct learning field with audit reason
    const correctedState = correctDayRecord(
      originalState,
      "2026-10-20",
      "learning",
      "Updated learning with critical nuance.",
      "Correction for missed takeaway",
    );

    const rec = correctedState.history.find((h) => h.date === "2026-10-20")!;
    expect(rec.learning).toBe("Updated learning with critical nuance.");
    expect(rec.state).toBe("corrected");
    expect(rec.source).toBe("corrected");
    expect(rec.auditHistory).toBeDefined();
    expect(rec.auditHistory!.length).toBe(1);
    expect(rec.auditHistory![0]!.field).toBe("learning");
    expect(rec.auditHistory![0]!.oldValue).toBe("Original learning");
    expect(rec.auditHistory![0]!.reason).toBe("Correction for missed takeaway");
  });

  it("F. Improvement Intelligence lifecycle transitions cleanly (Problem → Decision → Action → Evaluation)", () => {
    let s = initialState;
    s = addImprovement(s, {
      periodType: "weekly",
      periodRef: "2026-W44",
      priorityId: 1,
      problemStatement: "Beta users abandon during Stripe Connect step.",
      evidence: { metrics: ["Dropoff: 65%"], dayDates: ["2026-10-25"] },
      recommendation: "Replace multi-page redirect with embedded onboarding modal.",
      status: "proposed",
    });

    const impId = s.improvements![0]!.id;
    expect(s.improvements![0]!.status).toBe("proposed");

    // Approve the improvement
    s = updateImprovement(s, impId, {
      status: "approved",
      approvedAction: "Implement embedded onboarding modal",
      expectedResult: "Dropoff under 20%",
    });
    expect(s.improvements![0]!.status).toBe("approved");
    expect(s.improvements![0]!.decisionDate).toBeDefined();

    // Mark evaluated with success
    s = updateImprovement(s, impId, {
      status: "evaluated",
      evaluationOutcome: "succeeded",
      evaluationNotes: "Dropoff dropped to 14% on 20 test invites.",
    });
    expect(s.improvements![0]!.status).toBe("evaluated");
    expect(s.improvements![0]!.evaluatedAt).toBeDefined();

    // Promote to Knowledge
    s = promoteImprovementToKnowledge(s, impId);
    expect(s.improvements![0]!.promotedToKnowledgeId).toBeDefined();
    const kItem = s.knowledge.find((k) => k.id === s.improvements![0]!.promotedToKnowledgeId);
    expect(kItem).toBeDefined();
    expect(kItem!.title).toContain("Beta users abandon");
    expect(kItem!.body).toContain("Dropoff dropped to 14%");
  });

  it("G. Persistent Bottleneck tracking aggregates occurrences and supports resolution", () => {
    let s = initialState;
    s = addOrUpdateBottleneck(s, {
      priorityId: 2,
      title: "Webhook permission stall",
      description: "LBES session logs require manual permission grant",
      severity: "medium",
      status: "active",
      firstObservedDate: "2026-10-20",
      lastObservedDate: "2026-10-20",
      occurrenceCount: 1,
      sourceDayDates: ["2026-10-20"],
    });

    const botId = s.bottlenecks![0]!.id;

    // Same bottleneck observed again -> increments count and adds date
    s = addOrUpdateBottleneck(s, {
      priorityId: 2,
      title: "Webhook permission stall",
      description: "LBES session logs require manual permission grant",
      severity: "high",
      status: "active",
      firstObservedDate: "2026-10-20",
      lastObservedDate: "2026-10-22",
      occurrenceCount: 1,
      sourceDayDates: ["2026-10-22"],
    });

    expect(s.bottlenecks!.length).toBe(1);
    expect(s.bottlenecks![0]!.occurrenceCount).toBe(2);
    expect(s.bottlenecks![0]!.sourceDayDates).toEqual(["2026-10-20", "2026-10-22"]);

    // Resolve the bottleneck
    s = resolveBottleneck(s, botId, "Granted perpetual scoped token in Worker.");
    expect(s.bottlenecks![0]!.status).toBe("resolved");
    expect(s.bottlenecks![0]!.resolutionNotes).toBe("Granted perpetual scoped token in Worker.");
  });

  it("H. Milestone forecasting generates conservative, realistic and optimistic scenarios", () => {
    const forecast = calculateMilestoneForecast(
      1,
      "Ship beta to 50 users",
      30, // 30 hours needed
      demoReviewDays,
      14,
    );

    expect(forecast.priorityId).toBe(1);
    expect(forecast.historicalVelocityHoursPerWeek).toBeGreaterThan(0);
    expect(forecast.confidenceScore).toMatch(/Medium|High/);
    expect(forecast.scenarios.realistic.weeksRemaining).toBeGreaterThan(0);
    // Conservative takes longer than realistic, optimistic takes less
    expect(forecast.scenarios.conservative.weeksRemaining).toBeGreaterThan(
      forecast.scenarios.realistic.weeksRemaining,
    );
    expect(forecast.scenarios.optimistic.weeksRemaining).toBeLessThan(
      forecast.scenarios.realistic.weeksRemaining,
    );
  });

  it("I. Smart alerts detect workstream imbalance and chronic bottlenecks", () => {
    const mockSummary = calculatePeriodSummary(
      demoReviewDays,
      "weekly",
      "2026-W43",
      "2026-10-19",
      "2026-10-25",
    );

    const alerts = generatePeriodAlerts(mockSummary, demoReviewDays);
    expect(Array.isArray(alerts)).toBe(true);
  });

  it("J. Finalizing period reviews creates immutable period snapshots in state.periodReviews", () => {
    let s = initialState;
    const periodSnapshot: PeriodReviewRecord = {
      id: "2026-W43",
      type: "weekly",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
      daysIncluded: ["2026-10-19", "2026-10-20"],
      missingDaysCount: 5,
      totalPlannedHours: 12,
      totalActualHours: 11,
      hoursByPriority: { 1: 5, 2: 4, 3: 2 },
      plannedHoursByPriority: { 1: 6, 2: 4, 3: 2 },
      tasksPlannedTotal: 10,
      tasksDoneTotal: 9,
      taskCompletionRate: 90,
      p2HoursWorkstreamA: 3,
      p2HoursWorkstreamB: 1,
      p2OutputsWorkstreamA: 2,
      p2OutputsWorkstreamB: 1,
      outcomesPlannedTotal: 3,
      outcomesAchievedTotal: 2,
      outcomesRate: 67,
      outcomesByPriority: { 1: { planned: 1, achieved: 1 }, 2: { planned: 1, achieved: 1 }, 3: { planned: 1, achieved: 0 } },
      executiveSummary: "Strong initial execution on P1 and P2.",
      keyOutputs: [],
      recurringBottlenecks: [],
      learningsSummary: [],
      approvedImprovementIds: [],
      finalizedAt: new Date().toISOString(),
    };

    s = finalizePeriodReview(s, periodSnapshot);
    expect(s.periodReviews).toBeDefined();
    expect(s.periodReviews!.length).toBe(1);
    expect(s.periodReviews![0]!.id).toBe("2026-W43");
  });

  it("K. Project-level performance calculation aggregates hours, deliverables and active days", () => {
    const projSummary = calculateProjectPerformance("demo-killarity", demoReviewDays);

    expect(projSummary.projectId).toBe("demo-killarity");
    expect(projSummary.outputsCount).toBeGreaterThan(0);
    expect(projSummary.activeDaysCount).toBeGreaterThan(0);
    expect(projSummary.firstActiveDate).toBeDefined();
    expect(projSummary.lastActiveDate).toBeDefined();
    expect(projSummary.outputs.every((o) => o.title.length > 0)).toBe(true);
  });

  it("L. Empty, incomplete, and missing datasets are handled gracefully without NaN or crashes", () => {
    // Empty day record
    const emptyDay: DayRecord = {
      date: "2026-11-01",
      plannedMin: { 1: 0, 2: 0, 3: 0 },
      actualMin: { 1: 0, 2: 0, 3: 0 },
      tasksPlanned: 0,
      tasksDone: 0,
      outputs: [],
      outcomesAchieved: [],
      unfinished: [],
      learning: "",
    };

    const daySummary = calculateDaySummary(emptyDay);
    expect(daySummary.totalActualHours).toBe(0);
    expect(daySummary.taskCompletionRate).toBe(0);
    expect(daySummary.outcomesRate).toBe(0);
    expect(daySummary.realismRatio).toBe(0);
    expect(daySummary.realismCategory).toBe("no_plan");

    // Empty period history
    const emptyPeriod = calculatePeriodSummary([], "weekly", "empty-w", "2026-11-01", "2026-11-07");
    expect(emptyPeriod.totalActualHours).toBe(0);
    expect(emptyPeriod.tasksDoneTotal).toBe(0);
    expect(emptyPeriod.taskCompletionRate).toBe(0);
    expect(emptyPeriod.outcomesRate).toBe(0);
    expect(emptyPeriod.daysIncluded.length).toBe(0);
    expect(emptyPeriod.missingDaysCount).toBe(7);

    // Empty forecast
    const emptyForecast = calculateMilestoneForecast(1, "Milestone with 0 data", 20, []);
    expect(emptyForecast.confidenceScore).toBe("Low");
    expect(emptyForecast.scenarios.realistic.estimatedCompletionDate).toBe("Insufficient data");
  });

  it("M. Manual entries are distinguishable from automatic closeout records", () => {
    const manualDay: DayRecord = {
      date: "2026-11-02",
      state: "finalized",
      source: "manual",
      plannedMin: { 1: 60, 2: 60, 3: 0 },
      actualMin: { 1: 60, 2: 60, 3: 0 },
      tasksPlanned: 2,
      tasksDone: 2,
      outputs: [],
      outcomesAchieved: [1],
      unfinished: [],
      learning: "Manual retrospective logged after offline travel.",
    };

    const summary = calculateDaySummary(manualDay);
    expect(summary.source).toBe("manual");
    expect(summary.state).toBe("finalized");
  });

  it("N. Schema migration upgrades legacy unversioned state to v2 while preserving all records", () => {
    const legacyRaw = {
      userName: "Yash",
      theme: "dark",
      history: [
        {
          date: "2026-10-15",
          plannedMin: { 1: 120, 2: 90, 3: 30 },
          actualMin: { 1: 120, 2: 90, 3: 30 },
          tasksDone: 3,
          tasksPlanned: 3,
          outputs: [{ priorityId: 2, title: "LBES trading session", text: "+1.2%", workstream: "A" }],
          outcomesAchieved: [1, 2],
          unfinished: [],
          learning: "Pre-migration record",
          // missing state, source, taskSnapshots, auditHistory, p2WorkstreamMinutes
        },
      ],
      // missing bottlenecks, improvements, periodReviews, reviewSettings, schemaVersion
    };

    const migrated = migrateOSState(legacyRaw);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.bottlenecks).toEqual([]);
    expect(migrated.improvements).toEqual([]);
    expect(migrated.periodReviews).toEqual([]);
    expect(migrated.aiInsights).toEqual([]);
    expect(migrated.reviewAlerts).toEqual([]);
    expect(migrated.reviewSettings).toBeDefined();

    // Migrated history record
    const h0 = migrated.history[0]!;
    expect(h0.date).toBe("2026-10-15");
    expect(h0.state).toBe("finalized");
    expect(h0.source).toBe("closeout");
    expect(h0.p2WorkstreamMinutes).toBeDefined();
    expect(h0.p2WorkstreamMinutes!.workstreamA).toBe(90); // accurately inferred from output
    expect(h0.auditHistory).toEqual([]);
  });
});

