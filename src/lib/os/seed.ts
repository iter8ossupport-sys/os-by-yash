import type { OSState, Plan, Priority, PriorityId, Task, DayContext } from "./types";

export const PRIORITIES: Priority[] = [
  {
    id: 1,
    name: "Founder Capability",
    purpose:
      "Build real capability by executing in the real world—ship products, solve problems, talk to users, sell and learn from evidence.",
    project: "Killarity Engine",
    milestone: "Ship v2 and collect real user feedback",
    status: "Active",
    bottleneck: "No user conversations recorded yet",
    activeProjectId: "demo-killarity",
  },
  {
    id: 2,
    name: "Cashflow Infrastructure",
    purpose:
      "Generate cash through LBES and other systems to fund the startup, cover necessary costs and gradually reduce the time required to generate money.",
    project: "LBES",
    milestone: "Define a repeatable weekly cash routine",
    status: "Active",
    bottleneck: "Process is still manual",
    activeProjectId: "demo-lbes",
  },
  {
    id: 3,
    name: "Learning for Execution",
    purpose:
      "Learn fundamentals that increase the quality, speed and precision of execution, so every future cycle of building becomes better.",
    project: "Product + Trading Skills",
    milestone: "Learn and apply two execution skills",
    status: "Active",
    bottleneck: "Learning not yet linked to tasks",
    activeProjectId: "demo-skills",
  },
];

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => Math.random().toString(36).slice(2, 10);

const TEMPLATES: Record<PriorityId, Omit<Task, "id" | "priorityId" | "selected" | "status" | "elapsedMs">[]> = {
  1: [
    { title: "Ship one improvement to the active product", duration: 90, timeBlock: "09:00–10:30", expectedOutput: "Change deployed and live", successCriteria: "Live URL works on desktop and mobile", what: "Pick the single highest-impact improvement from the backlog.", how: "Scope it to one sitting, build, test, deploy.", where: "Code editor + hosting dashboard", kind: "measurable" },
    { title: "Talk to 3 potential users", duration: 45, timeBlock: "14:00–14:45", expectedOutput: "3 conversation notes", successCriteria: "Each note has a pain point and a quote", what: "Reach out to people who match the target user.", how: "Ask about their current workflow, not your product.", where: "DMs, email, calls", kind: "validation" },
    { title: "Write the next release checklist", duration: 20, timeBlock: "17:00–17:20", expectedOutput: "Checklist saved in Knowledge", successCriteria: "Covers scope, test, deploy", what: "List the next release steps.", how: "Keep it to 10 items max.", where: "Knowledge section", kind: "simple" },
  ],
  2: [
    { title: "Run today's LBES cash session", duration: 60, timeBlock: "10:45–11:45", expectedOutput: "Session result recorded", successCriteria: "Rules followed; result logged", what: "Execute the session using the written rules only.", how: "Pre-check, execute, log result immediately.", where: "LBES workspace", kind: "measurable" },
    { title: "Automate one manual LBES step", duration: 45, timeBlock: "15:00–15:45", expectedOutput: "One step automated", successCriteria: "Step runs without manual input", what: "Pick the most repetitive step.", how: "Script or tool it, then test once.", where: "Automation tool", kind: "measurable" },
    { title: "Review this week's cash log", duration: 15, timeBlock: "18:00–18:15", expectedOutput: "Short review note", successCriteria: "One improvement identified", what: "Scan the log.", how: "Note one pattern.", where: "Reviews", kind: "simple" },
  ],
  3: [
    { title: "Study one fundamental for today's work", duration: 40, timeBlock: "08:15–08:55", expectedOutput: "Notes with 3 takeaways", successCriteria: "Takeaways are applied in a task today", what: "Choose a topic that blocks current execution.", how: "Read/watch, then write 3 takeaways.", where: "Course / book", kind: "simple" },
    { title: "Apply one learning inside a real task", duration: 30, timeBlock: "16:00–16:30", expectedOutput: "Before/after note", successCriteria: "Visible improvement in a task output", what: "Use today's learning on actual work.", how: "Compare before vs after.", where: "Active project", kind: "validation" },
    { title: "Write a lesson into Knowledge", duration: 10, timeBlock: "21:00–21:10", expectedOutput: "Lesson entry", successCriteria: "Linked to a priority", what: "Capture today's lesson.", how: "One paragraph.", where: "Knowledge section", kind: "simple" },
  ],
};

export function recommendTasks(priorities: Priority[]): Task[] {
  return priorities.flatMap((p) =>
    TEMPLATES[p.id].map((t, i) => ({
      ...t,
      title: i === 0 && p.id === 1 ? (p.project ? `Ship one improvement to ${p.project}` : "Ship one improvement to active product") : t.title,
      id: uid(),
      priorityId: p.id,
      selected: i < 2,
      status: "pending" as const,
      elapsedMs: 0,
    })),
  );
}

export function recommendOutcomes(priorities: Priority[]): Record<PriorityId, string> {
  const by = (id: PriorityId) => priorities.find((p) => p.id === id)!;
  const p1 = by(1);
  const p2 = by(2);
  const p3 = by(3);
  return {
    1: p1.project
      ? `Move "${p1.milestone || "milestone"}" forward with one shipped change and real user input on ${p1.project}.`
      : "Define an active project and move founder capability forward.",
    2: p2.project
      ? `Complete a disciplined ${p2.project} session and remove one manual step.`
      : "Execute cashflow infrastructure routine and remove one manual step.",
    3: p3.project
      ? `Learn one fundamental and apply it inside today's work on ${p3.project}.`
      : "Learn one fundamental and apply it inside today's work.",
  };
}

export function newDraft(ctx?: Partial<DayContext>): Plan {
  return {
    context: { date: today(), dayType: "Non-College Day", hours: 6, commitments: "", energy: "Medium", ...ctx },
    allocation: { 1: 3, 2: 2, 3: 1 },
    outcomes: { 1: "", 2: "", 3: "" },
    tasks: [],
  };
}

export const initialState: OSState = {
  theme: "dark",
  userName: "Yash",
  foundation: {
    northStar: "Build systems that remove human friction.",
    northStarLong:
      "Build AI infrastructure that removes work stress and makes people's lives easier and more peaceful.",
    mission: "Become a founder who builds real, valuable systems through evidence-driven execution.",
    trajectory: "Operator → Builder → Founder → Infrastructure company ($1T long-term ambition).",
    phases: ["Phase 1 — Capability", "Phase 2 — First revenue product", "Phase 3 — Scale", "Phase 4 — Infrastructure"],
  },
  priorities: PRIORITIES,
  goals: {
    periodMonths: 12,
    levelA: {
      text: "Build and validate at least one real AI/SaaS business with measurable market demand, paying customers, revenue and evidence of growth.",
      metrics: [
        { label: "Products launched", target: "1", current: "" },
        { label: "Active users", target: "1,000+", current: "" },
        { label: "Paying customers", target: "100+", current: "" },
        { label: "Monthly revenue", target: "Proposed — set", current: "" },
      ],
      approved: false,
    },
    levelB: {
      text: "Get real user validation and first paying customers for the active product.",
      days: 45,
      metrics: [
        { label: "Users", target: "100", current: "" },
        { label: "Paying users", target: "10+", current: "" },
        { label: "Working product", target: "Live & tested", current: "" },
      ],
      approved: false,
    },
    levelC: {
      1: { target: "Ship v2, collect user feedback, convert first paying users", deadline: "", evidence: "", progress: 0 },
      2: { target: "Repeatable weekly cash routine through LBES", deadline: "", evidence: "", progress: 0 },
      3: { target: "Learn and apply 2 key execution skills", deadline: "", evidence: "", progress: 0 },
    },
  },
  draft: null,
  draftStage: 1,
  plan: null,
  activeTaskId: null,
  interruptedTaskId: null,
  projects: [
    { id: "demo-killarity", name: "Killarity Engine", objective: "Ship v2 and get the first real users.", priorityId: 1, status: "active", hypothesis: "", milestone: "Ship v2 and collect real user feedback", metrics: "", bottlenecks: "No user conversations yet", evidence: "", decisions: "", learning: "", documents: "", createdAt: today(), demo: true, deadline: "", docs: [] },
    { id: "demo-lbes", name: "LBES", objective: "Generate cash to fund the startup.", priorityId: 2, status: "active", hypothesis: "", milestone: "Repeatable weekly cash routine", metrics: "", bottlenecks: "Manual process", evidence: "", decisions: "", learning: "", documents: "", createdAt: today(), demo: true, workstream: "A", deadline: "", docs: [] },
    { id: "demo-skills", name: "Product + Trading Skills", objective: "Learn fundamentals that improve execution.", priorityId: 3, status: "active", hypothesis: "", milestone: "Apply two execution skills", metrics: "", bottlenecks: "", evidence: "", decisions: "", learning: "", documents: "", createdAt: today(), demo: true, learningCategories: ["Practical execution and experiments", "Skill development"], deadline: "", docs: [] },
  ],
  knowledge: [
    { id: "demo-k1", title: "Operating loop", type: "Note", body: "PRE-THINK → ACT → POST-THINK → IMPROVE → REPEAT.", priorityId: undefined, tags: "system, demo", createdAt: today(), demo: true },
  ],
  history: [],
  bottlenecks: [],
  improvements: [],
  periodReviews: [],
  aiInsights: [],
  reviewAlerts: [],
  reviewSettings: {
    defaultPeriod: "daily",
    weekStartDay: 1,
    trackP2WorkstreamSplits: true,
    minDataThresholdDays: 3,
    exportDateFormat: "YYYY-MM-DD",
    customViews: [],
  },
  prefs: {
    timer: true,
    notifications: false,
    defaultView: "Home",
    dayTypeHours: { "College Day": 4, "Non-College Day": 8, "Weekend/Holiday": 6, Custom: 5 },
    constraints: "",
  },
};
