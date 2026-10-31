import type { DayRecord, OSState, Plan, PriorityId, Project, Task } from "./types";

export const elapsed = (t: Task, now = Date.now()) =>
  t.elapsedMs + (t.status === "active" && t.startedAt != null ? now - t.startedAt : 0);

export const selectedTasks = (p: Plan | null) => (p ? p.tasks.filter((t) => t.selected) : []);

export const plannedMinutes = (p: Plan | null) =>
  selectedTasks(p).reduce((s, t) => s + t.duration, 0);

const mapTask = (s: OSState, id: string, fn: (t: Task) => Task): OSState =>
  s.plan ? { ...s, plan: { ...s.plan, tasks: s.plan.tasks.map((t) => (t.id === id ? fn(t) : t)) } } : s;

const pauseT = (t: Task, now: number): Task =>
  t.status === "active" ? { ...t, status: "paused", elapsedMs: elapsed(t, now), startedAt: undefined } : t;

/** Approving saves the plan but never starts a task. */
export function approvePlan(s: OSState, now = new Date()): OSState {
  if (!s.draft) return s;
  const plan: Plan = {
    ...s.draft,
    tasks: s.draft.tasks.map((t) => ({ ...t, status: "pending", elapsedMs: 0, startedAt: undefined })),
    approvedAt: now.toISOString(),
  };
  return { ...s, plan, draft: null, draftStage: 1, activeTaskId: null, interruptedTaskId: null };
}

/** Start/resume a task; any other running task is paused (only one active at a time). */
export function startTask(s: OSState, id: string, now = Date.now()): OSState {
  if (!s.plan) return s;
  const tasks = s.plan.tasks.map((t) =>
    t.id === id
      ? t.status === "done" ? t : { ...t, status: "active" as const, startedAt: now }
      : pauseT(t, now),
  );
  return { ...s, plan: { ...s.plan, tasks }, activeTaskId: id };
}

export function pauseTask(s: OSState, id: string, now = Date.now()): OSState {
  return mapTask(s, id, (t) => pauseT(t, now));
}

export function finishTask(s: OSState, id: string, output: Record<string, string> = {}, outcomeAchieved = false, now = Date.now()): OSState {
  const next = mapTask(s, id, (t) => ({
    ...t,
    status: "done",
    elapsedMs: elapsed(t, now),
    startedAt: undefined,
    output,
    outcomeAchieved,
  }));
  return { ...next, activeTaskId: next.activeTaskId === id ? null : next.activeTaskId };
}

/** Emergency switch: pause current task, preserving its time/output, and remember it. */
export function emergencyPause(s: OSState, now = Date.now()): OSState {
  if (!s.activeTaskId) return s;
  const next = pauseTask(s, s.activeTaskId, now);
  return { ...next, interruptedTaskId: s.activeTaskId, activeTaskId: null };
}

export function moveTask(s: OSState, id: string, dir: -1 | 1): OSState {
  if (!s.plan) return s;
  const tasks = [...s.plan.tasks];
  const sel = tasks.filter((t) => t.selected);
  const i = sel.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sel.length) return s;
  const a = tasks.indexOf(sel[i]!);
  const b = tasks.indexOf(sel[j]!);
  [tasks[a], tasks[b]] = [tasks[b]!, tasks[a]!];
  return { ...s, plan: { ...s.plan, tasks } };
}

export function buildDayRecord(p: Plan, learning: string, now = Date.now()): DayRecord {
  const sel = selectedTasks(p);
  const z = (): Record<PriorityId, number> => ({ 1: 0, 2: 0, 3: 0 });
  const plannedMin = z();
  const actualMin = z();
  sel.forEach((t) => {
    plannedMin[t.priorityId] += t.duration;
    actualMin[t.priorityId] += Math.round(elapsed(t, now) / 60000);
  });
  const done = sel.filter((t) => t.status === "done");
  return {
    date: p.context.date,
    plannedMin,
    actualMin,
    tasksDone: done.length,
    tasksPlanned: sel.length,
    outputs: done
      .filter((t) => t.output && Object.values(t.output).some(Boolean))
      .map((t) => {
        const ws = t.output?.["Workstream"];
        const entries = Object.entries(t.output!).filter(([k, v]) => Boolean(v) && k !== "Workstream");
        return {
          title: t.title,
          priorityId: t.priorityId,
          text: entries.length ? entries.map(([k, v]) => `${k}: ${v}`).join(" · ") : Object.values(t.output!).filter(Boolean).join(" · "),
          workstream: ws,
        };
      }),
    outcomesAchieved: ([1, 2, 3] as PriorityId[]).filter((id) => done.some((t) => t.priorityId === id && t.outcomeAchieved)),
    unfinished: sel.filter((t) => t.status !== "done").map((t) => t.title),
    learning,
  };
}

export function closeDay(s: OSState, learning: string, now = Date.now()): OSState {
  if (!s.plan) return s;
  const rec = buildDayRecord(s.plan, learning, now);
  return {
    ...s,
    history: [...s.history.filter((h) => h.date !== rec.date), rec],
    plan: null,
    activeTaskId: null,
    interruptedTaskId: null,
  };
}

/**
 * Ensures priorities stay in 100% sync with their active project records.
 * Resolves missing, renamed, reassigned, or deleted projects safely.
 */
export function syncPrioritiesWithProjects(s: OSState): OSState {
  const projects = s.projects ?? [];
  const priorities = (s.priorities ?? []).map((p) => {
    // 1. If activeProjectId is set, look up the referenced project
    let activeProj = p.activeProjectId ? projects.find((x) => x.id === p.activeProjectId) : undefined;

    // If activeProj exists but was reassigned to a different priority, it cannot remain active for this priority
    if (activeProj && activeProj.priorityId !== p.id) {
      activeProj = undefined;
    }

    // 2. If no valid activeProj yet (or activeProjectId missing/invalid/deleted), attempt fallback lookup:
    if (!activeProj) {
      // First try matching by project name within this priority
      if (p.project) {
        activeProj = projects.find((x) => x.priorityId === p.id && x.name.toLowerCase() === p.project.toLowerCase());
      }
      // Next try the first project marked active under this priority
      if (!activeProj) {
        activeProj = projects.find((x) => x.priorityId === p.id && x.status === "active");
      }
      // Next try any project assigned to this priority
      if (!activeProj) {
        activeProj = projects.find((x) => x.priorityId === p.id);
      }
    }

    if (activeProj) {
      return {
        ...p,
        activeProjectId: activeProj.id,
        project: activeProj.name,
        milestone: activeProj.milestone || "",
        bottleneck: activeProj.bottlenecks || p.bottleneck || "",
        status: activeProj.status === "active" ? "Active" : activeProj.status === "paused" ? "Paused" : activeProj.status,
      };
    }

    // Safe empty state when no project exists for this priority
    return {
      ...p,
      activeProjectId: undefined,
      project: "",
      milestone: "",
      bottleneck: "",
      status: "No active project",
    };
  });

  return { ...s, priorities };
}

/**
 * Sets the active project for a given priority.
 * Updates priority's activeProjectId, project name, milestone, bottleneck, status.
 */
export function setActiveProject(s: OSState, priorityId: PriorityId, projectId: string | null): OSState {
  const priorities = s.priorities.map((p) => {
    if (p.id !== priorityId) return p;
    if (!projectId) {
      return {
        ...p,
        activeProjectId: undefined,
        project: "",
        milestone: "",
        bottleneck: "",
        status: "No active project",
      };
    }
    const proj = s.projects.find((x) => x.id === projectId && x.priorityId === priorityId);
    if (!proj) return p;
    return {
      ...p,
      activeProjectId: proj.id,
      project: proj.name,
      milestone: proj.milestone,
      bottleneck: proj.bottlenecks || p.bottleneck,
      status: proj.status === "active" ? "Active" : proj.status,
    };
  });

  return syncPrioritiesWithProjects({ ...s, priorities });
}

/**
 * Saves a project (new or edited), handling renaming, milestone changes, and reassignment.
 * Reassignment rule:
 * - If reassigned from Priority A to Priority B:
 *   - Priority A clears its activeProjectId if this project was active.
 *   - Priority B only adopts this project as active if Priority B currently has NO active project (does NOT overwrite).
 */
export function saveProject(s: OSState, project: Project): OSState {
  const existing = s.projects.find((x) => x.id === project.id);
  const isReassigned = existing && existing.priorityId !== project.priorityId;
  const oldPriorityId = existing?.priorityId;

  // Update or insert project
  const updatedProjects = existing
    ? s.projects.map((x) => (x.id === project.id ? { ...project, demo: false } : x))
    : [...s.projects, { ...project, demo: false }];

  let priorities = [...s.priorities];

  if (isReassigned && oldPriorityId) {
    // If it was active on old priority, clear reference from old priority
    priorities = priorities.map((p) => {
      if (p.id === oldPriorityId && p.activeProjectId === project.id) {
        return { ...p, activeProjectId: undefined };
      }
      return p;
    });

    // For new priority: only assign as active if new priority currently has NO active project
    const newPriority = priorities.find((p) => p.id === project.priorityId);
    const newPriorityHasActive =
      newPriority?.activeProjectId &&
      updatedProjects.some((x) => x.id === newPriority.activeProjectId && x.priorityId === project.priorityId);

    if (!newPriorityHasActive && project.status === "active") {
      priorities = priorities.map((p) => {
        if (p.id === project.priorityId) {
          return {
            ...p,
            activeProjectId: project.id,
            project: project.name,
            milestone: project.milestone,
            bottleneck: project.bottlenecks || p.bottleneck,
            status: "Active",
          };
        }
        return p;
      });
    }
  }

  // If this project is currently the active project for its priority, keep priority fields in sync
  const targetPriority = priorities.find((p) => p.id === project.priorityId);
  if (targetPriority?.activeProjectId === project.id) {
    priorities = priorities.map((p) => {
      if (p.id === project.priorityId) {
        return {
          ...p,
          project: project.name,
          milestone: project.milestone,
          bottleneck: project.bottlenecks || p.bottleneck,
          status: project.status === "active" ? "Active" : project.status === "paused" ? "Paused" : project.status,
        };
      }
      return p;
    });
  }

  return syncPrioritiesWithProjects({ ...s, projects: updatedProjects, priorities });
}

/**
 * Deletes a project by id.
 * Removes active reference from associated priority and safely resets or falls back.
 * Preserves all unrelated projects and execution history.
 */
export function deleteProject(s: OSState, projectId: string): OSState {
  const updatedProjects = s.projects.filter((x) => x.id !== projectId);

  // Clear activeProjectId if it was this project
  const priorities = s.priorities.map((p) => {
    if (p.activeProjectId === projectId) {
      return { ...p, activeProjectId: undefined };
    }
    return p;
  });

  // Clear dangling reference in knowledge items if any
  const knowledge = s.knowledge.map((k) => (k.projectId === projectId ? { ...k, projectId: undefined } : k));

  return syncPrioritiesWithProjects({ ...s, projects: updatedProjects, priorities, knowledge });
}
