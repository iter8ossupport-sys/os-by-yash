import { Bell, CheckCircle2, Moon, Play } from "lucide-react";
import { useOS } from "@/lib/os/store";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function NotificationSettings() {
  const { state, update } = useOS();

  const setPrefs = (patch: Partial<typeof state.prefs>) =>
    update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Notifications"
        description="Control task alerts, focused timer reminders, and daily closeout notifications."
        icon={Bell}
      />

      <div className="rounded-2xl border border-glass-border/40 bg-secondary/20 p-5">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-foreground">
              Browser Notifications
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Enable in-browser audio and visual alerts during task execution
              sessions.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={state.prefs.notifications}
            onChange={(e) => setPrefs({ notifications: e.target.checked })}
          />
        </label>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Active Alert Triggers
        </h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-glass-border/50 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Play className="h-4 w-4 text-primary" />
              Timer Completion
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Signals when a planned task timebox reaches zero to avoid
              accidental overruns.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border/50 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Task Transitions
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Prompts to record output and evaluate if priority outcome was
              achieved before moving on.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border/50 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Moon className="h-4 w-4 text-cyan" />
              Evening Closeout
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gentle reminder to finalize daily review, reflect on friction, and
              close out the day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
