import { useState } from "react";
import {
  Search,
  Compass,
  Workflow,
  Layers,
  FileText,
  Check,
  Plus,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { KnowledgeFormat, KnowledgeItem } from "@/lib/os/types";
import {
  KNOWLEDGE_FORMATS,
  formatBadgeClass,
  getKnowledgeFormat,
  getKnowledgePreview,
  matchesKnowledgeQuery,
} from "@/lib/os/knowledge";
import { Badge, Button, Empty, Input, Modal, Select } from "@/components/os/ui";
import { cn } from "@/lib/utils";

const FORMAT_ICONS: Record<
  KnowledgeFormat,
  React.ComponentType<{ className?: string }>
> = {
  principle: Compass,
  method: Workflow,
  framework: Layers,
  custom: FileText,
};

interface KnowledgeSelectModalProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  title?: string;
  subtitle?: string;
  singleSelect?: boolean;
}

export function KnowledgeSelectModal({
  open,
  onClose,
  selectedIds,
  onSelect,
  title = "Select Knowledge Reference",
  subtitle = "Associate relevant principles, methods, or frameworks.",
  singleSelect = false,
}: KnowledgeSelectModalProps) {
  const { state } = useOS();
  const [q, setQ] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [currentSelected, setCurrentSelected] = useState<string[]>(
    selectedIds || [],
  );

  const items = state.knowledge.filter((k) => {
    const fmt = getKnowledgeFormat(k);
    if (formatFilter !== "all" && fmt !== formatFilter) return false;
    return matchesKnowledgeQuery(k, q);
  });

  const toggleItem = (id: string) => {
    if (singleSelect) {
      setCurrentSelected(currentSelected.includes(id) ? [] : [id]);
    } else {
      setCurrentSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
  };

  const handleConfirm = () => {
    onSelect(currentSelected);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} wide title={title}>
      <div className="space-y-4">
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search principles, methods, frameworks…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select
            value={formatFilter}
            onChange={setFormatFilter}
            options={[
              { value: "all", label: "All Formats" },
              { value: "principle", label: "Principles" },
              { value: "method", label: "Methods" },
              { value: "framework", label: "Frameworks" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <Empty title="No matching knowledge found" />
          ) : (
            items.map((k) => {
              const fmt = getKnowledgeFormat(k);
              const Icon = FORMAT_ICONS[fmt];
              const isChecked = currentSelected.includes(k.id);
              const preview = getKnowledgePreview(k);

              return (
                <div
                  key={k.id}
                  onClick={() => toggleItem(k.id)}
                  className={cn(
                    "cursor-pointer rounded-2xl border p-3.5 transition flex items-start gap-3",
                    isChecked
                      ? "border-primary/60 bg-primary/15 shadow-sm ring-1 ring-primary/40 glow"
                      : "border-glass-border bg-secondary/30 hover:bg-secondary/60",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                      isChecked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-glass-border bg-secondary/40 text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-semibold uppercase ${formatBadgeClass(
                          fmt,
                        )}`}
                      >
                        <Icon className="h-3 w-3" />
                        {fmt}
                      </span>
                      <Badge>{k.type}</Badge>
                      {k.priorityId && <Badge>#{k.priorityId}</Badge>}
                    </div>

                    <div className="font-medium text-sm text-foreground truncate">
                      {k.title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {preview}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-glass-border pt-4">
          <span className="text-xs text-muted-foreground">
            {currentSelected.length} knowledge item
            {currentSelected.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              Attach Selected ({currentSelected.length})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
