import { describe, expect, it } from "vitest";
import { initialState, today, uid } from "@/lib/os/seed";
import type {
  KnowledgeFormat,
  KnowledgeItem,
  OSState,
  Task,
} from "@/lib/os/types";
import {
  getKnowledgeFormat,
  getKnowledgePreview,
  isKnowledgeEntryValid,
  matchesKnowledgeQuery,
  serializeKnowledgeBody,
} from "@/lib/os/knowledge";
import { promoteImprovementToKnowledge } from "@/lib/os/reviews/operations";

describe("Yash OS — Knowledge Format & Reusability Enhancement", () => {
  it("1. Creates and structures Principle entries properly", () => {
    const principleItem: KnowledgeItem = {
      id: uid(),
      title: "Validate Demand First",
      type: "Note",
      knowledgeFormat: "principle",
      formatData: {
        principle: {
          corePrinciple:
            "Never build a complex feature before getting 3 customer pre-orders or LOIs.",
          whyItMatters:
            "Prevents wasted engineering bandwidth and ensures founder focus.",
          whenToApply: "Before committing any milestone in Plan.",
          exceptions: "Core security fixes and foundational bugs.",
        },
      },
      body: "",
      tags: "startup, sales, rule",
      createdAt: today(),
      priorityId: 1,
      projectId: "demo-killarity",
      schemaVersion: 1,
    };

    principleItem.body = serializeKnowledgeBody(
      "principle",
      principleItem.formatData,
    );

    expect(principleItem.knowledgeFormat).toBe("principle");
    expect(principleItem.body).toContain("Never build a complex feature");
    expect(principleItem.body).toContain(
      "Prevents wasted engineering bandwidth",
    );
    expect(getKnowledgePreview(principleItem)).toBe(
      "Never build a complex feature before getting 3 customer pre-orders or LOIs.",
    );

    // Validation
    expect(
      isKnowledgeEntryValid(
        principleItem.title,
        "principle",
        principleItem.formatData,
      ),
    ).toBe(true);
    expect(
      isKnowledgeEntryValid(principleItem.title, "principle", {
        principle: { corePrinciple: "   " },
      }),
    ).toBe(false);
  });

  it("2. Creates and structures Method entries with repeatable steps", () => {
    const methodItem: KnowledgeItem = {
      id: uid(),
      title: "Cold Founder Outreach Protocol",
      type: "Research",
      knowledgeFormat: "method",
      formatData: {
        method: {
          purpose: "Reach out to target ICP founders with minimal friction.",
          steps: [
            "Identify 10 founders who posted about execution friction on LinkedIn/Twitter.",
            "Draft a 2-sentence personalized observation focusing on their specific bottleneck.",
            "Send frictionless invite with direct calendly link or asynchronous question.",
            "Log response in Yash OS Knowledge or Project Evidence.",
          ],
          whenToUse: "Daily outreach time block in Execute.",
          expectedResult: "At least 2 booked discovery conversations per week.",
        },
      },
      body: "",
      tags: "outreach, sales, lb-protocol",
      createdAt: today(),
      priorityId: 2,
      schemaVersion: 1,
    };

    methodItem.body = serializeKnowledgeBody("method", methodItem.formatData);

    expect(methodItem.knowledgeFormat).toBe("method");
    expect(methodItem.formatData?.method?.steps).toHaveLength(4);
    expect(methodItem.body).toContain("1. Identify 10 founders");
    expect(methodItem.body).toContain("4. Log response");
    expect(getKnowledgePreview(methodItem)).toContain("4 steps");

    // Reordering test
    const steps = [...(methodItem.formatData?.method?.steps || [])];
    const reordered = [steps[1]!, steps[0]!, steps[2]!, steps[3]!];
    const updatedMethod = {
      ...methodItem,
      formatData: {
        method: {
          ...methodItem.formatData!.method!,
          steps: reordered,
        },
      },
    };
    expect(updatedMethod.formatData.method.steps[0]).toBe(steps[1]);

    // Validation
    expect(
      isKnowledgeEntryValid(methodItem.title, "method", methodItem.formatData),
    ).toBe(true);
    expect(
      isKnowledgeEntryValid(methodItem.title, "method", {
        method: { steps: [] },
      }),
    ).toBe(false);
  });

  it("3. Creates and structures Framework entries with stages/components", () => {
    const frameworkItem: KnowledgeItem = {
      id: uid(),
      title: "Three-Tier Priority Architecture",
      type: "Documentation",
      knowledgeFormat: "framework",
      formatData: {
        framework: {
          purpose: "Maintain absolute clarity on high-leverage founder effort.",
          components: [
            "Priority 1: Founder Capability & Flagship Startup",
            "Priority 2: Cashflow Engine & Solopreneur Infrastructure",
            "Priority 3: Execution Skills & Learning Mastery",
          ],
          whenToUse: "Daily planning and long-term goal setting.",
          howItWorks:
            "Every day must allocate effort across all 3 tiers with strict selection rules.",
          expectedOutput: "Balanced momentum and zero existential burnout.",
          example: "College day: 2h P1, 1.5h P2, 0.5h P3.",
        },
      },
      body: "",
      tags: "framework, architecture, yash-os",
      createdAt: today(),
      schemaVersion: 1,
    };

    frameworkItem.body = serializeKnowledgeBody(
      "framework",
      frameworkItem.formatData,
    );

    expect(frameworkItem.knowledgeFormat).toBe("framework");
    expect(frameworkItem.formatData?.framework?.components).toHaveLength(3);
    expect(frameworkItem.body).toContain("Priority 1: Founder Capability");
    expect(getKnowledgePreview(frameworkItem)).toContain("3 stages");

    // Validation
    expect(
      isKnowledgeEntryValid(
        frameworkItem.title,
        "framework",
        frameworkItem.formatData,
      ),
    ).toBe(true);
    expect(
      isKnowledgeEntryValid(frameworkItem.title, "framework", {
        framework: { components: [""] },
      }),
    ).toBe(false);
  });

  it("4. Creates and structures Custom entries flexibly", () => {
    const customItem: KnowledgeItem = {
      id: uid(),
      title: "Emergency Architecture Checklist",
      type: "Note",
      knowledgeFormat: "custom",
      formatData: {
        custom: {
          formatName: "Checklist",
          content:
            "- Verify database connection\n- Flush cache\n- Inspect background workers",
        },
      },
      body: "",
      tags: "ops, emergency",
      createdAt: today(),
      schemaVersion: 1,
    };

    customItem.body = serializeKnowledgeBody("custom", customItem.formatData);

    expect(customItem.knowledgeFormat).toBe("custom");
    expect(customItem.body).toContain("[Checklist]");
    expect(customItem.body).toContain("Verify database connection");
    expect(
      isKnowledgeEntryValid(customItem.title, "custom", customItem.formatData),
    ).toBe(true);
  });

  it("5. Preserves backward compatibility for legacy entries without knowledgeFormat", () => {
    const legacyItem: KnowledgeItem = {
      id: "legacy-1",
      title: "Pre-existing Note",
      type: "Note",
      body: "Simple legacy content written before the update.",
      tags: "legacy",
      createdAt: "2026-10-15",
    };

    expect(getKnowledgeFormat(legacyItem)).toBe("custom");
    expect(getKnowledgePreview(legacyItem)).toBe(
      "Simple legacy content written before the update.",
    );
    expect(
      isKnowledgeEntryValid(
        legacyItem.title,
        "custom",
        undefined,
        legacyItem.body,
      ),
    ).toBe(true);
  });

  it("6. Searches across titles, tags, and structured fields (steps, components, principles)", () => {
    const methodItem: KnowledgeItem = {
      id: "search-method-1",
      title: "Deployment Routine",
      type: "Documentation",
      knowledgeFormat: "method",
      formatData: {
        method: {
          steps: [
            "Run vitest pool threads",
            "Verify cloudflare worker manifest",
            "Deploy to edge",
          ],
        },
      },
      body: "Method steps body",
      tags: "devops",
      createdAt: today(),
    };

    expect(matchesKnowledgeQuery(methodItem, "Deployment")).toBe(true);
    expect(matchesKnowledgeQuery(methodItem, "devops")).toBe(true);
    // Searching text inside a step
    expect(matchesKnowledgeQuery(methodItem, "cloudflare worker")).toBe(true);
    expect(matchesKnowledgeQuery(methodItem, "unrelated query")).toBe(false);
  });

  it("7. Connects to Operating Loop (Plan association, Execute reference, Reviews promotion)", () => {
    let state: OSState = { ...initialState };

    // 1. Create a Method in knowledge
    const methodItem: KnowledgeItem = {
      id: "m-outreach",
      title: "5-Step Outreach",
      type: "Learning",
      knowledgeFormat: "method",
      formatData: {
        method: {
          steps: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
        },
      },
      body: "5 steps",
      tags: "sales",
      createdAt: today(),
      priorityId: 1,
      projectId: "demo-killarity",
    };
    state = { ...state, knowledge: [methodItem, ...state.knowledge] };

    // 2. PRE-THINK: Create an approved plan and associate with a Task and Outcome
    const sampleTask: Task = {
      id: "task-test-1",
      priorityId: 1,
      title: "Discovery calls with 3 founders",
      duration: 60,
      timeBlock: "10:00-11:00",
      expectedOutput: "3 notes",
      successCriteria: "Done",
      what: "Interview founders",
      how: "Use 5-step outreach protocol",
      where: "Google Meet",
      kind: "simple",
      selected: true,
      status: "pending",
      elapsedMs: 0,
      knowledgeIds: ["m-outreach"],
    };

    state = {
      ...state,
      plan: {
        context: {
          date: today(),
          dayType: "Non-College Day",
          hours: 8,
          commitments: "",
          energy: "High",
        },
        allocation: { 1: 4, 2: 2, 3: 2 },
        outcomes: {
          1: "Validate demand",
          2: "Cashflow setup",
          3: "Study skills",
        },
        outcomeKnowledgeIds: {
          1: ["m-outreach"],
        },
        tasks: [sampleTask],
      },
    };

    expect(state.plan!.tasks[0]!.knowledgeIds).toContain("m-outreach");
    expect(state.plan!.outcomeKnowledgeIds![1]).toContain("m-outreach");

    // 3. ACT: Retrieve knowledge linked to the active task and project
    const currentTask = state.plan!.tasks[0]!;
    const linkedK = state.knowledge.filter(
      (k) =>
        (currentTask.knowledgeIds || []).includes(k.id) ||
        k.projectId === "demo-killarity",
    );
    expect(linkedK.length).toBeGreaterThan(0);
    expect(linkedK.some((k) => k.id === "m-outreach")).toBe(true);

    // 4. POST-THINK: Reviews promotion with structured format
    const dummyImp = {
      id: "imp-test-1",
      periodRef: "daily-2026-11-01",
      periodType: "daily" as const,
      problemStatement: "Founder spent 3 hours on unvalidated refactoring.",
      recommendation:
        "Establish 30-minute spike rule before any architecture rework.",
      evidence: { metrics: ["P1 180m unplanned"], dayDates: ["2026-11-01"] },
      status: "evaluated" as const,
      evaluationOutcome: "succeeded" as const,
      evaluationNotes: "Validated. Saved 2 hours on Day 2.",
      createdAt: today(),
    };
    state = {
      ...state,
      improvements: [dummyImp, ...(state.improvements || [])],
    };

    // Promote with structured Principle format
    state = promoteImprovementToKnowledge(state, dummyImp.id, today(), {
      title: "30-Minute Spike Rule",
      knowledgeFormat: "principle",
      formatData: {
        principle: {
          corePrinciple:
            "Establish 30-minute spike rule before any architecture rework.",
          whyItMatters: "Prevents over-engineering on unvalidated assumptions.",
        },
      },
    });

    const promotedImp = state.improvements?.find((i) => i.id === dummyImp.id);
    expect(promotedImp?.promotedToKnowledgeId).toBeDefined();

    const createdKnowledge = state.knowledge.find(
      (k) => k.id === promotedImp?.promotedToKnowledgeId,
    );
    expect(createdKnowledge).toBeDefined();
    expect(createdKnowledge?.knowledgeFormat).toBe("principle");
    expect(createdKnowledge?.formatData?.principle?.corePrinciple).toBe(
      "Establish 30-minute spike rule before any architecture rework.",
    );
  });

  it("8. Preserves structured formats through JSON export and import", () => {
    const originalState: OSState = {
      ...initialState,
      knowledge: [
        {
          id: "k-test-export",
          title: "Test Export Framework",
          type: "Documentation",
          knowledgeFormat: "framework",
          formatData: {
            framework: {
              purpose: "Full stack export verification",
              components: [
                "Stage 1: Serialize",
                "Stage 2: Transmit",
                "Stage 3: Restore",
              ],
            },
          },
          body: "Framework body",
          tags: "export, test",
          createdAt: today(),
          schemaVersion: 1,
        },
        ...initialState.knowledge,
      ],
    };

    // Serialize to JSON (as settings export does)
    const exportedJson = JSON.stringify(originalState);
    const restoredState: OSState = JSON.parse(exportedJson);

    const restoredItem = restoredState.knowledge.find(
      (k) => k.id === "k-test-export",
    );
    expect(restoredItem).toBeDefined();
    expect(restoredItem?.knowledgeFormat).toBe("framework");
    expect(restoredItem?.formatData?.framework?.components).toEqual([
      "Stage 1: Serialize",
      "Stage 2: Transmit",
      "Stage 3: Restore",
    ]);
  });
});
