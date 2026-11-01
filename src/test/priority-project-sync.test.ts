import { describe, expect, it } from "vitest";
import { initialState } from "@/lib/os/seed";
import {
  syncPrioritiesWithProjects,
  setActiveProject,
  saveProject,
  deleteProject,
} from "@/lib/os/logic";
import type { OSState, Project } from "@/lib/os/types";

describe("Priority ↔ Project synchronization", () => {
  it("A. Project selection: sets active project and updates priority name, milestone, and status", () => {
    let s = syncPrioritiesWithProjects(initialState);
    const newProj: Project = {
      id: "proj-cap-2",
      name: "Killarity v3",
      objective: "Scale to 100 users",
      priorityId: 1,
      status: "active",
      hypothesis: "Self-serve onboarding works",
      milestone: "Launch public beta",
      metrics: "100 signups",
      bottlenecks: "Stripe integration",
      evidence: "",
      decisions: "",
      learning: "",
      documents: "",
      createdAt: "2026-10-31",
    };
    s = saveProject(s, newProj);
    s = setActiveProject(s, 1, "proj-cap-2");

    const p1 = s.priorities.find((p) => p.id === 1)!;
    expect(p1.activeProjectId).toBe("proj-cap-2");
    expect(p1.project).toBe("Killarity v3");
    expect(p1.milestone).toBe("Launch public beta");
    expect(p1.bottleneck).toBe("Stripe integration");
    expect(p1.status).toBe("Active");
  });

  it("B. Project editing: renaming active project or updating milestone synchronizes priority", () => {
    let s = syncPrioritiesWithProjects(initialState);
    const activeProject = s.projects.find((p) => p.id === "demo-killarity")!;
    const updated = {
      ...activeProject,
      name: "Killarity Supercharged",
      milestone: "Ship v2.5 to 50 beta testers",
      bottlenecks: "Design audit needed",
    };
    s = saveProject(s, updated);

    const p1 = s.priorities.find((p) => p.id === 1)!;
    expect(p1.project).toBe("Killarity Supercharged");
    expect(p1.milestone).toBe("Ship v2.5 to 50 beta testers");
    expect(p1.bottleneck).toBe("Design audit needed");
  });

  it("C. Project reassignment: reassigning project to another priority does not overwrite existing active project", () => {
    let s = syncPrioritiesWithProjects(initialState);
    // Project currently active on Priority 1 is demo-killarity
    // Priority 2 currently has demo-lbes as active
    const killarity = s.projects.find((p) => p.id === "demo-killarity")!;
    // Reassign killarity to Priority 2
    const reassigned: Project = { ...killarity, priorityId: 2 };
    s = saveProject(s, reassigned);

    // Priority 1 should have had demo-killarity cleared as active
    const p1 = s.priorities.find((p) => p.id === 1)!;
    expect(p1.activeProjectId).not.toBe("demo-killarity");

    // Priority 2 should STILL have demo-lbes as active (NOT silently overwritten)
    const p2 = s.priorities.find((p) => p.id === 2)!;
    expect(p2.activeProjectId).toBe("demo-lbes");
    expect(p2.project).toBe("LBES");
  });

  it("D. Project deletion: deleting an active project safely resets or clears active reference without affecting others", () => {
    let s = syncPrioritiesWithProjects(initialState);
    s = deleteProject(s, "demo-killarity");

    const p1 = s.priorities.find((p) => p.id === 1)!;
    expect(p1.activeProjectId).toBeUndefined();
    expect(p1.project).toBe("");
    expect(p1.milestone).toBe("");
    expect(p1.status).toBe("No active project");

    // Other priorities must remain intact
    const p2 = s.priorities.find((p) => p.id === 2)!;
    expect(p2.activeProjectId).toBe("demo-lbes");
    expect(p2.project).toBe("LBES");
  });

  it("E. Missing or invalid references: handles nonexistent projects safely", () => {
    const corruptedState: OSState = {
      ...initialState,
      priorities: [
        {
          id: 1,
          name: "Founder Capability",
          purpose: "Test",
          project: "Ghost Project",
          milestone: "Ghost Milestone",
          status: "Active",
          bottleneck: "",
          activeProjectId: "non-existent-id-12345",
        },
        ...initialState.priorities.slice(1),
      ],
      projects: initialState.projects.filter((p) => p.id !== "demo-killarity"),
    };

    const s = syncPrioritiesWithProjects(corruptedState);
    const p1 = s.priorities.find((p) => p.id === 1)!;
    // Safe empty state, does not crash
    expect(p1.activeProjectId).toBeUndefined();
    expect(p1.project).toBe("");
    expect(p1.milestone).toBe("");
    expect(p1.status).toBe("No active project");
  });

  it("F. Backward compatibility: migrating legacy state without activeProjectId populates activeProjectId", () => {
    const legacyState: OSState = {
      ...initialState,
      priorities: [
        {
          id: 1,
          name: "Founder Capability",
          purpose: "Purpose 1",
          project: "Killarity Engine",
          milestone: "Old milestone",
          status: "Active",
          bottleneck: "",
          // No activeProjectId here
        },
        {
          id: 2,
          name: "Cashflow Infrastructure",
          purpose: "Purpose 2",
          project: "LBES",
          milestone: "Old milestone",
          status: "Active",
          bottleneck: "",
        },
        {
          id: 3,
          name: "Learning for Execution",
          purpose: "Purpose 3",
          project: "Product + Trading Skills",
          milestone: "Old milestone",
          status: "Active",
          bottleneck: "",
        },
      ],
    };

    const s = syncPrioritiesWithProjects(legacyState);
    expect(s.priorities[0]!.activeProjectId).toBe("demo-killarity");
    expect(s.priorities[1]!.activeProjectId).toBe("demo-lbes");
    expect(s.priorities[2]!.activeProjectId).toBe("demo-skills");
  });
});
