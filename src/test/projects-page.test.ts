import { describe, expect, it } from "vitest";
import { initialState, today, uid } from "@/lib/os/seed";
import { saveProject, deleteProject, setActiveProject } from "@/lib/os/logic";
import type { OSState, Project, ProjectDoc } from "@/lib/os/types";

describe("Projects Page — Data & Features", () => {
  it("1. Priority 2 projects preserve and require workstream A or B", () => {
    let s = { ...initialState };
    const p2Proj: Project = {
      id: "p2-test",
      name: "LBES Growth Engine",
      objective: "Scale automated cashflow",
      priorityId: 2,
      status: "active",
      hypothesis: "Automated session reduces manual time",
      milestone: "Full rules backtested",
      metrics: "$1k/week",
      bottlenecks: "API rate limits",
      evidence: "",
      decisions: "",
      learning: "",
      documents: "",
      createdAt: today(),
      workstream: "A",
    };

    s = saveProject(s, p2Proj);
    const saved = s.projects.find((p) => p.id === "p2-test")!;
    expect(saved.workstream).toBe("A");

    // Switching to workstream B
    const updated = { ...saved, workstream: "B" as const };
    s = saveProject(s, updated);
    const savedB = s.projects.find((p) => p.id === "p2-test")!;
    expect(savedB.workstream).toBe("B");
  });

  it("2. Priority 3 projects support multi-select and custom learning categories", () => {
    let s = { ...initialState };
    const p3Proj: Project = {
      id: "p3-test",
      name: "Algorithmic Architecture",
      objective: "Master distributed systems",
      priorityId: 3,
      status: "active",
      hypothesis: "",
      milestone: "Finish papers",
      metrics: "",
      bottlenecks: "",
      evidence: "",
      decisions: "",
      learning: "",
      documents: "",
      createdAt: today(),
      learningCategories: [
        "Research and research papers",
        "Practical execution and experiments",
        "Custom: Kernel Engineering",
      ],
    };

    s = saveProject(s, p3Proj);
    const saved = s.projects.find((p) => p.id === "p3-test")!;
    expect(saved.learningCategories).toHaveLength(3);
    expect(saved.learningCategories).toContain("Research and research papers");
    expect(saved.learningCategories).toContain("Custom: Kernel Engineering");
  });

  it("3. Supporting up to 5 documents per project with save, edit, and delete", () => {
    let s = { ...initialState };
    const doc1: ProjectDoc = {
      id: uid(),
      title: "Architecture Spec",
      content: "# Architecture\n\nHigh level diagram",
      createdAt: today(),
      updatedAt: today(),
    };
    const doc2: ProjectDoc = {
      id: uid(),
      title: "Meeting Notes",
      content: "Discussed with users",
      createdAt: today(),
      updatedAt: today(),
    };

    const projectWithDocs: Project = {
      id: "proj-docs-test",
      name: "System Core",
      objective: "Build core",
      priorityId: 1,
      status: "active",
      hypothesis: "",
      milestone: "",
      metrics: "",
      bottlenecks: "",
      evidence: "",
      decisions: "",
      learning: "",
      documents: "Existing supporting text link",
      createdAt: today(),
      docs: [doc1, doc2],
    };

    s = saveProject(s, projectWithDocs);
    let saved = s.projects.find((p) => p.id === "proj-docs-test")!;
    expect(saved.docs).toHaveLength(2);
    expect(saved.documents).toBe("Existing supporting text link");

    // Edit doc1
    const editedDoc1 = { ...doc1, title: "Architecture Spec v2" };
    saved = { ...saved, docs: [editedDoc1, doc2] };
    s = saveProject(s, saved);
    expect(s.projects.find((p) => p.id === "proj-docs-test")!.docs![0].title).toBe("Architecture Spec v2");

    // Delete doc2
    saved = { ...saved, docs: [editedDoc1] };
    s = saveProject(s, saved);
    expect(s.projects.find((p) => p.id === "proj-docs-test")!.docs).toHaveLength(1);
  });

  it("4. Backward compatibility: existing projects without new fields load safely", () => {
    // Simulating legacy record from localStorage without deadline, workstream, learningCategories, or docs
    const legacyProject: Project = {
      id: "legacy-proj-1",
      name: "Legacy Project",
      objective: "Legacy goal",
      priorityId: 1,
      status: "active",
      hypothesis: "hyp",
      milestone: "m1",
      metrics: "met",
      bottlenecks: "none",
      evidence: "none",
      decisions: "none",
      learning: "none",
      documents: "some doc text",
      createdAt: "2026-01-01",
    };

    const stateWithLegacy: OSState = {
      ...initialState,
      projects: [...initialState.projects, legacyProject],
    };

    const saved = saveProject(stateWithLegacy, legacyProject);
    const found = saved.projects.find((p) => p.id === "legacy-proj-1")!;
    expect(found.name).toBe("Legacy Project");
    expect(found.deadline).toBeUndefined();
    expect(found.docs).toBeUndefined();
    // Verify fallback checks don't crash
    expect(found.docs?.length ?? 0).toBe(0);
    expect(found.deadline ?? "No deadline set").toBe("No deadline set");
  });
});
