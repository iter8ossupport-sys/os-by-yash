import type {
  AlertSettings,
  CustomMetricDefinition,
  DayRecord,
  MilestoneForecast,
  PriorityId,
  ProjectPerformanceSummary,
  ReviewAIInsight,
  ReviewAlert,
  ReviewPeriodSummary,
  ReviewPeriodType,
  ReviewImprovement,
} from "../types";

const ALL_PRIORITIES: PriorityId[] = [1, 2, 3];

export interface DaySummaryMetrics {
  date: string;
  totalPlannedMin: number;
  totalActualMin: number;
  totalPlannedHours: number;
  totalActualHours: number;
  tasksPlanned: number;
  tasksDone: number;
  taskCompletionRate: number; // 0 to 100
  plannedMinByPriority: Record<PriorityId, number>;
  actualMinByPriority: Record<PriorityId, number>;
  priorityDistributionPercent: Record<PriorityId, number>;
  p2WorkstreamMinutes: { workstreamA: number; workstreamB: number };
  p2WorkstreamPercent: { workstreamA: number; workstreamB: number };
  outcomesPlanned: number; // number of priorities planned
  outcomesAchieved: number;
  outcomesRate: number; // 0 to 100
  realismRatio: number; // actual / planned
  realismCategory:
    "under_allocated" | "calibrated" | "over_extended" | "no_plan";
  state: "live" | "finalized" | "corrected";
  source: "closeout" | "manual" | "corrected";
  hasAuditCorrection: boolean;
}

export interface PeriodComparisonResult {
  currentId: string;
  previousId: string;
  totalHoursDelta: number;
  totalHoursDeltaPercent: number | null;
  taskCompletionRateDelta: number; // percentage points
  outcomesRateDelta: number; // percentage points
  priorityHoursDelta: Record<PriorityId, number>;
  p2WorkstreamADeltaHours: number;
  p2WorkstreamBDeltaHours: number;
}

/**
 * Calculates deterministic performance and outcome metrics for a single DayRecord.
 * Activity and Outcome metrics are kept strictly separate.
 */
export function calculateDaySummary(day: DayRecord): DaySummaryMetrics {
  const plannedMinByPriority: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  const actualMinByPriority: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };

  ALL_PRIORITIES.forEach((id) => {
    plannedMinByPriority[id] = day.plannedMin?.[id] ?? 0;
    actualMinByPriority[id] = day.actualMin?.[id] ?? 0;
  });

  const totalPlannedMin = Object.values(plannedMinByPriority).reduce(
    (a, b) => a + b,
    0,
  );
  const totalActualMin = Object.values(actualMinByPriority).reduce(
    (a, b) => a + b,
    0,
  );

  const priorityDistributionPercent: Record<PriorityId, number> = {
    1: 0,
    2: 0,
    3: 0,
  };
  ALL_PRIORITIES.forEach((id) => {
    priorityDistributionPercent[id] =
      totalActualMin > 0
        ? Math.round((actualMinByPriority[id] / totalActualMin) * 100)
        : 0;
  });

  const tasksPlanned = day.tasksPlanned ?? 0;
  const tasksDone = day.tasksDone ?? 0;
  const taskCompletionRate =
    tasksPlanned > 0
      ? Math.min(100, Math.round((tasksDone / tasksPlanned) * 100))
      : 0;

  // Priority 2 Workstream A / B calculations
  let workstreamA = day.p2WorkstreamMinutes?.workstreamA ?? 0;
  let workstreamB = day.p2WorkstreamMinutes?.workstreamB ?? 0;

  // Fallback: If p2WorkstreamMinutes wasn't explicitly populated, infer from outputs
  if (workstreamA === 0 && workstreamB === 0 && actualMinByPriority[2] > 0) {
    const p2Outputs = (day.outputs ?? []).filter((o) => o.priorityId === 2);
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

    if (hasA && !hasB) workstreamA = actualMinByPriority[2];
    else if (hasB && !hasA) workstreamB = actualMinByPriority[2];
    else if (hasA && hasB) {
      workstreamA = Math.round(actualMinByPriority[2] / 2);
      workstreamB = actualMinByPriority[2] - workstreamA;
    } else {
      // Default to Workstream A (foundation core) if unspecified
      workstreamA = actualMinByPriority[2];
    }
  }

  const totalP2Workstream = workstreamA + workstreamB;
  const p2WorkstreamPercent = {
    workstreamA:
      totalP2Workstream > 0
        ? Math.round((workstreamA / totalP2Workstream) * 100)
        : 0,
    workstreamB:
      totalP2Workstream > 0
        ? Math.round((workstreamB / totalP2Workstream) * 100)
        : 0,
  };

  // Outcome Intelligence (Never conflated with activity time)
  // Outcomes planned: active priorities that had planned minutes > 0
  const plannedPrioritiesCount = ALL_PRIORITIES.filter(
    (id) => plannedMinByPriority[id] > 0,
  ).length;
  const outcomesPlanned =
    plannedPrioritiesCount > 0 ? plannedPrioritiesCount : 3;
  const outcomesAchieved = (day.outcomesAchieved ?? []).length;
  const outcomesRate = Math.min(
    100,
    Math.round((outcomesAchieved / outcomesPlanned) * 100),
  );

  // Plan Realism Factor
  const realismRatio =
    totalPlannedMin > 0
      ? Math.round((totalActualMin / totalPlannedMin) * 100) / 100
      : 0;
  let realismCategory: DaySummaryMetrics["realismCategory"] = "no_plan";
  if (totalPlannedMin > 0) {
    if (realismRatio < 0.85) realismCategory = "under_allocated";
    else if (realismRatio <= 1.15) realismCategory = "calibrated";
    else realismCategory = "over_extended";
  }

  const state =
    day.state ?? (day.auditHistory?.length ? "corrected" : "finalized");
  const source =
    day.source ?? (day.auditHistory?.length ? "corrected" : "closeout");
  const hasAuditCorrection = Boolean(
    day.auditHistory && day.auditHistory.length > 0,
  );

  return {
    date: day.date,
    totalPlannedMin,
    totalActualMin,
    totalPlannedHours: Math.round((totalPlannedMin / 60) * 10) / 10,
    totalActualHours: Math.round((totalActualMin / 60) * 10) / 10,
    tasksPlanned,
    tasksDone,
    taskCompletionRate,
    plannedMinByPriority,
    actualMinByPriority,
    priorityDistributionPercent,
    p2WorkstreamMinutes: { workstreamA, workstreamB },
    p2WorkstreamPercent,
    outcomesPlanned,
    outcomesAchieved,
    outcomesRate,
    realismRatio,
    realismCategory,
    state,
    source,
    hasAuditCorrection,
  };
}

/**
 * Aggregates multiple DayRecords across a given period (Weekly, Monthly, Custom)
 * with strict date boundary inclusion and zero double-counting.
 */
export function calculatePeriodSummary(
  history: DayRecord[],
  periodType: ReviewPeriodType,
  id: string,
  startDate: string,
  endDate: string,
): ReviewPeriodSummary {
  // Inclusive date filter
  const records = history
    .filter((r) => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysIncluded = records.map((r) => r.date);

  const hoursByPriority: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  const plannedHoursByPriority: Record<PriorityId, number> = {
    1: 0,
    2: 0,
    3: 0,
  };
  const outcomesByPriority: Record<
    PriorityId,
    { planned: number; achieved: number }
  > = {
    1: { planned: 0, achieved: 0 },
    2: { planned: 0, achieved: 0 },
    3: { planned: 0, achieved: 0 },
  };

  let totalPlannedMin = 0;
  let totalActualMin = 0;
  let tasksPlannedTotal = 0;
  let tasksDoneTotal = 0;

  let p2MinWorkstreamA = 0;
  let p2MinWorkstreamB = 0;
  let p2OutputsWorkstreamA = 0;
  let p2OutputsWorkstreamB = 0;

  const repeatedTaskMap: Record<
    string,
    { count: number; priorityId: PriorityId }
  > = {};
  const keyOutputs: ReviewPeriodSummary["keyOutputs"] = [];
  const learningsSummary: ReviewPeriodSummary["learningsSummary"] = [];

  records.forEach((day) => {
    const summary = calculateDaySummary(day);

    totalPlannedMin += summary.totalPlannedMin;
    totalActualMin += summary.totalActualMin;
    tasksPlannedTotal += summary.tasksPlanned;
    tasksDoneTotal += summary.tasksDone;

    ALL_PRIORITIES.forEach((priId) => {
      hoursByPriority[priId] +=
        Math.round((summary.actualMinByPriority[priId] / 60) * 10) / 10;
      plannedHoursByPriority[priId] +=
        Math.round((summary.plannedMinByPriority[priId] / 60) * 10) / 10;

      if (summary.plannedMinByPriority[priId] > 0) {
        outcomesByPriority[priId].planned += 1;
      }
      if ((day.outcomesAchieved ?? []).includes(priId)) {
        outcomesByPriority[priId].achieved += 1;
      }
    });

    p2MinWorkstreamA += summary.p2WorkstreamMinutes.workstreamA;
    p2MinWorkstreamB += summary.p2WorkstreamMinutes.workstreamB;

    // Output tracking
    (day.outputs ?? []).forEach((out) => {
      keyOutputs.push({
        date: day.date,
        priorityId: out.priorityId,
        title: out.title,
        text: out.text,
        workstream: out.workstream,
      });

      if (out.priorityId === 2) {
        if (
          out.workstream === "A" ||
          /cash|trading|session/i.test(out.workstream ?? "")
        ) {
          p2OutputsWorkstreamA += 1;
        } else if (
          out.workstream === "B" ||
          /fintech|product|saas|api/i.test(out.workstream ?? "")
        ) {
          p2OutputsWorkstreamB += 1;
        }
      }
    });

    // Unfinished task frequency
    (day.unfinished ?? []).forEach((unf) => {
      const trimmed = unf.trim();
      if (!trimmed) return;
      if (!repeatedTaskMap[trimmed]) {
        // Estimate priority from outputs or default to P1
        repeatedTaskMap[trimmed] = { count: 0, priorityId: 1 };
      }
      repeatedTaskMap[trimmed].count += 1;
    });

    if (day.learning && day.learning.trim()) {
      learningsSummary.push({ date: day.date, text: day.learning.trim() });
    }
  });

  const taskCompletionRate =
    tasksPlannedTotal > 0
      ? Math.min(100, Math.round((tasksDoneTotal / tasksPlannedTotal) * 100))
      : 0;

  const outcomesPlannedTotal = Object.values(outcomesByPriority).reduce(
    (acc, curr) => acc + curr.planned,
    0,
  );
  const outcomesAchievedTotal = Object.values(outcomesByPriority).reduce(
    (acc, curr) => acc + curr.achieved,
    0,
  );
  const outcomesRate =
    outcomesPlannedTotal > 0
      ? Math.min(
          100,
          Math.round((outcomesAchievedTotal / outcomesPlannedTotal) * 100),
        )
      : 0;

  const repeatedUnfinishedTasks = Object.entries(repeatedTaskMap)
    .filter(([, data]) => data.count >= 1)
    .map(([title, data]) => ({
      title,
      count: data.count,
      priorityId: data.priorityId,
    }))
    .sort((a, b) => b.count - a.count);

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const expectedDaysCount = Math.max(
    1,
    Math.round((endMs - startMs) / 864e5) + 1,
  );
  const missingDaysCount = Math.max(0, expectedDaysCount - daysIncluded.length);

  return {
    id,
    type: periodType,
    startDate,
    endDate,
    daysIncluded,
    expectedDaysCount,
    missingDaysCount,
    totalPlannedHours: Math.round((totalPlannedMin / 60) * 10) / 10,
    totalActualHours: Math.round((totalActualMin / 60) * 10) / 10,
    hoursByPriority,
    plannedHoursByPriority,
    tasksPlannedTotal,
    tasksDoneTotal,
    taskCompletionRate,
    p2HoursWorkstreamA: Math.round((p2MinWorkstreamA / 60) * 10) / 10,
    p2HoursWorkstreamB: Math.round((p2MinWorkstreamB / 60) * 10) / 10,
    p2OutputsWorkstreamA,
    p2OutputsWorkstreamB,
    outcomesPlannedTotal,
    outcomesAchievedTotal,
    outcomesRate,
    outcomesByPriority,
    repeatedUnfinishedTasks,
    keyOutputs,
    learningsSummary,
  };
}

/**
 * Returns deterministic start (Monday) and end (Sunday) dates for an ISO 8601 calendar week.
 */
export function getISOWeekRange(dateInput: Date | string): {
  startDate: string;
  endDate: string;
  weekNumber: number;
  year: number;
  id: string;
} {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMon = day === 0 ? -6 : 1 - day;

  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);

  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  // ISO week calculation
  const target = new Date(mon.valueOf());
  const dayNr = (mon.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber =
    1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = mon.getFullYear();

  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  const startDate = toIso(mon);
  const endDate = toIso(sun);
  const id = `${year}-W${String(weekNumber).padStart(2, "0")}`;

  return { startDate, endDate, weekNumber, year, id };
}

/**
 * Returns start and end dates for a full calendar month.
 */
export function getMonthRange(dateInput: Date | string): {
  startDate: string;
  endDate: string;
  year: number;
  month: number;
  id: string;
} {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const id = `${year}-M${String(month).padStart(2, "0")}`;

  return { startDate, endDate, year, month, id };
}

/**
 * Computes deterministic deltas between two review periods.
 */
export function calculatePeriodComparison(
  current: ReviewPeriodSummary,
  previous: ReviewPeriodSummary,
): PeriodComparisonResult {
  const totalHoursDelta =
    Math.round((current.totalActualHours - previous.totalActualHours) * 10) /
    10;
  const totalHoursDeltaPercent =
    previous.totalActualHours > 0
      ? Math.round(
          ((current.totalActualHours - previous.totalActualHours) /
            previous.totalActualHours) *
            100,
        )
      : null;

  const taskCompletionRateDelta =
    current.taskCompletionRate - previous.taskCompletionRate;
  const outcomesRateDelta = current.outcomesRate - previous.outcomesRate;

  const priorityHoursDelta: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  ALL_PRIORITIES.forEach((id) => {
    priorityHoursDelta[id] =
      Math.round(
        (current.hoursByPriority[id] - previous.hoursByPriority[id]) * 10,
      ) / 10;
  });

  const p2WorkstreamADeltaHours =
    Math.round(
      (current.p2HoursWorkstreamA - previous.p2HoursWorkstreamA) * 10,
    ) / 10;
  const p2WorkstreamBDeltaHours =
    Math.round(
      (current.p2HoursWorkstreamB - previous.p2HoursWorkstreamB) * 10,
    ) / 10;

  return {
    currentId: current.id,
    previousId: previous.id,
    totalHoursDelta,
    totalHoursDeltaPercent,
    taskCompletionRateDelta,
    outcomesRateDelta,
    priorityHoursDelta,
    p2WorkstreamADeltaHours,
    p2WorkstreamBDeltaHours,
  };
}

/**
 * Scans recent execution history and detects recurring bottlenecks and friction.
 */
export function detectBottlenecks(
  history: DayRecord[],
  windowDays = 14,
): {
  title: string;
  priorityId: PriorityId;
  occurrences: number;
  days: string[];
}[] {
  const cutoff = new Date(Date.now() - windowDays * 864e5)
    .toISOString()
    .slice(0, 10);
  const recent = history.filter((h) => h.date >= cutoff);

  const map: Record<string, { priorityId: PriorityId; days: Set<string> }> = {};

  recent.forEach((day) => {
    (day.unfinished ?? []).forEach((unf) => {
      const norm = unf.trim();
      if (!norm) return;
      if (!map[norm]) map[norm] = { priorityId: 1, days: new Set() };
      map[norm].days.add(day.date);
    });

    (day.bottlenecksNoted ?? []).forEach((bot) => {
      const norm = bot.trim();
      if (!norm) return;
      if (!map[norm]) map[norm] = { priorityId: 2, days: new Set() };
      map[norm].days.add(day.date);
    });
  });

  return Object.entries(map)
    .filter(([, item]) => item.days.size >= 2)
    .map(([title, item]) => ({
      title,
      priorityId: item.priorityId,
      occurrences: item.days.size,
      days: Array.from(item.days).sort(),
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Deterministic milestone forecast based on real historical velocity and outcome rate.
 */
export function calculateMilestoneForecast(
  priorityId: PriorityId,
  milestoneTitle: string,
  estimatedHoursNeeded: number,
  history: DayRecord[],
  windowDays = 14,
): MilestoneForecast {
  const cutoff = new Date(Date.now() - windowDays * 864e5)
    .toISOString()
    .slice(0, 10);
  const sample = history.filter((h) => h.date >= cutoff);

  const minThreshold = 3;
  if (sample.length < minThreshold || estimatedHoursNeeded <= 0) {
    return {
      priorityId,
      milestoneTitle,
      historicalVelocityHoursPerWeek: 0,
      outcomeSuccessRate: 0,
      scenarios: {
        conservative: {
          estimatedCompletionDate: "Insufficient data",
          weeksRemaining: 0,
          hoursNeeded: estimatedHoursNeeded,
        },
        realistic: {
          estimatedCompletionDate: "Insufficient data",
          weeksRemaining: 0,
          hoursNeeded: estimatedHoursNeeded,
        },
        optimistic: {
          estimatedCompletionDate: "Insufficient data",
          weeksRemaining: 0,
          hoursNeeded: estimatedHoursNeeded,
        },
      },
      confidenceScore: "Low",
      evidenceBasis: `Requires at least ${minThreshold} closed days in the last ${windowDays} days for deterministic velocity. Currently has ${sample.length} day(s).`,
    };
  }

  // Calculate actual hours devoted to this priority
  const totalPriHours = sample.reduce(
    (acc, day) => acc + (day.actualMin?.[priorityId] ?? 0) / 60,
    0,
  );
  const weeksInSample = Math.max(1, sample.length / 7);
  const velocityPerWeek = Math.max(0.5, totalPriHours / weeksInSample);

  // Outcome success rate for this priority
  const daysWithOutcomesPlanned = sample.filter(
    (d) => (d.plannedMin?.[priorityId] ?? 0) > 0,
  ).length;
  const daysWithOutcomesAchieved = sample.filter((d) =>
    (d.outcomesAchieved ?? []).includes(priorityId),
  ).length;
  const outcomeSuccessRate =
    daysWithOutcomesPlanned > 0
      ? Math.max(0.2, daysWithOutcomesAchieved / daysWithOutcomesPlanned)
      : 0.5;

  // Realistic velocity factoring outcome efficiency
  const effectiveVelocityHoursPerWeek = velocityPerWeek * outcomeSuccessRate;

  const realisticWeeks = Math.max(
    0.5,
    Math.ceil((estimatedHoursNeeded / effectiveVelocityHoursPerWeek) * 10) / 10,
  );
  const conservativeWeeks = Math.round(realisticWeeks * 1.35 * 10) / 10;
  const optimisticWeeks = Math.max(
    0.2,
    Math.round(realisticWeeks * 0.75 * 10) / 10,
  );

  const addWeeks = (w: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(w * 7));
    return d.toISOString().slice(0, 10);
  };

  const confidenceScore: MilestoneForecast["confidenceScore"] =
    sample.length >= 7 ? "High" : sample.length >= 4 ? "Medium" : "Low";

  return {
    priorityId,
    milestoneTitle,
    historicalVelocityHoursPerWeek: Math.round(velocityPerWeek * 10) / 10,
    outcomeSuccessRate: Math.round(outcomeSuccessRate * 100) / 100,
    scenarios: {
      conservative: {
        estimatedCompletionDate: addWeeks(conservativeWeeks),
        weeksRemaining: conservativeWeeks,
        hoursNeeded: estimatedHoursNeeded,
      },
      realistic: {
        estimatedCompletionDate: addWeeks(realisticWeeks),
        weeksRemaining: realisticWeeks,
        hoursNeeded: estimatedHoursNeeded,
      },
      optimistic: {
        estimatedCompletionDate: addWeeks(optimisticWeeks),
        weeksRemaining: optimisticWeeks,
        hoursNeeded: estimatedHoursNeeded,
      },
    },
    confidenceScore,
    evidenceBasis: `Computed from ${sample.length} closed execution days with ${Math.round(totalPriHours)}h logged on Priority #${priorityId} (Outcome rate: ${Math.round(outcomeSuccessRate * 100)}%).`,
  };
}

/**
 * Calculates improvement intelligence lifecycle metrics.
 */
export function calculateImprovementStats(
  improvements: ReviewImprovement[] = [],
) {
  const total = improvements.length;
  const proposed = improvements.filter((i) => i.status === "proposed").length;
  const approved = improvements.filter((i) => i.status === "approved").length;
  const implemented = improvements.filter(
    (i) => i.status === "implemented",
  ).length;
  const evaluated = improvements.filter((i) => i.status === "evaluated").length;

  const evaluatedWithOutcome = improvements.filter(
    (i) =>
      i.evaluationOutcome === "succeeded" ||
      i.evaluationOutcome === "partially_succeeded",
  ).length;

  const successRate =
    evaluated > 0 ? Math.round((evaluatedWithOutcome / evaluated) * 100) : 0;

  return {
    total,
    proposed,
    approved,
    implemented,
    evaluated,
    successRate,
  };
}

/**
 * Scans period performance and execution patterns to generate smart operational alerts.
 */
export function generatePeriodAlerts(
  summary: ReviewPeriodSummary,
  records: DayRecord[] = [],
  settings?: AlertSettings,
): ReviewAlert[] {
  const alerts: ReviewAlert[] = [];
  const nowIso = new Date().toISOString();

  const enabled = settings?.enabledAlerts ?? {
    workstreamImbalance: true,
    chronicBottleneck: true,
    realismDrift: true,
    dataGap: true,
  };

  const chronicThreshold = settings?.chronicBottleneckThreshold ?? 2;
  const driftMin = settings?.realismDriftMin ?? 0.7;
  const driftMax = settings?.realismDriftMax ?? 1.35;
  const gapThreshold = settings?.dataGapDaysThreshold ?? 2;

  // 1. Priority 2 Workstream Imbalance Check
  if (
    enabled.workstreamImbalance &&
    summary.p2HoursWorkstreamA >= 2.5 &&
    summary.p2HoursWorkstreamB === 0
  ) {
    alerts.push({
      id: `alt-p2-imbalance-${summary.id}`,
      title: "P2 Workstream Imbalance",
      message: `Priority 2 logged ${summary.p2HoursWorkstreamA}h in Workstream A (Cashflow/Trading) but 0h in Workstream B (Fintech Product Capability).`,
      severity: "warning",
      category: "workstream_imbalance",
      periodRef: summary.id,
      timestamp: nowIso,
    });
  }

  // 2. Chronic Bottleneck Detection
  if (enabled.chronicBottleneck) {
    const chronic = summary.repeatedUnfinishedTasks.find(
      (t) => t.count >= chronicThreshold,
    );
    if (chronic) {
      alerts.push({
        id: `alt-chronic-${summary.id}`,
        title: "Chronic Execution Bottleneck",
        message: `"${chronic.title}" remained unfinished across ${chronic.count} separate review days in this period.`,
        severity: "critical",
        category: "chronic_bottleneck",
        periodRef: summary.id,
        timestamp: nowIso,
      });
    }
  }

  // 3. Planning Realism Drift
  if (enabled.realismDrift && summary.totalPlannedHours > 0) {
    const ratio = summary.totalActualHours / summary.totalPlannedHours;
    if (ratio < driftMin && summary.totalPlannedHours >= 5) {
      alerts.push({
        id: `alt-drift-under-${summary.id}`,
        title: "Planning Over-Commitment",
        message: `Actual hours (${summary.totalActualHours}h) fell below ${Math.round(driftMin * 100)}% of planned allocation (${summary.totalPlannedHours}h). Scoping calibration recommended.`,
        severity: "warning",
        category: "realism_drift",
        periodRef: summary.id,
        timestamp: nowIso,
      });
    } else if (ratio > driftMax) {
      alerts.push({
        id: `alt-drift-over-${summary.id}`,
        title: "Extended Execution Spillover",
        message: `Actual hours (${summary.totalActualHours}h) exceeded planned capacity by ${Math.round((ratio - 1) * 100)}%. Protect recovery margins.`,
        severity: "info",
        category: "realism_drift",
        periodRef: summary.id,
        timestamp: nowIso,
      });
    }
  }

  // 4. Missing Data Gaps
  if (
    enabled.dataGap &&
    (summary.missingDaysCount ?? 0) >= gapThreshold &&
    summary.type === "weekly"
  ) {
    alerts.push({
      id: `alt-gap-${summary.id}`,
      title: "Data Continuity Gap",
      message: `${summary.missingDaysCount} of 7 days had no recorded execution in this weekly period.`,
      severity: "info",
      category: "data_gap",
      periodRef: summary.id,
      timestamp: nowIso,
    });
  }

  return alerts;
}

/**
 * Evaluates a user-defined custom metric formula against aggregated period metrics.
 */
export function evaluateCustomMetric(
  metric: CustomMetricDefinition,
  summary: ReviewPeriodSummary,
): { value: number; formatted: string; targetMet: boolean } {
  // 1. Numerator resolution
  let numVal = 0;
  if (metric.numerator === "actualHours") {
    numVal = metric.priorityFilter
      ? (summary.hoursByPriority[metric.priorityFilter] ?? 0)
      : summary.totalActualHours;
  } else if (metric.numerator === "tasksDone") {
    numVal = summary.tasksDoneTotal;
  } else if (metric.numerator === "outcomesAchieved") {
    numVal = summary.outcomesAchievedTotal;
  } else if (metric.numerator === "p2HoursA") {
    numVal = summary.p2HoursWorkstreamA;
  } else if (metric.numerator === "p2HoursB") {
    numVal = summary.p2HoursWorkstreamB;
  }

  // 2. Denominator resolution
  let denVal = 1;
  if (metric.denominator === "plannedHours") {
    denVal = metric.priorityFilter
      ? (summary.plannedHoursByPriority[metric.priorityFilter] ?? 1)
      : summary.totalPlannedHours;
  } else if (metric.denominator === "tasksPlanned") {
    denVal = summary.tasksPlannedTotal;
  } else if (metric.denominator === "totalActualHours") {
    denVal = summary.totalActualHours;
  } else if (metric.denominator === "recordedDays") {
    denVal = summary.daysIncluded.length;
  }

  if (denVal <= 0) denVal = 1;

  // 3. Mathematical calculation
  let raw = 0;
  if (metric.formula === "ratio" || metric.formula === "rate") {
    raw =
      metric.unit === "%"
        ? Math.round((numVal / denVal) * 100)
        : Math.round((numVal / denVal) * 100) / 100;
  } else if (metric.formula === "yield_per_hour") {
    raw = Math.round((numVal / Math.max(0.1, denVal)) * 10) / 10;
  } else {
    raw = Math.round((numVal / denVal) * 10) / 10;
  }

  const formatted =
    metric.unit === "%"
      ? `${raw}%`
      : metric.unit === "h"
        ? `${raw}h`
        : `${raw}`;
  const targetMet = raw >= metric.targetValue;

  return { value: raw, formatted, targetMet };
}

/**
 * Generates evidence-grounded AI Analyst items (Facts, Insights, Recommendations)
 * without any hallucinations or unbacked metrics.
 */
export function generateDeterministicInsights(
  summary: ReviewPeriodSummary,
  records: DayRecord[] = [],
): ReviewAIInsight[] {
  const insights: ReviewAIInsight[] = [];
  const nowIso = new Date().toISOString();
  const dayCount = summary.daysIncluded.length;
  const isInsufficient = dayCount < 2;

  // 1. Empirical Fact: Effort Distribution
  const priHours = summary.hoursByPriority;
  const maxPri = (Object.keys(priHours) as unknown as PriorityId[]).reduce(
    (a, b) => (priHours[a] > priHours[b] ? a : b),
  );
  const priPct =
    summary.totalActualHours > 0
      ? Math.round((priHours[maxPri] / summary.totalActualHours) * 100)
      : 0;

  insights.push({
    id: `ins-fact-dist-${summary.id}`,
    type: "fact",
    title: `Effort Distribution across ${dayCount} Active Day(s)`,
    body: `Recorded a total of ${summary.totalActualHours} hours across ${dayCount} days. Priority #${maxPri} received the highest allocation (${priHours[maxPri]}h, ${priPct}% of total actual time).`,
    priorityId: maxPri,
    evidence: {
      sourcePeriod: summary.id,
      dataPoints: [
        `Total actual: ${summary.totalActualHours}h`,
        `Priority #${maxPri}: ${priHours[maxPri]}h (${priPct}%)`,
        `Active days: ${summary.daysIncluded.join(", ")}`,
      ],
      confidence: isInsufficient ? "Low" : "High",
      insufficientEvidence: isInsufficient,
    },
    status: "active",
    createdAt: nowIso,
  });

  // 2. Empirical Fact: Activity vs Outcome Disconnect Check
  insights.push({
    id: `ins-fact-outcomes-${summary.id}`,
    type: "fact",
    title: "Activity vs. Outcome Fulfillment",
    body: `Task completion rate reached ${summary.taskCompletionRate}% (${summary.tasksDoneTotal}/${summary.tasksPlannedTotal} tasks). Daily outcome delivery rate was ${summary.outcomesRate}% (${summary.outcomesAchievedTotal}/${summary.outcomesPlannedTotal} key outcomes verified).`,
    evidence: {
      sourcePeriod: summary.id,
      dataPoints: [
        `Task completion: ${summary.taskCompletionRate}%`,
        `Outcome success rate: ${summary.outcomesRate}%`,
        `Outcomes achieved: ${summary.outcomesAchievedTotal}`,
      ],
      confidence: isInsufficient ? "Low" : "High",
      insufficientEvidence: isInsufficient,
    },
    status: "active",
    createdAt: nowIso,
  });

  // 3. Analytical Insight: Realism & Priority 2 Workstreams
  const realismRatio =
    summary.totalPlannedHours > 0
      ? Math.round(
          (summary.totalActualHours / summary.totalPlannedHours) * 100,
        ) / 100
      : 1;

  let realismNote = "Planning capacity was calibrated with reality.";
  if (realismRatio < 0.85)
    realismNote =
      "Execution lagged planned allocation, suggesting over-optimistic task scoping.";
  else if (realismRatio > 1.15)
    realismNote =
      "Actual work took noticeably longer than planned, showing scope expansion.";

  insights.push({
    id: `ins-analytic-p2-${summary.id}`,
    type: "insight",
    title: "Execution Realism and Workstream Allocation",
    body: `${realismNote} In Priority 2, Workstream A (Cashflow/Trading) comprised ${summary.p2HoursWorkstreamA}h while Workstream B (Fintech Product) comprised ${summary.p2HoursWorkstreamB}h.`,
    priorityId: 2,
    evidence: {
      sourcePeriod: summary.id,
      dataPoints: [
        `Realism ratio: ${realismRatio}`,
        `P2 Workstream A: ${summary.p2HoursWorkstreamA}h`,
        `P2 Workstream B: ${summary.p2HoursWorkstreamB}h`,
      ],
      confidence: isInsufficient ? "Low" : "High",
      insufficientEvidence: isInsufficient,
    },
    status: "active",
    createdAt: nowIso,
  });

  // 4. Actionable Recommendation
  if (summary.repeatedUnfinishedTasks.length > 0) {
    const topStall = summary.repeatedUnfinishedTasks[0]!;
    insights.push({
      id: `ins-rec-stall-${summary.id}`,
      type: "recommendation",
      title: `Scope Mitigation for Recurring Friction: "${topStall.title}"`,
      body: `Break "${topStall.title}" into sub-45 minute verifiable micro-tasks or re-examine external dependencies that cause repeated postponement.`,
      priorityId: topStall.priorityId,
      recommendedAction: `Create a scoped improvement action in the Improvement Intelligence tab to eliminate friction on "${topStall.title}".`,
      evidence: {
        sourcePeriod: summary.id,
        dataPoints: [
          `Task "${topStall.title}" postponed ${topStall.count} time(s)`,
          `Priority #${topStall.priorityId}`,
        ],
        confidence: isInsufficient ? "Low" : "High",
        insufficientEvidence: isInsufficient,
      },
      status: "active",
      createdAt: nowIso,
    });
  }

  return insights;
}

/**
 * Calculates project-level performance across review records.
 * Aggregates task completion, hours, deliverables, and active dates.
 */
export function calculateProjectPerformance(
  projectId: string,
  records: DayRecord[] = [],
): ProjectPerformanceSummary {
  let totalPlannedMin = 0;
  let totalActualMin = 0;
  let tasksPlannedTotal = 0;
  let tasksDoneTotal = 0;
  const outputs: ProjectPerformanceSummary["outputs"] = [];
  const activeDaysSet = new Set<string>();

  records.forEach((day) => {
    let dayHasProject = false;

    // 1. Task Execution Snapshots
    if (day.taskSnapshots && day.taskSnapshots.length > 0) {
      const projSnapshots = day.taskSnapshots.filter(
        (t) => t.projectId === projectId,
      );
      if (projSnapshots.length > 0) {
        dayHasProject = true;
        projSnapshots.forEach((t) => {
          totalPlannedMin += t.durationPlannedMin;
          totalActualMin += t.durationActualMin;
          tasksPlannedTotal += 1;
          if (t.status === "done") tasksDoneTotal += 1;
        });
      }
    }

    // 2. Day Outputs
    let outputPriId: PriorityId | undefined;
    (day.outputs ?? []).forEach((out) => {
      if (out.projectId === projectId) {
        dayHasProject = true;
        outputPriId = out.priorityId;
        outputs.push({
          date: day.date,
          title: out.title,
          text: out.text,
          workstream: out.workstream,
        });
      }
    });

    // Fallback: If no granular task snapshots are logged for this day, but outputs link to this project
    if (
      (!day.taskSnapshots || day.taskSnapshots.length === 0) &&
      outputPriId !== undefined
    ) {
      totalActualMin += day.actualMin[outputPriId] ?? 0;
      totalPlannedMin += day.plannedMin[outputPriId] ?? 0;
      tasksPlannedTotal += day.tasksPlanned;
      tasksDoneTotal += day.tasksDone;
    }

    if (dayHasProject) {
      activeDaysSet.add(day.date);
    }
  });

  const sortedDates = Array.from(activeDaysSet).sort();
  const taskCompletionRate =
    tasksPlannedTotal > 0
      ? Math.min(100, Math.round((tasksDoneTotal / tasksPlannedTotal) * 100))
      : 0;

  return {
    projectId,
    totalPlannedHours: Math.round((totalPlannedMin / 60) * 10) / 10,
    totalActualHours: Math.round((totalActualMin / 60) * 10) / 10,
    tasksPlannedTotal,
    tasksDoneTotal,
    taskCompletionRate,
    outputsCount: outputs.length,
    outputs,
    activeDaysCount: activeDaysSet.size,
    firstActiveDate: sortedDates[0],
    lastActiveDate: sortedDates[sortedDates.length - 1],
  };
}
