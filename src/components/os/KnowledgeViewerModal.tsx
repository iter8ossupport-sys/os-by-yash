import {
  Compass,
  Workflow,
  Layers,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { KnowledgeFormat, KnowledgeItem } from "@/lib/os/types";
import { formatBadgeClass, getKnowledgeFormat } from "@/lib/os/knowledge";
import { Badge, Button, Modal } from "@/components/os/ui";

const FORMAT_ICONS: Record<
  KnowledgeFormat,
  React.ComponentType<{ className?: string }>
> = {
  principle: Compass,
  method: Workflow,
  framework: Layers,
  custom: FileText,
};

interface KnowledgeViewerModalProps {
  open: boolean;
  onClose: () => void;
  items: KnowledgeItem[];
  title?: string;
}

export function KnowledgeViewerModal({
  open,
  onClose,
  items,
  title = "Linked Knowledge",
}: KnowledgeViewerModalProps) {
  if (!items || items.length === 0) return null;

  return (
    <Modal open={open} onClose={onClose} wide title={title}>
      <div className="space-y-6">
        {items.map((item) => {
          const fmt = getKnowledgeFormat(item);
          const Icon = FORMAT_ICONS[fmt];
          const fd = item.formatData;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-glass-border bg-secondary/30 p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border/40 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${formatBadgeClass(
                      fmt,
                    )}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {fmt}
                  </span>
                  <Badge>{item.type}</Badge>
                  {item.priorityId && <Badge>#{item.priorityId}</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.createdAt}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
              </div>

              {/* Structured View: Principle */}
              {fmt === "principle" && fd?.principle && (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Core Principle
                    </span>
                    <p className="text-foreground text-sm font-medium leading-relaxed">
                      {fd.principle.corePrinciple}
                    </p>
                  </div>

                  {fd.principle.whyItMatters && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Why It Matters:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.principle.whyItMatters}
                      </p>
                    </div>
                  )}

                  {fd.principle.whenToApply && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        When to Apply:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.principle.whenToApply}
                      </p>
                    </div>
                  )}

                  {fd.principle.exceptions && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Exceptions or Limitations:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.principle.exceptions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Structured View: Method */}
              {fmt === "method" && fd?.method && (
                <div className="space-y-3 text-sm">
                  {fd.method.purpose && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Purpose / Problem:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.method.purpose}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan block">
                      Repeatable Steps
                    </span>
                    {fd.method.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-xl border border-glass-border bg-background/50 p-2.5 text-xs text-foreground"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan/15 text-cyan font-bold text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed mt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>

                  {fd.method.whenToUse && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        When to Use:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.method.whenToUse}
                      </p>
                    </div>
                  )}

                  {fd.method.expectedResult && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Expected Result:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.method.expectedResult}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Structured View: Framework */}
              {fmt === "framework" && fd?.framework && (
                <div className="space-y-3 text-sm">
                  {fd.framework.purpose && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Purpose / Problem Solved:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.framework.purpose}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet block">
                      Components / Stages
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {fd.framework.components.map((comp, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-xl border border-glass-border bg-background/50 p-2.5 text-xs text-foreground"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet/15 text-violet font-bold text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed mt-0.5">{comp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {fd.framework.howItWorks && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        How It Works:
                      </span>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {fd.framework.howItWorks}
                      </p>
                    </div>
                  )}

                  {fd.framework.expectedOutput && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Expected Output:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {fd.framework.expectedOutput}
                      </p>
                    </div>
                  )}

                  {fd.framework.example && (
                    <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                      <span className="font-semibold text-foreground block mb-0.5">
                        Example:
                      </span>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                        {fd.framework.example}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom / Fallback View */}
              {(fmt === "custom" ||
                (!fd?.principle && !fd?.method && !fd?.framework)) && (
                <div className="space-y-2 text-xs">
                  {fd?.custom?.formatName && (
                    <Badge className="mb-1 text-slate-300 border-slate-400/30">
                      Format: {fd.custom.formatName}
                    </Badge>
                  )}
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                    {fd?.custom?.content || item.body}
                  </p>
                </div>
              )}

              {item.tags && (
                <div className="text-[11px] text-muted-foreground pt-1">
                  Tags: {item.tags}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-glass-border">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
