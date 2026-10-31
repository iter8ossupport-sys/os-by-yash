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

export interface DayRecord {
  date: string;
  plannedMin: Record<PriorityId, number>;
  actualMin: Record<PriorityId, number>;
  tasksDone: number;
  tasksPlanned: number;
  outputs: { title: string; priorityId: PriorityId; text: string; workstream?: string | undefined }[];
  outcomesAchieved: PriorityId[];
  unfinished: string[];
  learning: string;
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
}
