import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  Trash2,
  Compass,
  Workflow,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import type {
  KnowledgeFormat,
  KnowledgeFormatData,
  KnowledgeItem,
  KnowledgeType,
  PriorityId,
} from "@/lib/os/types";
import {
  KNOWLEDGE_FORMATS,
  getKnowledgeFormat,
  isKnowledgeEntryValid,
  serializeKnowledgeBody,
} from "@/lib/os/knowledge";
import {
  Button,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from "@/components/os/ui";
import { cn } from "@/lib/utils";

const TYPES: KnowledgeType[] = [
  "Note",
  "Research",
  "Learning",
  "Documentation",
  "Book/Resource",
  "User Feedback",
  "Market Insight",
  "Lesson",
  "Decision",
  "Document",
];

const FORMAT_ICONS = {
  principle: Compass,
  method: Workflow,
  framework: Layers,
  custom: FileText,
};

interface KnowledgeEditorModalProps {
  open: boolean;
  onClose: () => void;
  item: KnowledgeItem;
  onSave: (saved: KnowledgeItem) => void;
  onDelete?: (id: string) => void;
  titleOverride?: string;
  confirmLabel?: string;
}

export function KnowledgeEditorModal({
  open,
  onClose,
  item,
  onSave,
  onDelete,
  titleOverride,
  confirmLabel = "Save",
}: KnowledgeEditorModalProps) {
  const { state } = useOS();

  // Core metadata
  const [title, setTitle] = useState(item.title || "");
  const [format, setFormat] = useState<KnowledgeFormat>(
    getKnowledgeFormat(item),
  );
  const [type, setType] = useState<KnowledgeType>(item.type || "Note");
  const [priorityId, setPriorityId] = useState<PriorityId | undefined>(
    item.priorityId,
  );
  const [projectId, setProjectId] = useState<string | undefined>(
    item.projectId,
  );
  const [tags, setTags] = useState(item.tags || "");

  // Collapsible toggle
  const [showAdditional, setShowAdditional] = useState(false);

  // Principle fields
  const [corePrinciple, setCorePrinciple] = useState(
    item.formatData?.principle?.corePrinciple ||
      (item.knowledgeFormat === "principle" ? item.body : ""),
  );
  const [whyItMatters, setWhyItMatters] = useState(
    item.formatData?.principle?.whyItMatters || "",
  );
  const [whenToApply, setWhenToApply] = useState(
    item.formatData?.principle?.whenToApply || "",
  );
  const [exceptions, setExceptions] = useState(
    item.formatData?.principle?.exceptions || "",
  );

  // Method fields
  const [methodPurpose, setMethodPurpose] = useState(
    item.formatData?.method?.purpose || "",
  );
  const [steps, setSteps] = useState<string[]>(
    item.formatData?.method?.steps && item.formatData.method.steps.length > 0
      ? [...item.formatData.method.steps]
      : [""],
  );
  const [newStepInput, setNewStepInput] = useState("");
  const [methodWhenToUse, setMethodWhenToUse] = useState(
    item.formatData?.method?.whenToUse || "",
  );
  const [expectedResult, setExpectedResult] = useState(
    item.formatData?.method?.expectedResult || "",
  );

  // Framework fields
  const [frameworkPurpose, setFrameworkPurpose] = useState(
    item.formatData?.framework?.purpose || "",
  );
  const [frameworkWhenToUse, setFrameworkWhenToUse] = useState(
    item.formatData?.framework?.whenToUse || "",
  );
  const [components, setComponents] = useState<string[]>(
    item.formatData?.framework?.components &&
      item.formatData.framework.components.length > 0
      ? [...item.formatData.framework.components]
      : [""],
  );
  const [newCompInput, setNewCompInput] = useState("");
  const [howItWorks, setHowItWorks] = useState(
    item.formatData?.framework?.howItWorks || "",
  );
  const [expectedOutput, setExpectedOutput] = useState(
    item.formatData?.framework?.expectedOutput || "",
  );
  const [example, setExample] = useState(
    item.formatData?.framework?.example || "",
  );

  // Custom fields
  const [customFormatName, setCustomFormatName] = useState(
    item.formatData?.custom?.formatName || "",
  );
  const [customContent, setCustomContent] = useState(
    item.formatData?.custom?.content || item.body || "",
  );

  // Step operations
  const updateStep = (index: number, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? val : s)));
  };
  const addStep = (val?: string) => {
    const text = (val !== undefined ? val : newStepInput).trim();
    if (!text && val === undefined) return;
    setSteps((prev) => [...prev, text]);
    if (val === undefined) setNewStepInput("");
  };
  const removeStep = (index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };
  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target]!;
      next[target] = tmp!;
      return next;
    });
  };

  // Component operations
  const updateComponent = (index: number, val: string) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? val : c)));
  };
  const addComponent = (val?: string) => {
    const text = (val !== undefined ? val : newCompInput).trim();
    if (!text && val === undefined) return;
    setComponents((prev) => [...prev, text]);
    if (val === undefined) setNewCompInput("");
  };
  const removeComponent = (index: number) => {
    setComponents((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };
  const moveComponent = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= components.length) return;
    setComponents((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target]!;
      next[target] = tmp!;
      return next;
    });
  };

  // Build current formatData for validation and saving
  const currentFormatData: KnowledgeFormatData = {
    principle:
      format === "principle"
        ? {
            corePrinciple: corePrinciple.trim(),
            whyItMatters: whyItMatters.trim() || undefined,
            whenToApply: whenToApply.trim() || undefined,
            exceptions: exceptions.trim() || undefined,
          }
        : undefined,
    method:
      format === "method"
        ? {
            purpose: methodPurpose.trim() || undefined,
            steps: steps.map((s) => s.trim()).filter((s) => s.length > 0),
            whenToUse: methodWhenToUse.trim() || undefined,
            expectedResult: expectedResult.trim() || undefined,
          }
        : undefined,
    framework:
      format === "framework"
        ? {
            purpose: frameworkPurpose.trim() || undefined,
            whenToUse: frameworkWhenToUse.trim() || undefined,
            components: components
              .map((c) => c.trim())
              .filter((c) => c.length > 0),
            howItWorks: howItWorks.trim() || undefined,
            expectedOutput: expectedOutput.trim() || undefined,
            example: example.trim() || undefined,
          }
        : undefined,
    custom:
      format === "custom"
        ? {
            formatName: customFormatName.trim() || undefined,
            content: customContent.trim(),
          }
        : undefined,
  };

  const isValid = isKnowledgeEntryValid(
    title,
    format,
    currentFormatData,
    customContent,
  );

  const handleSave = () => {
    if (!isValid) {
      toast.error("Please fill in required fields.");
      return;
    }

    const cleanBody = serializeKnowledgeBody(
      format,
      currentFormatData,
      customContent || item.body,
    );

    const updatedItem: KnowledgeItem = {
      ...item,
      title: title.trim(),
      type,
      priorityId,
      projectId: projectId || undefined,
      tags: tags.trim(),
      knowledgeFormat: format,
      formatData: currentFormatData,
      body: cleanBody,
      schemaVersion: 1,
      demo: false,
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        titleOverride ||
        (item.title ? "Edit Knowledge Entry" : "New Knowledge Entry")
      }
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label>
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            value={title}
            placeholder="e.g. Validate Demand Before Building"
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-medium"
          />
        </div>

        {/* Knowledge Format Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="mb-0">Knowledge Format</Label>
            <span className="text-[11px] text-muted-foreground">
              {KNOWLEDGE_FORMATS.find((f) => f.id === format)?.meaning}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KNOWLEDGE_FORMATS.map((f) => {
              const Icon = FORMAT_ICONS[f.id];
              const isSelected = format === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all",
                    isSelected
                      ? "border-primary/60 bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                      : "border-glass-border bg-secondary/30 hover:bg-secondary/60 opacity-80 hover:opacity-100",
                  )}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span>{f.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {f.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing Metadata: Type, Priority, Linked Project */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Knowledge Type</Label>
            <Select
              value={type}
              onChange={(v) => setType(v as KnowledgeType)}
              options={TYPES.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select
              value={String(priorityId ?? "")}
              onChange={(v) =>
                setPriorityId(v ? (+v as PriorityId) : undefined)
              }
              options={[
                { value: "", label: "None" },
                ...state.priorities.map((p) => ({
                  value: String(p.id),
                  label: `#${p.id} ${p.name}`,
                })),
              ]}
            />
          </div>
          <div>
            <Label>Linked Project</Label>
            <Select
              value={projectId ?? ""}
              onChange={(v) => setProjectId(v || undefined)}
              options={[
                { value: "", label: "None" },
                ...state.projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        {/* Conditional Structure Fields */}
        <div className="rounded-2xl border border-glass-border bg-secondary/20 p-4 space-y-4">
          {/* FORMAT A: PRINCIPLE */}
          {format === "principle" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="mb-0">
                    Core Principle <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    The fundamental rule or belief
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={corePrinciple}
                  placeholder="e.g. Always validate willingness to pay before writing production code."
                  onChange={(e) => setCorePrinciple(e.target.value)}
                />
              </div>

              {/* Collapsible Additional Details for Principle */}
              <div className="border-t border-glass-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdditional(!showAdditional)}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  <span>Additional Details (Why, When, Limitations)</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showAdditional && "rotate-180",
                    )}
                  />
                </button>

                {showAdditional && (
                  <div className="mt-3 space-y-3 animate-in fade-in">
                    <div>
                      <Label>Why It Matters</Label>
                      <Textarea
                        rows={2}
                        value={whyItMatters}
                        placeholder="Why is this principle essential for Yash OS execution?"
                        onChange={(e) => setWhyItMatters(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>When to Apply</Label>
                      <Input
                        value={whenToApply}
                        placeholder="e.g. During product planning, feature evaluation"
                        onChange={(e) => setWhenToApply(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Exceptions or Limitations</Label>
                      <Input
                        value={exceptions}
                        placeholder="e.g. Exploratory spikes, critical hotfixes"
                        onChange={(e) => setExceptions(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMAT B: METHOD */}
          {format === "method" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">
                    Repeatable Steps <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Add, edit, and reorder steps
                  </span>
                </div>

                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary/80 text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <Input
                        value={step}
                        placeholder={`Step ${idx + 1}...`}
                        onChange={(e) => updateStep(idx, e.target.value)}
                        className="h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, -1)}
                        title="Move step up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={idx === steps.length - 1}
                        onClick={() => moveStep(idx, 1)}
                        title="Move step down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        disabled={steps.length <= 1 && !step}
                        onClick={() => removeStep(idx)}
                        title="Delete step"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <Input
                    value={newStepInput}
                    placeholder="Type next step and click Add or press Enter..."
                    onChange={(e) => setNewStepInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addStep();
                      }
                    }}
                    className="h-9"
                  />
                  <Button type="button" size="sm" onClick={() => addStep()}>
                    <Plus className="h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>
              </div>

              {/* Collapsible Additional Details for Method */}
              <div className="border-t border-glass-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdditional(!showAdditional)}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  <span>
                    Additional Details (Purpose, Context, Expected Result)
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showAdditional && "rotate-180",
                    )}
                  />
                </button>

                {showAdditional && (
                  <div className="mt-3 space-y-3 animate-in fade-in">
                    <div>
                      <Label>Purpose / Problem</Label>
                      <Input
                        value={methodPurpose}
                        placeholder="What specific problem does this method solve?"
                        onChange={(e) => setMethodPurpose(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>When to Use</Label>
                      <Input
                        value={methodWhenToUse}
                        placeholder="e.g. When kickstarting user discovery outreach"
                        onChange={(e) => setMethodWhenToUse(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Expected Result</Label>
                      <Input
                        value={expectedResult}
                        placeholder="e.g. Standardized qualified output with actionable insight"
                        onChange={(e) => setExpectedResult(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMAT C: FRAMEWORK */}
          {format === "framework" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">
                    Components / Stages{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Add, edit, and reorder stages
                  </span>
                </div>

                <div className="space-y-2">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary/80 text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <Input
                        value={comp}
                        placeholder={`Stage/Component ${idx + 1}...`}
                        onChange={(e) => updateComponent(idx, e.target.value)}
                        className="h-9 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={idx === 0}
                        onClick={() => moveComponent(idx, -1)}
                        title="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        disabled={idx === components.length - 1}
                        onClick={() => moveComponent(idx, 1)}
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        disabled={components.length <= 1 && !comp}
                        onClick={() => removeComponent(idx)}
                        title="Delete component"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <Input
                    value={newCompInput}
                    placeholder="Type next stage/component and click Add or press Enter..."
                    onChange={(e) => setNewCompInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addComponent();
                      }
                    }}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addComponent()}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Stage
                  </Button>
                </div>
              </div>

              {/* Collapsible Additional Details for Framework */}
              <div className="border-t border-glass-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdditional(!showAdditional)}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  <span>Additional Details (Purpose, Mechanism, Example)</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showAdditional && "rotate-180",
                    )}
                  />
                </button>

                {showAdditional && (
                  <div className="mt-3 space-y-3 animate-in fade-in">
                    <div>
                      <Label>Purpose / Problem It Solves</Label>
                      <Input
                        value={frameworkPurpose}
                        placeholder="What complex decision or thinking model does this organize?"
                        onChange={(e) => setFrameworkPurpose(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>When to Use</Label>
                      <Input
                        value={frameworkWhenToUse}
                        placeholder="e.g. When structuring high-uncertainty architectural trade-offs"
                        onChange={(e) => setFrameworkWhenToUse(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>How It Works</Label>
                      <Textarea
                        rows={2}
                        value={howItWorks}
                        placeholder="Walk through the thinking model and how stages interact..."
                        onChange={(e) => setHowItWorks(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Expected Output</Label>
                      <Input
                        value={expectedOutput}
                        placeholder="e.g. Prioritized matrix with risk assessment"
                        onChange={(e) => setExpectedOutput(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Example</Label>
                      <Textarea
                        rows={2}
                        value={example}
                        placeholder="Concrete walkthrough or reference example..."
                        onChange={(e) => setExample(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMAT D: CUSTOM */}
          {format === "custom" && (
            <div className="space-y-4">
              <div>
                <Label>
                  Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  rows={6}
                  value={customContent}
                  placeholder="Notes, insights, documentation, or freeform model..."
                  onChange={(e) => setCustomContent(e.target.value)}
                />
              </div>

              {/* Collapsible Additional Details for Custom */}
              <div className="border-t border-glass-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdditional(!showAdditional)}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1"
                >
                  <span>Additional Details (Custom Format Name)</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showAdditional && "rotate-180",
                    )}
                  />
                </button>

                {showAdditional && (
                  <div className="mt-3 space-y-3 animate-in fade-in">
                    <div>
                      <Label>Custom Format Name (optional)</Label>
                      <Input
                        value={customFormatName}
                        placeholder="e.g. Checklist, Architecture Decision Record, Meeting Protocol"
                        onChange={(e) => setCustomFormatName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label>Tags (task, milestone, keywords)</Label>
          <Input
            value={tags}
            placeholder="e.g. startup, validation, sales, lbes"
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      {/* Modal Actions */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-glass-border pt-4">
        {onDelete &&
        item.id &&
        state.knowledge.some((k) => k.id === item.id) ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!isValid}
            onClick={handleSave}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
