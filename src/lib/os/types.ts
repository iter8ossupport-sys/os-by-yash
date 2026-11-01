export type PriorityId = 1 | 2 | 3;
export type DayType = "College Day" | "Non-College Day" | "Weekend/Holiday" | "Custom";
export type Energy = "Low" | "Medium" | "High";
export type TaskKind = "simple" | "measurable" | "validation";
export type TaskStatus = "pending" | "active" | "paused" | "done";
export type Theme = "dark" | "light" | "system";

export interface Priority {
  id: PriorityId;
  name: string;
  purpose: string;
  project: string;
  milestone: string;
  status: string;
  bottleneck: string;
  activeProjectId?: string | undefined;
}

export interface DayContext {
  date: string;
  dayType: DayType;
  hours: number;
  commitments: string;
  energy: Energy;
}

export interface Task {
  id: string;
  priorityId: PriorityId;
  title: string;
  duration: number; // minutes
  timeBlock: string;
  expectedOutput: string;
  successCriteria: string;
  what: string;
  how: string;
  where: string;
  kind: TaskKind;
  selected: boolean;
  status: TaskStatus;
  elapsedMs: number;
  startedAt?: number | undefined;
  output?: Record<string, string> | undefined;
  outcomeAchieved?: boolean | undefined;
}

export interface Plan {
  context: DayContext;
  allocation: Record<PriorityId, number>;
  outcomes: Record<PriorityId, string>;
  tasks: Task[];
  approvedAt?: string | undefined;
}

export interface Metric {
  label: string;
  target: string;
  current: string;
}

export interface Goals {
  periodMonths: number;
  levelA: { text: string; metrics: Metric[]; approved: boolean };
  levelB: { text: string; days: number; metrics: Metric[]; approved: boolean };
  levelC: Record<PriorityId, { target: string; deadline: string; evidence: string; progress: number }>;
}

export interface ProjectDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export interface Project {
  id: string;
  name: string;
  objective: string;
  priorityId: PriorityId;
  status: ProjectStatus;
  hypothesis: string;
  milestone: string;
  metrics: string;
  bottlenecks: string;
  evidence: string;
  decisions: string;
  learning: string;
  documents: string;
  createdAt: string;
  demo?: boolean | undefined;
  deadline?: string | undefined;
  workstream?: "A" | "B" | undefined;
  learningCategories?: string[] | undefined;
  docs?: ProjectDoc[] | undefined;
}

export type KnowledgeType =
  | "Note" | "Research" | "Learning" | "Documentation" | "Book/Resource"
  | "User Feedback" | "Market Insight" | "Lesson" | "Decision" | "Document";
export interface KnowledgeItem {
  id: string;
  title: string;
  type: KnowledgeType;
  body: string;
  priorityId?: PriorityId | undefined;
  projectId?: string | undefined;
  tags: string;
  createdAt: string;
  demo?: boolean | undefined;
}

export type ReviewState = "live" | "finalized" | "corrected";
export type ReviewPeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "custom";
export type ImprovementStatus = "proposed" | "approved" | "rejected" | "implemented" | "evaluated";
export type BottleneckSeverity = "low" | "medium" | "high" | "critical";
export type BottleneckStatus = "active" | "mitigating" | "resolved";
export type P2Workstream = "A" | "B";

export interface AuditRecord {
  id: string;
  timestamp: string; // ISO 8601
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  source: "user_correction" | "system_migration" | "closeout_recalculation";
}

export interface TaskExecutionSnapshot {
  id: string;
  taskId: string;
  priorityId: PriorityId;
  projectId?: string | undefined;
  title: string;
  durationPlannedMin: number;
  durationActualMin: number;
  kind: TaskKind;
  status: "done" | "unfinished" | "dropped";
  expectedOutput: string;
  actualOutput?: Record<string, string> | undefined;
  outcomeAchieved: boolean;
  workstream?: P2Workstream | string | undefined;
  where?: string | undefined;
  timeBlock?: string | undefined;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  plannedMin: Record<PriorityId, number>;
  actualMin: Record<PriorityId, number>;
  tasksDone: number;
  tasksPlanned: number;
  outputs: {
    title: string;
    priorityId: PriorityId;
    text: string;
    workstream?: string | undefined;
    projectId?: string | undefined;
  }[];
  outcomesAchieved: PriorityId[];
  unfinished: string[];
  learning: string;

  // Review Foundation extensions (backward-compatible, optional)
  state?: ReviewState | undefined;
  source?: "closeout" | "manual" | "corrected" | undefined;
  dayType?: DayType | undefined;
  availableHours?: number | undefined;
  energy?: Energy | undefined;
  taskSnapshots?: TaskExecutionSnapshot[] | undefined;
  p2WorkstreamMinutes?: {
    workstreamA: number; // Cashflow Generation
    workstreamB: number; // Fintech Product Capability
  } | undefined;
  bottlenecksNoted?: string[] | undefined;
  reflections?: {
    whatWorked?: string | undefined;
    whatStalled?: string | undefined;
    frictionNotes?: string | undefined;
  } | undefined;
  auditHistory?: AuditRecord[] | undefined;
  finalizedAt?: string | undefined;
  correctedAt?: string | undefined;
}

export interface ReviewPeriodSummary {
  id: string; // e.g. "2026-W44" or "2026-M11"
  type: ReviewPeriodType;
  startDate: string; // Inclusive YYYY-MM-DD
  endDate: string; // Inclusive YYYY-MM-DD
  daysIncluded: string[]; // YYYY-MM-DD list

  // Activity Metrics
  totalPlannedHours: number;
  totalActualHours: number;
  hoursByPriority: Record<PriorityId, number>;
  plannedHoursByPriority: Record<PriorityId, number>;
  tasksPlannedTotal: number;
  tasksDoneTotal: number;
  taskCompletionRate: number; // 0 to 100

  // Priority 2 Workstream A/B Breakdown
  p2HoursWorkstreamA: number; // Cashflow Generation
  p2HoursWorkstreamB: number; // Fintech Product Capability
  p2OutputsWorkstreamA: number;
  p2OutputsWorkstreamB: number;

  // Outcome Intelligence (Never conflated with activity)
  outcomesPlannedTotal: number;
  outcomesAchievedTotal: number;
  outcomesRate: number; // 0 to 100
  outcomesByPriority: Record<PriorityId, { planned: number; achieved: number }>;

  // Compounding & Recurring Friction
  repeatedUnfinishedTasks: { title: string; count: number; priorityId: PriorityId }[];
  keyOutputs: { date: string; priorityId: PriorityId; title: string; text: string; workstream?: string | undefined }[];
  learningsSummary: { date: string; text: string }[];

  // Strategic Progress
  levelCProgressEstimate?: Record<PriorityId, number> | undefined;

  finalizedAt?: string | undefined;
  notes?: string | undefined;
}

export interface ReviewBottleneck {
  id: string;
  priorityId: PriorityId;
  projectId?: string | undefined;
  title: string;
  description: string;
  severity: BottleneckSeverity;
  status: BottleneckStatus;
  firstObservedDate: string; // YYYY-MM-DD
  lastObservedDate: string; // YYYY-MM-DD
  occurrenceCount: number;
  sourceDayDates: string[];
  mitigationPlan?: string | undefined;
  resolvedAt?: string | undefined;
  resolutionNotes?: string | undefined;
}

export interface ReviewImprovement {
  id: string;
  periodType: ReviewPeriodType;
  periodRef: string; // e.g. "2026-11-01" or "2026-W44"
  priorityId?: PriorityId | undefined;
  projectId?: string | undefined;

  // 1. Problem
  problemStatement: string;

  // 2. Evidence
  evidence: {
    metrics: string[];
    dayDates: string[];
    taskTitles?: string[] | undefined;
  };

  // 3. Recommendation
  recommendation: string;

  // 4. User Decision
  status: ImprovementStatus;
  decisionDate?: string | undefined;
  decisionNote?: string | undefined;

  // 5. Approved Action
  approvedAction?: string | undefined;

  // 6. Expected Result
  expectedResult?: string | undefined;
  targetMetric?: string | undefined;

  // 7. Evaluation
  evaluatedAt?: string | undefined;
  evaluationOutcome?: "succeeded" | "partially_succeeded" | "failed" | "untested" | undefined;
  evaluationNotes?: string | undefined;

  // 8. Learning
  promotedToKnowledgeId?: string | undefined;
  createdAt: string;
}

export interface MilestoneForecast {
  priorityId: PriorityId;
  projectId?: string | undefined;
  milestoneTitle: string;
  historicalVelocityHoursPerWeek: number;
  outcomeSuccessRate: number; // 0 to 1
  scenarios: {
    conservative: { estimatedCompletionDate: string; weeksRemaining: number; hoursNeeded: number };
    realistic: { estimatedCompletionDate: string; weeksRemaining: number; hoursNeeded: number };
    optimistic: { estimatedCompletionDate: string; weeksRemaining: number; hoursNeeded: number };
  };
  confidenceScore: "Low" | "Medium" | "High";
  evidenceBasis: string;
}

export interface ReviewSettings {
  defaultPeriod: "daily" | "weekly" | "monthly" | "history";
  weekStartDay: 1 | 0; // 1 = Monday, 0 = Sunday
  trackP2WorkstreamSplits: boolean;
  minDataThresholdDays: number;
  exportDateFormat: "YYYY-MM-DD" | "DD/MM/YYYY";
  customViews: { id: string; name: string; priorityFilter?: PriorityId | undefined; dateRange?: string | undefined }[];
}

export interface OSState {
  theme: Theme;
  userName: string;
  foundation: { northStar: string; northStarLong: string; mission: string; trajectory: string; phases: string[] };
  priorities: Priority[];
  goals: Goals;
  draft: Plan | null;
  draftStage: number;
  plan: Plan | null;
  activeTaskId: string | null;
  interruptedTaskId: string | null;
  projects: Project[];
  knowledge: KnowledgeItem[];
  history: DayRecord[];
  prefs: { timer: boolean; notifications: boolean; defaultView: string; dayTypeHours: Record<DayType, number>; constraints: string };

  // Reviews Data Foundation additions
  bottlenecks?: ReviewBottleneck[] | undefined;
  improvements?: ReviewImprovement[] | undefined;
  reviewSettings?: ReviewSettings | undefined;
}
