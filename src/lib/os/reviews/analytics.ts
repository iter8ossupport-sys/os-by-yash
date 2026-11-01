import type {
  DayRecord,
  MilestoneForecast,
  PriorityId,
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
  realismCategory: "under_allocated" | "calibrated" | "over_extended" | "no_plan";
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

  const totalPlannedMin = Object.values(plannedMinByPriority).reduce((a, b) => a + b, 0);
  const totalActualMin = Object.values(actualMinByPriority).reduce((a, b) => a + b, 0);

  const priorityDistributionPercent: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  ALL_PRIORITIES.forEach((id) => {
    priorityDistributionPercent[id] =
      totalActualMin > 0 ? Math.round((actualMinByPriority[id] / totalActualMin) * 100) : 0;
  });

  const tasksPlanned = day.tasksPlanned ?? 0;
  const tasksDone = day.tasksDone ?? 0;
  const taskCompletionRate =
    tasksPlanned > 0 ? Math.min(100, Math.round((tasksDone / tasksPlanned) * 100)) : 0;

  // Priority 2 Workstream A / B calculations
  let workstreamA = day.p2WorkstreamMinutes?.workstreamA ?? 0;
  let workstreamB = day.p2WorkstreamMinutes?.workstreamB ?? 0;

  // Fallback: If p2WorkstreamMinutes wasn't explicitly populated, infer from outputs
  if (workstreamA === 0 && workstreamB === 0 && actualMinByPriority[2] > 0) {
    const p2Outputs = (day.outputs ?? []).filter((o) => o.priorityId === 2);
    const hasA = p2Outputs.some((o) => o.workstream === "A" || /cash|trading|session/i.test(o.workstream ?? ""));
    const hasB = p2Outputs.some((o) => o.workstream === "B" || /fintech|product|saas|api/i.test(o.workstream ?? ""));

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
    workstreamA: totalP2Workstream > 0 ? Math.round((workstreamA / totalP2Workstream) * 100) : 0,
    workstreamB: totalP2Workstream > 0 ? Math.round((workstreamB / totalP2Workstream) * 100) : 0,
  };

  // Outcome Intelligence (Never conflated with activity time)
  // Outcomes planned: active priorities that had planned minutes > 0
  const plannedPrioritiesCount = ALL_PRIORITIES.filter((id) => plannedMinByPriority[id] > 0).length;
  const outcomesPlanned = plannedPrioritiesCount > 0 ? plannedPrioritiesCount : 3;
  const outcomesAchieved = (day.outcomesAchieved ?? []).length;
  const outcomesRate = Math.min(100, Math.round((outcomesAchieved / outcomesPlanned) * 100));

  // Plan Realism Factor
  const realismRatio =
    totalPlannedMin > 0 ? Math.round((totalActualMin / totalPlannedMin) * 100) / 100 : 0;
  let realismCategory: DaySummaryMetrics["realismCategory"] = "no_plan";
  if (totalPlannedMin > 0) {
    if (realismRatio < 0.85) realismCategory = "under_allocated";
    else if (realismRatio <= 1.15) realismCategory = "calibrated";
    else realismCategory = "over_extended";
  }

  const state = day.state ?? (day.auditHistory?.length ? "corrected" : "finalized");
  const source = day.source ?? (day.auditHistory?.length ? "corrected" : "closeout");
  const hasAuditCorrection = Boolean(day.auditHistory && day.auditHistory.length > 0);

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
  const plannedHoursByPriority: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  const outcomesByPriority: Record<PriorityId, { planned: number; achieved: number }> = {
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

  const repeatedTaskMap: Record<string, { count: number; priorityId: PriorityId }> = {};
  const keyOutputs: ReviewPeriodSummary["keyOutputs"] = [];
  const learningsSummary: ReviewPeriodSummary["learningsSummary"] = [];

  records.forEach((day) => {
    const summary = calculateDaySummary(day);

    totalPlannedMin += summary.totalPlannedMin;
    totalActualMin += summary.totalActualMin;
    tasksPlannedTotal += summary.tasksPlanned;
    tasksDoneTotal += summary.tasksDone;

    ALL_PRIORITIES.forEach((priId) => {
      hoursByPriority[priId] += Math.round((summary.actualMinByPriority[priId] / 60) * 10) / 10;
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
        if (out.workstream === "A" || /cash|trading|session/i.test(out.workstream ?? "")) {
          p2OutputsWorkstreamA += 1;
        } else if (out.workstream === "B" || /fintech|product|saas|api/i.test(out.workstream ?? "")) {
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
      ? Math.min(100, Math.round((outcomesAchievedTotal / outcomesPlannedTotal) * 100))
      : 0;

  const repeatedUnfinishedTasks = Object.entries(repeatedTaskMap)
    .filter(([, data]) => data.count >= 1)
    .map(([title, data]) => ({ title, count: data.count, priorityId: data.priorityId }))
    .sort((a, b) => b.count - a.count);

  return {
    id,
    type: periodType,
    startDate,
    endDate,
    daysIncluded,
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
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
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
  const totalHoursDelta = Math.round((current.totalActualHours - previous.totalActualHours) * 10) / 10;
  const totalHoursDeltaPercent =
    previous.totalActualHours > 0
      ? Math.round(((current.totalActualHours - previous.totalActualHours) / previous.totalActualHours) * 100)
      : null;

  const taskCompletionRateDelta = current.taskCompletionRate - previous.taskCompletionRate;
  const outcomesRateDelta = current.outcomesRate - previous.outcomesRate;

  const priorityHoursDelta: Record<PriorityId, number> = { 1: 0, 2: 0, 3: 0 };
  ALL_PRIORITIES.forEach((id) => {
    priorityHoursDelta[id] =
      Math.round((current.hoursByPriority[id] - previous.hoursByPriority[id]) * 10) / 10;
  });

  const p2WorkstreamADeltaHours =
    Math.round((current.p2HoursWorkstreamA - previous.p2HoursWorkstreamA) * 10) / 10;
  const p2WorkstreamBDeltaHours =
    Math.round((current.p2HoursWorkstreamB - previous.p2HoursWorkstreamB) * 10) / 10;

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
): { title: string; priorityId: PriorityId; occurrences: number; days: string[] }[] {
  const cutoff = new Date(Date.now() - windowDays * 864e5).toISOString().slice(0, 10);
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
  const cutoff = new Date(Date.now() - windowDays * 864e5).toISOString().slice(0, 10);
  const sample = history.filter((h) => h.date >= cutoff);

  const minThreshold = 3;
  if (sample.length < minThreshold || estimatedHoursNeeded <= 0) {
    return {
      priorityId,
      milestoneTitle,
      historicalVelocityHoursPerWeek: 0,
      outcomeSuccessRate: 0,
      scenarios: {
        conservative: { estimatedCompletionDate: "Insufficient data", weeksRemaining: 0, hoursNeeded: estimatedHoursNeeded },
        realistic: { estimatedCompletionDate: "Insufficient data", weeksRemaining: 0, hoursNeeded: estimatedHoursNeeded },
        optimistic: { estimatedCompletionDate: "Insufficient data", weeksRemaining: 0, hoursNeeded: estimatedHoursNeeded },
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
  const daysWithOutcomesPlanned = sample.filter((d) => (d.plannedMin?.[priorityId] ?? 0) > 0).length;
  const daysWithOutcomesAchieved = sample.filter((d) =>
    (d.outcomesAchieved ?? []).includes(priorityId),
  ).length;
  const outcomeSuccessRate =
    daysWithOutcomesPlanned > 0
      ? Math.max(0.2, daysWithOutcomesAchieved / daysWithOutcomesPlanned)
      : 0.5;

  // Realistic velocity factoring outcome efficiency
  const effectiveVelocityHoursPerWeek = velocityPerWeek * outcomeSuccessRate;

  const realisticWeeks = Math.max(0.5, Math.ceil((estimatedHoursNeeded / effectiveVelocityHoursPerWeek) * 10) / 10);
  const conservativeWeeks = Math.round(realisticWeeks * 1.35 * 10) / 10;
  const optimisticWeeks = Math.max(0.2, Math.round(realisticWeeks * 0.75 * 10) / 10);

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
export function calculateImprovementStats(improvements: ReviewImprovement[] = []) {
  const total = improvements.length;
  const proposed = improvements.filter((i) => i.status === "proposed").length;
  const approved = improvements.filter((i) => i.status === "approved").length;
  const implemented = improvements.filter((i) => i.status === "implemented").length;
  const evaluated = improvements.filter((i) => i.status === "evaluated").length;

  const evaluatedWithOutcome = improvements.filter(
    (i) => i.evaluationOutcome === "succeeded" || i.evaluationOutcome === "partially_succeeded",
  ).length;

  const successRate = evaluated > 0 ? Math.round((evaluatedWithOutcome / evaluated) * 100) : 0;

  return {
    total,
    proposed,
    approved,
    implemented,
    evaluated,
    successRate,
  };
}

