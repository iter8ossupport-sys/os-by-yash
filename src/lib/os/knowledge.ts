import type {
  KnowledgeFormat,
  KnowledgeFormatData,
  KnowledgeItem,
} from "./types";

export const KNOWLEDGE_FORMATS: {
  id: KnowledgeFormat;
  label: string;
  description: string;
  meaning: string;
}[] = [
  {
    id: "principle",
    label: "Principle",
    description:
      "Fundamental rule, belief, or insight that guides decisions and behavior",
    meaning: "What rule should guide decisions?",
  },
  {
    id: "method",
    label: "Method",
    description:
      "Repeatable way to perform a particular activity or solve a specific problem",
    meaning: "How should an activity be performed?",
  },
  {
    id: "framework",
    label: "Framework",
    description:
      "Structured thinking or decision-making model organizing multiple concepts or stages",
    meaning: "How should a problem or decision be structured?",
  },
  {
    id: "custom",
    label: "Custom",
    description:
      "Flexible format for knowledge that does not fit predefined templates",
    meaning: "How should other knowledge be organized?",
  },
];

export function getKnowledgeFormat(
  item?: Partial<KnowledgeItem>,
): KnowledgeFormat {
  return item?.knowledgeFormat || "custom";
}

export function formatBadgeClass(format?: KnowledgeFormat): string {
  switch (format) {
    case "principle":
      return "border-amber-500/30 text-amber-400 bg-amber-500/10";
    case "method":
      return "border-cyan/30 text-cyan bg-cyan/10";
    case "framework":
      return "border-violet/30 text-violet bg-violet/10";
    case "custom":
    default:
      return "border-slate-400/30 text-slate-300 bg-slate-400/10";
  }
}

export function serializeKnowledgeBody(
  format: KnowledgeFormat,
  data?: KnowledgeFormatData,
  fallback = "",
): string {
  if (!data) return fallback;

  if (format === "principle" && data.principle) {
    const parts: string[] = [];
    if (data.principle.corePrinciple?.trim()) {
      parts.push(`Core Principle:\n${data.principle.corePrinciple.trim()}`);
    }
    if (data.principle.whyItMatters?.trim()) {
      parts.push(`Why It Matters:\n${data.principle.whyItMatters.trim()}`);
    }
    if (data.principle.whenToApply?.trim()) {
      parts.push(`When to Apply:\n${data.principle.whenToApply.trim()}`);
    }
    if (data.principle.exceptions?.trim()) {
      parts.push(
        `Exceptions or Limitations:\n${data.principle.exceptions.trim()}`,
      );
    }
    return parts.join("\n\n") || fallback;
  }

  if (format === "method" && data.method) {
    const parts: string[] = [];
    if (data.method.purpose?.trim()) {
      parts.push(`Purpose / Problem:\n${data.method.purpose.trim()}`);
    }
    const cleanSteps = (data.method.steps || []).filter(
      (s) => s.trim().length > 0,
    );
    if (cleanSteps.length > 0) {
      parts.push(
        `Steps:\n${cleanSteps.map((s, i) => `${i + 1}. ${s.trim()}`).join("\n")}`,
      );
    }
    if (data.method.whenToUse?.trim()) {
      parts.push(`When to Use:\n${data.method.whenToUse.trim()}`);
    }
    if (data.method.expectedResult?.trim()) {
      parts.push(`Expected Result:\n${data.method.expectedResult.trim()}`);
    }
    return parts.join("\n\n") || fallback;
  }

  if (format === "framework" && data.framework) {
    const parts: string[] = [];
    if (data.framework.purpose?.trim()) {
      parts.push(`Purpose / Problem Solved:\n${data.framework.purpose.trim()}`);
    }
    const cleanComponents = (data.framework.components || []).filter(
      (c) => c.trim().length > 0,
    );
    if (cleanComponents.length > 0) {
      parts.push(
        `Components / Stages:\n${cleanComponents.map((c, i) => `${i + 1}. ${c.trim()}`).join("\n")}`,
      );
    }
    if (data.framework.whenToUse?.trim()) {
      parts.push(`When to Use:\n${data.framework.whenToUse.trim()}`);
    }
    if (data.framework.howItWorks?.trim()) {
      parts.push(`How It Works:\n${data.framework.howItWorks.trim()}`);
    }
    if (data.framework.expectedOutput?.trim()) {
      parts.push(`Expected Output:\n${data.framework.expectedOutput.trim()}`);
    }
    if (data.framework.example?.trim()) {
      parts.push(`Example:\n${data.framework.example.trim()}`);
    }
    return parts.join("\n\n") || fallback;
  }

  if (format === "custom" && data.custom) {
    const prefix = data.custom.formatName?.trim()
      ? `[${data.custom.formatName.trim()}]\n\n`
      : "";
    return `${prefix}${data.custom.content || fallback}`.trim();
  }

  return fallback;
}

export function isKnowledgeEntryValid(
  title: string,
  format: KnowledgeFormat,
  formatData?: KnowledgeFormatData,
  fallbackBody = "",
): boolean {
  if (!title.trim()) return false;

  switch (format) {
    case "principle":
      return !!formatData?.principle?.corePrinciple?.trim();
    case "method": {
      const steps = formatData?.method?.steps || [];
      return steps.some((s) => s.trim().length > 0);
    }
    case "framework": {
      const components = formatData?.framework?.components || [];
      return components.some((c) => c.trim().length > 0);
    }
    case "custom":
    default: {
      const customContent = formatData?.custom?.content;
      return typeof customContent === "string"
        ? customContent.trim().length > 0
        : fallbackBody.trim().length > 0;
    }
  }
}

export function matchesKnowledgeQuery(
  item: KnowledgeItem,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();

  if (item.title.toLowerCase().includes(q)) return true;
  if (item.tags.toLowerCase().includes(q)) return true;
  if (item.body.toLowerCase().includes(q)) return true;

  const fd = item.formatData;
  if (!fd) return false;

  if (fd.principle) {
    const p = fd.principle;
    if (p.corePrinciple?.toLowerCase().includes(q)) return true;
    if (p.whyItMatters?.toLowerCase().includes(q)) return true;
    if (p.whenToApply?.toLowerCase().includes(q)) return true;
    if (p.exceptions?.toLowerCase().includes(q)) return true;
  }

  if (fd.method) {
    const m = fd.method;
    if (m.purpose?.toLowerCase().includes(q)) return true;
    if (m.whenToUse?.toLowerCase().includes(q)) return true;
    if (m.expectedResult?.toLowerCase().includes(q)) return true;
    if (m.steps?.some((s) => s.toLowerCase().includes(q))) return true;
  }

  if (fd.framework) {
    const f = fd.framework;
    if (f.purpose?.toLowerCase().includes(q)) return true;
    if (f.whenToUse?.toLowerCase().includes(q)) return true;
    if (f.howItWorks?.toLowerCase().includes(q)) return true;
    if (f.expectedOutput?.toLowerCase().includes(q)) return true;
    if (f.example?.toLowerCase().includes(q)) return true;
    if (f.components?.some((c) => c.toLowerCase().includes(q))) return true;
  }

  if (fd.custom) {
    if (fd.custom.formatName?.toLowerCase().includes(q)) return true;
    if (fd.custom.content?.toLowerCase().includes(q)) return true;
  }

  return false;
}

export function getKnowledgePreview(item: KnowledgeItem): string {
  const format = getKnowledgeFormat(item);
  const fd = item.formatData;

  if (format === "principle" && fd?.principle?.corePrinciple?.trim()) {
    return fd.principle.corePrinciple.trim();
  }

  if (format === "method" && fd?.method) {
    const steps = (fd.method.steps || []).filter((s) => s.trim().length > 0);
    if (steps.length > 0) {
      const summary = steps
        .slice(0, 2)
        .map((s, i) => `${i + 1}. ${s}`)
        .join(" · ");
      return `${steps.length} step${steps.length > 1 ? "s" : ""}: ${summary}${steps.length > 2 ? "..." : ""}`;
    }
  }

  if (format === "framework" && fd?.framework) {
    const comps = (fd.framework.components || []).filter(
      (c) => c.trim().length > 0,
    );
    if (comps.length > 0) {
      return `${comps.length} stages: ${comps.slice(0, 3).join(" → ")}${comps.length > 3 ? "..." : ""}`;
    }
  }

  if (format === "custom" && fd?.custom?.content?.trim()) {
    return fd.custom.content.trim();
  }

  return item.body;
}
