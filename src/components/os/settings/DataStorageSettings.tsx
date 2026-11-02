import { useState } from "react";
import { Download, HardDrive, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { initialState } from "@/lib/os/seed";
import { migrateOSState } from "@/lib/os/reviews/migrations";
import { Button, Modal } from "@/components/os/ui";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function DataStorageSettings() {
  const { state, update } = useOS();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yash-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Backup downloaded successfully");
  };

  const importData = (file: File) => {
    file
      .text()
      .then((t) => {
        const parsed = JSON.parse(t);
        update(() => migrateOSState(parsed));
        toast.success("Backup restored successfully");
      })
      .catch(() => toast.error("Invalid backup file format"));
  };

  const handleResetData = () => {
    update(() => initialState);
    setIsResetConfirmOpen(false);
    toast.success("All Yash OS data reset to defaults");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Data & Storage"
        description="Manage application persistence, backup archives, state restoration, and reset."
        icon={HardDrive}
      />

      <div className="rounded-2xl border border-glass-border/40 bg-secondary/20 p-5 space-y-2">
        <div className="text-sm font-semibold text-foreground">
          Local Browser Persistence
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          All Yash OS operational data—including foundation plans, active task
          records, custom projects, knowledge entries, and review history—is
          persisted directly in your browser's LocalStorage.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          To protect your state against browser cache wipes or when switching
          devices, download a JSON backup regularly.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Backup & Restoration Controls
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={exportData} variant="primary">
            <Download className="h-4 w-4" />
            Export Backup (JSON)
          </Button>

          <label className="inline-flex">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && importData(e.target.files[0])
              }
            />
            <span className="glass inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium transition hover:bg-accent">
              <Upload className="h-4 w-4" />
              Import Backup
            </span>
          </label>

          <Button variant="danger" onClick={() => setIsResetConfirmOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset Data
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Data */}
      {isResetConfirmOpen && (
        <Modal
          open={isResetConfirmOpen}
          title="Reset All Yash OS Data?"
          onClose={() => setIsResetConfirmOpen(false)}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This action will reset all active plans, tasks, custom projects,
              knowledge entries, and review history back to factory seed
              defaults.
            </p>
            <p className="text-xs text-destructive font-medium">
              We strongly recommend exporting a JSON backup before proceeding.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="glass"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleResetData}>
                Yes, Reset Everything
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
