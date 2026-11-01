import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  FileText,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { uid, today } from "@/lib/os/seed";
import { saveProject, deleteProject, setActiveProject } from "@/lib/os/logic";
import type { PriorityId, Project, ProjectDoc, ProjectStatus } from "@/lib/os/types";
import {
  Badge,
  Button,
  Glass,
  Input,
  Label,
  Modal,
  PageHeader,
  PriorityIcon,
  Select,
  Textarea,
} from "@/components/os/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Yash OS" },
      { name: "description", content: "Manage projects under your three permanent priorities." },
      { property: "og:title", content: "Projects — Yash OS" },
      { property: "og:description", content: "Projects, milestones, evidence and decisions." },
    ],
  }),
  component: ProjectsPage,
});

const STATUSES = ["active", "paused", "completed", "archived"] as const;

interface PriorityMeta {
  id: PriorityId;
  name: string;
  fullName: string;
  purpose: string;
  accentClass: string;
  badgeClass: string;
  borderClass: string;
  arrowClass: string;
}

const PRIORITIES_META: PriorityMeta[] = [
  {
    id: 1,
    name: "Founder Capability",
    fullName: "1 — Founder Capability",
    purpose:
      "Build real capability through execution: find human pain, build solutions, validate them and achieve meaningful results.",
    accentClass: "text-p1",
    badgeClass: "bg-p1/15 text-p1 border-p1/30",
    borderClass: "border-t-p1",
    arrowClass: "border-p1/30 bg-p1/10 text-p1 shadow-p1/20",
  },
  {
    id: 2,
    name: "Cashflow Infrastructure",
    fullName: "2 — Cashflow Infrastructure",
    purpose:
      "Generate cash to fund the startup while building sustainable financial and fintech capabilities.",
    accentClass: "text-cyan",
    badgeClass: "bg-cyan/15 text-cyan border-cyan/30",
    borderClass: "border-t-cyan",
    arrowClass: "border-cyan/30 bg-cyan/10 text-cyan shadow-cyan/20",
  },
  {
    id: 3,
    name: "Learning for Execution",
    fullName: "3 — Learning for Execution",
    purpose:
      "Learn through research, fundamentals and practical experience to continuously improve execution capability.",
    accentClass: "text-violet",
    badgeClass: "bg-violet/15 text-violet border-violet/30",
    borderClass: "border-t-violet",
    arrowClass: "border-violet/30 bg-violet/10 text-violet shadow-violet/20",
  },
];

const SUGGESTED_LEARNING_CATEGORIES = [
  "Research and research papers",
  "Books and podcasts",
  "Courses and documentation",
  "Practical execution and experiments",
  "Frameworks and methodologies",
  "Principles and fundamentals",
  "Skill development",
  "Learning from people and real-world experience",
];

function ProjectsPage() {
  const { state, update } = useOS();
  const [creatingPriority, setCreatingPriority] = useState<PriorityId | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Exactly one project's details open at a time in the wide centered layout
  const [activeDetailsProjectId, setActiveDetailsProjectId] = useState<string | null>(null);

  // Active document editor modal state
  const [docModal, setDocModal] = useState<{
    project: Project;
    doc: ProjectDoc | null;
  } | null>(null);

  const activeProject = activeDetailsProjectId
    ? state.projects.find((p) => p.id === activeDetailsProjectId) ?? null
    : null;

  const handleSaveProject = (p: Project) => {
    update((s) => saveProject(s, p));
    toast.success("Project saved");
  };

  const handleDeleteProject = (id: string) => {
    if (activeDetailsProjectId === id) {
      setActiveDetailsProjectId(null);
    }
    update((s) => deleteProject(s, id));
    toast.success("Project deleted");
  };

  const handleSetActive = (priorityId: PriorityId, projectId: string | null) => {
    update((s) => setActiveProject(s, priorityId, projectId));
    toast.success(
      projectId
        ? `Set as active for Priority #${priorityId}`
        : `Unset active for Priority #${priorityId}`
    );
  };

  const openCreateModal = (priorityId?: PriorityId) => {
    setCreatingPriority(priorityId ?? null);
    setIsCreating(true);
  };

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        subtitle="Every project lives under one permanent priority."
        actions={
          <Button variant="primary" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      {/* 1. MAIN LAYOUT — THREE HORIZONTAL PRIORITIES */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {PRIORITIES_META.map((meta) => {
          const priorityProjects = state.projects.filter((p) => p.priorityId === meta.id);

          return (
            <div key={meta.id} className="flex min-w-0 flex-col gap-3">
              {/* Priority Header Card */}
              <Glass
                className={cn(
                  "relative border-t-2 p-5 transition-colors",
                  meta.borderClass
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PriorityIcon id={meta.id} />
                    <div>
                      <h2 className="font-display text-base font-semibold text-foreground tracking-tight">
                        {meta.fullName}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {priorityProjects.length}{" "}
                        {priorityProjects.length === 1 ? "project" : "projects"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => openCreateModal(meta.id)}
                    aria-label={`Add project to ${meta.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                {/* Permanent Core Purpose */}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground/90">
                  {meta.purpose}
                </p>
              </Glass>

              {/* 1. PRIORITY → PROJECT VISUAL CONNECTION */}
              {/* Subtle, premium directional arrow communicating the project belongs to this priority */}
              <div className="flex items-center justify-center py-0.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-all hover:scale-105",
                    meta.arrowClass
                  )}
                  title={`Projects belonging to Priority #${meta.id}`}
                  aria-hidden="true"
                >
                  <ArrowDown className="h-3.5 w-3.5 stroke-[2.2]" />
                </div>
              </div>

              {/* 2. COLLAPSED PROJECTS LIST UNDER THIS PRIORITY */}
              <div className="flex flex-col gap-3">
                {priorityProjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-glass-border/70 p-6 text-center text-xs text-muted-foreground">
                    No projects under {meta.name} yet.
                    <div className="mt-2">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => openCreateModal(meta.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create first project
                      </Button>
                    </div>
                  </div>
                ) : (
                  priorityProjects.map((project) => (
                    <CollapsedProjectCard
                      key={project.id}
                      project={project}
                      onOpenDetails={() => setActiveDetailsProjectId(project.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. PROJECT DETAILS — WIDE CENTERED LAYOUT (Only 1 project open at a time) */}
      {activeProject && (
        <ProjectDetailsModal
          project={activeProject}
          isActive={state.priorities.some(
            (pr) => pr.id === activeProject.priorityId && pr.activeProjectId === activeProject.id
          )}
          onClose={() => setActiveDetailsProjectId(null)}
          onSave={(updated) => {
            handleSaveProject(updated);
            setActiveDetailsProjectId(null);
          }}
          onDelete={() => handleDeleteProject(activeProject.id)}
          onSetActive={(active) =>
            handleSetActive(activeProject.priorityId, active ? activeProject.id : null)
          }
          onOpenDocEditor={(doc) => setDocModal({ project: activeProject, doc })}
        />
      )}

      {/* 7. New Project Modal */}
      {isCreating && (
        <CreateProjectModal
          defaultPriority={creatingPriority}
          onClose={() => setIsCreating(false)}
          onCreate={(newProj) => {
            handleSaveProject(newProj);
            setIsCreating(false);
          }}
        />
      )}

      {/* 6. Document Viewer / Editor Modal */}
      {docModal && (
        <DocumentEditorModal
          project={docModal.project}
          doc={docModal.doc}
          onClose={() => setDocModal(null)}
          onSave={(savedDoc) => {
            const currentDocs = docModal.project.docs ?? [];
            const exists = currentDocs.some((d) => d.id === savedDoc.id);
            const updatedDocs = exists
              ? currentDocs.map((d) => (d.id === savedDoc.id ? savedDoc : d))
              : [...currentDocs, savedDoc];
            handleSaveProject({ ...docModal.project, docs: updatedDocs });
            setDocModal(null);
          }}
          onDelete={(docId) => {
            const currentDocs = docModal.project.docs ?? [];
            const updatedDocs = currentDocs.filter((d) => d.id !== docId);
            handleSaveProject({ ...docModal.project, docs: updatedDocs });
            setDocModal(null);
            toast.success("Document deleted");
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// 2. COLLAPSED PROJECT CARD
// Displays ONLY:
// 1. Project name (+ small A or B identifier for Priority 2)
// 2. Current milestone
// 3. Nearest deadline
// 4. Document count ("Docs 0/5")
// 5. One clear expand arrow that opens the wide centered details panel
// ============================================================================

interface CollapsedProjectCardProps {
  project: Project;
  onOpenDetails: () => void;
}

function CollapsedProjectCard({ project, onOpenDetails }: CollapsedProjectCardProps) {
  const docCount = project.docs?.length ?? 0;

  return (
    <Glass
      className="group cursor-pointer p-4 transition-all duration-200 hover:border-glass-border/90 hover:bg-card/50 hover:shadow-md"
      onClick={onOpenDetails}
    >
      <div className="flex items-center justify-between gap-3 select-none">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* 1. Project Name + Small A/B Identifier for Priority 2 */}
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-sm text-foreground group-hover:text-cyan transition-colors">
              {project.name}
            </h3>
            {project.priorityId === 2 && project.workstream && (
              <span
                className="inline-flex shrink-0 items-center rounded border border-cyan/40 bg-cyan/15 px-1.5 py-0.2 text-[10px] font-bold tracking-wider text-cyan"
                title={
                  project.workstream === "A"
                    ? "Workstream A: Cashflow Generation"
                    : "Workstream B: Fintech Product Capability"
                }
              >
                {project.workstream}
              </span>
            )}
          </div>

          {/* 2. Current Milestone */}
          <div className="truncate text-xs text-muted-foreground">
            {project.milestone ? (
              <span>
                <span className="text-muted-foreground/70">Milestone: </span>
                <span className="font-medium text-foreground/90">{project.milestone}</span>
              </span>
            ) : (
              <span className="text-muted-foreground/50">No milestone set</span>
            )}
          </div>

          {/* 3. Nearest Deadline & 4. Document Count */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="truncate">
              {project.deadline ? (
                <span>
                  <span className="text-muted-foreground/70">Deadline: </span>
                  <span className="font-medium text-foreground/90">{project.deadline}</span>
                </span>
              ) : (
                <span className="text-muted-foreground/50">No deadline set</span>
              )}
            </div>
            <span className="shrink-0 font-medium text-muted-foreground/80">
              Docs {docCount}/5
            </span>
          </div>
        </div>

        {/* 5. One Clear Disclosure Arrow */}
        <button
          type="button"
          aria-label="Open project details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground group-hover:text-foreground group-hover:translate-x-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Glass>
  );
}

// ============================================================================
// 2. PROJECT DETAILS — WIDE CENTERED LAYOUT
// Desktop: Wide centered panel (max-w-5xl), 2-column field layout (~5 horizontal rows)
// Tablet: Adaptive layout
// Mobile: Single-column responsive layout
// ============================================================================

interface ProjectDetailsModalProps {
  project: Project;
  isActive: boolean;
  onClose: () => void;
  onSave: (p: Project) => void;
  onDelete: () => void;
  onSetActive: (active: boolean) => void;
  onOpenDocEditor: (doc: ProjectDoc | null) => void;
}

function ProjectDetailsModal({
  project,
  isActive,
  onClose,
  onSave,
  onDelete,
  onSetActive,
  onOpenDocEditor,
}: ProjectDetailsModalProps) {
  const { state } = useOS();
  const [draft, setDraft] = useState<Project>(project);

  const docCount = draft.docs?.length ?? 0;

  // Task output history from closed days for this priority
  const taskHistory = state.history.flatMap((h) =>
    h.outputs
      .filter((o) => o.priorityId === draft.priorityId)
      .map((o) => ({ ...o, date: h.date }))
  );

  const handleSaveDraft = () => {
    // Validate Priority 2 required workstream
    if (draft.priorityId === 2 && !draft.workstream) {
      toast.error("Please select a required workstream (A or B) for Priority 2");
      return;
    }
    onSave(draft);
  };

  const handleToggleCategory = (cat: string) => {
    const cats = draft.learningCategories ?? [];
    if (cats.includes(cat)) {
      setDraft({ ...draft, learningCategories: cats.filter((c) => c !== cat) });
    } else {
      setDraft({ ...draft, learningCategories: [...cats, cat] });
    }
  };

  const [customCatInput, setCustomCatInput] = useState("");
  const handleAddCustomCategory = () => {
    const trimmed = customCatInput.trim();
    if (!trimmed) return;
    const cats = draft.learningCategories ?? [];
    if (!cats.includes(trimmed)) {
      setDraft({ ...draft, learningCategories: [...cats, trimmed] });
    }
    setCustomCatInput("");
  };

  const priorityMeta = PRIORITIES_META.find((m) => m.id === draft.priorityId) ?? PRIORITIES_META[0];

  return (
    <Modal open onClose={onClose} title={draft.name || "Project Details"} wide>
      <div className="space-y-6">
        {/* Active Project Status Banner & Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-md border px-2 py-0.5 font-semibold text-[11px]", priorityMeta.badgeClass)}>
              #{draft.priorityId} {priorityMeta.name}
            </span>

            {draft.priorityId === 2 && draft.workstream && (
              <span className="rounded-md border border-cyan/40 bg-cyan/15 px-2 py-0.5 text-[11px] font-semibold text-cyan">
                Workstream {draft.workstream}
              </span>
            )}

            {isActive ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-cyan ml-1">
                <Star className="h-3.5 w-3.5 fill-cyan text-cyan" />
                Active project for #{draft.priorityId}
              </span>
            ) : (
              <span className="text-muted-foreground ml-1">
                Not active for #{draft.priorityId}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant={isActive ? "ghost" : "primary"}
            className="h-8 text-xs"
            onClick={() => onSetActive(!isActive)}
          >
            {isActive ? (
              "Unset as active"
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Set as active
              </>
            )}
          </Button>
        </div>

        {/* Primary Row: Name, Priority, Status, Deadline */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Project Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Project Name"
            />
          </div>

          <div>
            <Label>Assigned Priority</Label>
            <Select
              value={String(draft.priorityId)}
              onChange={(v) =>
                setDraft({ ...draft, priorityId: +v as PriorityId })
              }
              options={PRIORITIES_META.map((pr) => ({
                value: String(pr.id),
                label: pr.fullName,
              }))}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={draft.status}
              onChange={(v) => setDraft({ ...draft, status: v as ProjectStatus })}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>

          <div>
            <Label>Nearest Deadline</Label>
            <Input
              placeholder="e.g. 2026-11-15 or Next Monday"
              value={draft.deadline ?? ""}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
          </div>
        </div>

        {/* 4. PRIORITY 2: REQUIRED WORKSTREAM SELECTION */}
        {draft.priorityId === 2 && (
          <div className="rounded-2xl border border-cyan/30 bg-cyan/5 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-cyan font-semibold mb-0">
                Required Workstream Classification
              </Label>
              {!draft.workstream && (
                <span className="text-xs text-destructive font-medium">Selection required</span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "flex flex-col text-left p-3 rounded-xl border text-xs transition-all",
                  draft.workstream === "A"
                    ? "border-cyan bg-cyan/15 text-foreground ring-1 ring-cyan"
                    : "border-glass-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                )}
                onClick={() => setDraft({ ...draft, workstream: "A" })}
              >
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                  <span className="rounded bg-cyan/20 px-1.5 py-0.2 text-[10px] text-cyan">A</span>
                  Cashflow Generation
                </div>
                <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Generate short-term cash through trading systems (LBES) or service work.
                </span>
              </button>

              <button
                type="button"
                className={cn(
                  "flex flex-col text-left p-3 rounded-xl border text-xs transition-all",
                  draft.workstream === "B"
                    ? "border-cyan bg-cyan/15 text-foreground ring-1 ring-cyan"
                    : "border-glass-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                )}
                onClick={() => setDraft({ ...draft, workstream: "B" })}
              >
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                  <span className="rounded bg-cyan/20 px-1.5 py-0.2 text-[10px] text-cyan">B</span>
                  Fintech Product Capability
                </div>
                <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Build LBES into a useful fintech product solving real user problems.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 5. PRIORITY 3: FLEXIBLE LEARNING CATEGORIES */}
        {draft.priorityId === 3 && (
          <div className="rounded-2xl border border-violet/30 bg-violet/5 p-4 space-y-3">
            <Label className="text-violet font-semibold mb-0">
              Learning Categories (Multi-select)
            </Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_LEARNING_CATEGORIES.map((cat) => {
                const selected = (draft.learningCategories ?? []).includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                      selected
                        ? "border-violet bg-violet/20 text-foreground ring-1 ring-violet/50"
                        : "border-glass-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                    )}
                  >
                    {selected && <Check className="mr-1.5 inline h-3.5 w-3.5 text-violet" />}
                    {cat}
                  </button>
                );
              })}
              {(draft.learningCategories ?? [])
                .filter((cat) => !SUGGESTED_LEARNING_CATEGORIES.includes(cat))
                .map((customCat) => (
                  <span
                    key={customCat}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet/50 bg-violet/20 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {customCat}
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(customCat)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>

            <div className="flex items-center gap-2 max-w-md pt-1">
              <Input
                className="h-9 text-xs"
                placeholder="Add custom learning category..."
                value={customCatInput}
                onChange={(e) => setCustomCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
              />
              <Button
                size="sm"
                variant="glass"
                className="h-9 shrink-0 text-xs"
                onClick={handleAddCustomCategory}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* 2. FIVE HORIZONTAL ROWS (TWO COLUMNS PER ROW ON DESKTOP) */}
        {/* Row 1: Objective | Current Milestone */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Objective</Label>
            <Textarea
              rows={3}
              value={draft.objective}
              onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
              placeholder="What is this project aiming to achieve?"
            />
          </div>
          <div>
            <Label>Current Milestone</Label>
            <Textarea
              rows={3}
              value={draft.milestone}
              onChange={(e) => setDraft({ ...draft, milestone: e.target.value })}
              placeholder="Next immediate milestone to achieve..."
            />
          </div>
        </div>

        {/* Row 2: Hypothesis | Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Hypothesis</Label>
            <Textarea
              rows={3}
              value={draft.hypothesis}
              onChange={(e) => setDraft({ ...draft, hypothesis: e.target.value })}
              placeholder="Core assumption being validated through execution..."
            />
          </div>
          <div>
            <Label>Metrics</Label>
            <Textarea
              rows={3}
              value={draft.metrics}
              onChange={(e) => setDraft({ ...draft, metrics: e.target.value })}
              placeholder="Key metrics, targets, and quantifiable signals..."
            />
          </div>
        </div>

        {/* Row 3: Bottlenecks | Market Evidence / Actual Outputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Bottlenecks</Label>
            <Textarea
              rows={3}
              value={draft.bottlenecks}
              onChange={(e) => setDraft({ ...draft, bottlenecks: e.target.value })}
              placeholder="Current blockers, friction, or constraints..."
            />
          </div>
          <div>
            <Label>Market Evidence / Actual Outputs</Label>
            <Textarea
              rows={3}
              value={draft.evidence}
              onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
              placeholder="Real user quotes, signups, transactions, validation data..."
            />
          </div>
        </div>

        {/* Row 4: Decisions | Learning */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Decisions</Label>
            <Textarea
              rows={3}
              value={draft.decisions}
              onChange={(e) => setDraft({ ...draft, decisions: e.target.value })}
              placeholder="Key architectural, business, and strategic decisions made..."
            />
          </div>
          <div>
            <Label>Learning</Label>
            <Textarea
              rows={3}
              value={draft.learning}
              onChange={(e) => setDraft({ ...draft, learning: e.target.value })}
              placeholder="Key lessons and principles distilled from execution..."
            />
          </div>
        </div>

        {/* Row 5: Supporting Documents | Task Output History */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Supporting Documents (Text / Links)</Label>
            <Textarea
              rows={3}
              value={draft.documents}
              onChange={(e) => setDraft({ ...draft, documents: e.target.value })}
              placeholder="Reference URLs, specs, design assets, and external files..."
            />
          </div>

          <div>
            <Label>Task Output History (Priority #{draft.priorityId})</Label>
            {taskHistory.length > 0 ? (
              <div className="h-[76px] overflow-y-auto space-y-1 rounded-xl border border-glass-border/60 bg-secondary/30 p-2.5 text-xs">
                {taskHistory.map((item, idx) => (
                  <div key={idx} className="leading-snug">
                    <span className="font-mono text-[10px] text-muted-foreground">{item.date}</span> —{" "}
                    <span className="font-medium text-foreground">{item.title}</span>:{" "}
                    <span className="text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[76px] items-center justify-center rounded-xl border border-glass-border/60 bg-secondary/20 p-2.5 text-xs text-muted-foreground">
                No recorded task outputs for this priority yet.
              </div>
            )}
          </div>
        </div>

        {/* 6. DEDICATED PROJECT DOCUMENTS SECTION (Max 5) */}
        <div className="rounded-2xl border border-glass-border/70 bg-secondary/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan" />
                <span className="font-semibold text-sm text-foreground">
                  Project Documents
                </span>
                <Badge className="text-xs px-2 py-0.5">
                  Docs {docCount}/5
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Up to 5 editable documents associated with this project.
              </p>
            </div>

            {docCount < 5 && (
              <Button
                size="sm"
                variant="glass"
                className="h-8 text-xs"
                onClick={() => onOpenDocEditor(null)}
              >
                <Plus className="h-3.5 w-3.5" /> Add document
              </Button>
            )}
          </div>

          {/* Document Cards List */}
          {docCount > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(draft.docs ?? []).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocEditor(doc)}
                  className="flex cursor-pointer flex-col justify-between rounded-xl border border-glass-border/60 bg-secondary/40 p-3 transition-all hover:border-cyan/40 hover:bg-secondary/70 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold text-xs text-foreground">
                      {doc.title || "Untitled Document"}
                    </span>
                    <span className="text-[10px] text-cyan shrink-0 font-medium">
                      Edit
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {doc.content || "Empty document"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-glass-border/50 p-4 text-center text-xs text-muted-foreground">
              No documents created yet. Click "+ Add document" to attach up to 5 documents.
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-border/60 pt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  `Delete project "${draft.name}"? This will remove its active assignment if active.`
                )
              ) {
                onDelete();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete project
          </Button>

          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveDraft}>
              Save Project
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// 7. NEW PROJECT — SIMPLE CREATION MODAL
// ============================================================================

interface CreateProjectModalProps {
  defaultPriority: PriorityId | null;
  onClose: () => void;
  onCreate: (p: Project) => void;
}

function CreateProjectModal({
  defaultPriority,
  onClose,
  onCreate,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [priorityId, setPriorityId] = useState<PriorityId>(defaultPriority ?? 1);

  // Priority 2 required workstream
  const [workstream, setWorkstream] = useState<"A" | "B" | null>(null);

  // Priority 3 optional learning categories
  const [learningCategories, setLearningCategories] = useState<string[]>([]);
  const [customCatInput, setCustomCatInput] = useState("");

  const handleToggleCategory = (cat: string) => {
    if (learningCategories.includes(cat)) {
      setLearningCategories(learningCategories.filter((c) => c !== cat));
    } else {
      setLearningCategories([...learningCategories, cat]);
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCatInput.trim();
    if (!trimmed) return;
    if (!learningCategories.includes(trimmed)) {
      setLearningCategories([...learningCategories, trimmed]);
    }
    setCustomCatInput("");
  };

  const canSubmit =
    Boolean(name.trim()) && (priorityId !== 2 || Boolean(workstream));

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    if (priorityId === 2 && !workstream) {
      toast.error("Please select required Workstream A or B for Priority 2");
      return;
    }

    const newProject: Project = {
      id: uid(),
      name: name.trim(),
      objective: objective.trim(),
      priorityId,
      status: "active",
      hypothesis: "",
      milestone: "",
      metrics: "",
      bottlenecks: "",
      evidence: "",
      decisions: "",
      learning: "",
      documents: "",
      createdAt: today(),
      deadline: "",
      workstream: priorityId === 2 ? workstream! : undefined,
      learningCategories: priorityId === 3 ? learningCategories : undefined,
      docs: [],
    };

    onCreate(newProject);
    toast.success("Project created");
  };

  return (
    <Modal open onClose={onClose} title="New Project">
      <div className="space-y-4">
        {/* Input 1: Project Name */}
        <div>
          <Label>Project Name *</Label>
          <Input
            autoFocus
            placeholder="e.g. Next-Gen Capability Engine"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Input 2: Objective */}
        <div>
          <Label>Objective</Label>
          <Textarea
            rows={2}
            placeholder="Short description of what the project aims to achieve..."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>

        {/* Input 3: Assigned Priority */}
        <div>
          <Label>Assigned Priority *</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES_META.map((meta) => {
              const selected = priorityId === meta.id;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => setPriorityId(meta.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                    selected
                      ? cn("bg-secondary/70 ring-1", meta.borderClass.replace("border-t-", "border-").replace("border-", "ring-"))
                      : "border-glass-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <span className={cn("text-xs font-semibold", selected ? meta.accentClass : "")}>
                    #{meta.id}
                  </span>
                  <span className="text-[11px] font-medium leading-tight mt-0.5">
                    {meta.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional Priority 2: Required A/B Workstream */}
        {priorityId === 2 && (
          <div className="rounded-xl border border-cyan/40 bg-cyan/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-cyan font-semibold mb-0">
                Required Workstream Classification *
              </Label>
              {!workstream && (
                <span className="text-[11px] text-destructive font-medium">Required</span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all",
                  workstream === "A"
                    ? "border-cyan bg-cyan/15 text-foreground ring-1 ring-cyan"
                    : "border-glass-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                )}
                onClick={() => setWorkstream("A")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="rounded bg-cyan/20 px-1 py-0.2 text-[10px] text-cyan">A</span>
                  Cashflow Generation
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  Generate short-term cash through trading systems (LBES) or service work.
                </span>
              </button>

              <button
                type="button"
                className={cn(
                  "flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all",
                  workstream === "B"
                    ? "border-cyan bg-cyan/15 text-foreground ring-1 ring-cyan"
                    : "border-glass-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                )}
                onClick={() => setWorkstream("B")}
              >
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="rounded bg-cyan/20 px-1 py-0.2 text-[10px] text-cyan">B</span>
                  Fintech Product Capability
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  Build LBES into a useful fintech product solving real user problems.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Conditional Priority 3: Optional Learning Categories */}
        {priorityId === 3 && (
          <div className="rounded-xl border border-violet/40 bg-violet/5 p-3.5 space-y-2.5">
            <Label className="text-violet font-semibold mb-0">
              Learning Categories (Optional Multi-Select)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_LEARNING_CATEGORIES.map((cat) => {
                const selected = learningCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
                      selected
                        ? "border-violet bg-violet/20 text-foreground ring-1 ring-violet/50"
                        : "border-glass-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {selected && <Check className="mr-1 inline h-3 w-3 text-violet" />}
                    {cat}
                  </button>
                );
              })}
              {learningCategories
                .filter((cat) => !SUGGESTED_LEARNING_CATEGORIES.includes(cat))
                .map((customCat) => (
                  <span
                    key={customCat}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet/50 bg-violet/20 px-2 py-1 text-[11px] font-medium text-foreground"
                  >
                    {customCat}
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(customCat)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Input
                className="h-8 text-xs"
                placeholder="Add custom learning category..."
                value={customCatInput}
                onChange={(e) => setCustomCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
              />
              <Button
                size="sm"
                variant="glass"
                className="h-8 shrink-0 text-xs"
                onClick={handleAddCustomCategory}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-glass-border/60 pt-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Create Project
        </Button>
      </div>
    </Modal>
  );
}

// ============================================================================
// 6. DEDICATED DOCUMENT VIEWER / EDITOR MODAL
// ============================================================================

interface DocumentEditorModalProps {
  project: Project;
  doc: ProjectDoc | null;
  onClose: () => void;
  onSave: (doc: ProjectDoc) => void;
  onDelete: (id: string) => void;
}

function DocumentEditorModal({
  project,
  doc,
  onClose,
  onSave,
  onDelete,
}: DocumentEditorModalProps) {
  const [title, setTitle] = useState(doc?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? "");

  const handleSave = () => {
    const trimmedTitle = title.trim() || "Untitled Document";
    const now = today();
    const updated: ProjectDoc = {
      id: doc ? doc.id : uid(),
      title: trimmedTitle,
      content,
      createdAt: doc ? doc.createdAt : now,
      updatedAt: now,
    };
    onSave(updated);
    toast.success(doc ? "Document saved" : "Document created");
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={doc ? `Edit Document: ${doc.title || "Untitled"}` : "New Project Document"}
      wide
    >
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Project: <span className="font-semibold text-foreground">{project.name}</span>{" "}
          (Priority #{project.priorityId})
        </div>

        <div>
          <Label>Document Title</Label>
          <Input
            autoFocus
            placeholder="e.g. Architecture Overview, Trading Log, Research Brief"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label>Document Content</Label>
          <Textarea
            rows={12}
            className="font-mono text-xs leading-relaxed"
            placeholder="Write markdown, notes, research summaries, hypotheses, or execution plans..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-glass-border/60 pt-4">
        {doc ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Delete document "${doc.title}"?`)) {
                onDelete(doc.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete document
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            Save Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}
