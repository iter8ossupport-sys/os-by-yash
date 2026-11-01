import { describe, expect, it } from "vitest";
import { initialState, newDraft, recommendTasks } from "@/lib/os/seed";
import { approvePlan, emergencyPause, finishTask, pauseTask, startTask, elapsed, buildDayRecord } from "@/lib/os/logic";

const approved = () => approvePlan({ ...initialState, draft: { ...newDraft(), tasks: recommendTasks(initialState.priorities) } });

describe("execution rules", () => {
  it("approval saves the plan without starting a task", () => {
    const s = approved();
    expect(s.plan).not.toBeNull();
    expect(s.activeTaskId).toBeNull();
    expect(s.plan!.tasks.every((t) => t.status === "pending")).toBe(true);
  });

  it("pause/resume accumulates time", () => {
    let s = approved();
    const id = s.plan!.tasks[0]!.id;
    s = startTask(s, id, 0);
    s = pauseTask(s, id, 60000);
    s = startTask(s, id, 100000);
    expect(elapsed(s.plan!.tasks[0]!, 130000)).toBe(90000);
  });

  it("emergency switch preserves interrupted task time", () => {
    let s = approved();
    const id = s.plan!.tasks[0]!.id;
    s = startTask(s, id, 0);
    s = emergencyPause(s, 30000);
    expect(s.interruptedTaskId).toBe(id);
    expect(s.plan!.tasks[0]).toMatchObject({ status: "paused", elapsedMs: 30000 });
  });

  it("finishing records output separately from outcome", () => {
    let s = approved();
    const id = s.plan!.tasks[0]!.id;
    s = finishTask(s, id, { Note: "done" }, false);
    expect(s.plan!.tasks[0]).toMatchObject({ status: "done", outcomeAchieved: false, output: { Note: "done" } });
  });

  it("preserves single-active-task invariant when starting another task", () => {
    let s = approved();
    const task1Id = s.plan!.tasks[0]!.id;
    const task2Id = s.plan!.tasks[1]!.id;
    // Start task 1
    s = startTask(s, task1Id, 1000);
    expect(s.activeTaskId).toBe(task1Id);
    expect(s.plan!.tasks.find((t) => t.id === task1Id)!.status).toBe("active");

    // Start task 2 -> task 1 must be paused automatically
    s = startTask(s, task2Id, 5000);
    expect(s.activeTaskId).toBe(task2Id);
    expect(s.plan!.tasks.find((t) => t.id === task2Id)!.status).toBe("active");
    expect(s.plan!.tasks.find((t) => t.id === task1Id)!.status).toBe("paused");
  });

  it("records Priority 2 Workstream A (Cashflow / System Research) into DayRecord outputs", () => {
    let s = approved();
    const p2Task = s.plan!.tasks.find((t) => t.priorityId === 2 && t.selected)!;
    s = finishTask(
      s,
      p2Task.id,
      {
        Workstream: "Cashflow / System Research",
        "System / Strategy name": "LBES Core",
        "Activity type": "Strategy Research",
        "Financial / simulated result": "+2.5R",
      },
      true
    );

    const record = buildDayRecord(s.plan!, "Tested strategy rules");
    expect(record.tasksDone).toBeGreaterThanOrEqual(1);
    expect(record.outcomesAchieved).toContain(2);

    const p2Output = record.outputs.find((o) => o.title === p2Task.title);
    expect(p2Output).toBeDefined();
    expect(p2Output!.workstream).toBe("Cashflow / System Research");
    expect(p2Output!.text).toContain("LBES Core");
    expect(p2Output!.text).toContain("+2.5R");
  });

  it("records Priority 2 Workstream B (Fintech Product Capability) into DayRecord outputs", () => {
    let s = approved();
    const p2Task = s.plan!.tasks.find((t) => t.priorityId === 2 && t.selected)!;
    s = finishTask(
      s,
      p2Task.id,
      {
        Workstream: "Fintech Product Capability",
        "Actual product output": "Shipped webhook alert flow",
        "Feature or problem": "Latency reduction",
      },
      false
    );

    const record = buildDayRecord(s.plan!, "Product sprint");
    const p2Output = record.outputs.find((o) => o.title === p2Task.title);
    expect(p2Output).toBeDefined();
    expect(p2Output!.workstream).toBe("Fintech Product Capability");
    expect(p2Output!.text).toContain("Shipped webhook alert flow");
  });
});
