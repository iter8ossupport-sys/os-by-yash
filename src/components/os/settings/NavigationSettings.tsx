import { Cpu } from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { DayType } from "@/lib/os/types";
import { Input, Label, Textarea } from "@/components/os/ui";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function NavigationSettings() {
  const { state, update } = useOS();

  const setPrefs = (patch: Partial<typeof state.prefs>) =>
    update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Navigation & Experience"
        description="Fine-tune execution flow, timer visibility, and personal operating constraints."
        icon={Cpu}
      />

      {/* Execution Timer Toggle */}
      <div className="rounded-2xl border border-glass-border/40 bg-secondary/20 p-5">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-foreground">
              Execution Timer
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Display the live countdown timer on the active task card during
              execution sessions.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={state.prefs.timer}
            onChange={(e) => setPrefs({ timer: e.target.checked })}
          />
        </label>
      </div>

      {/* Default Usable Hours */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold text-foreground">
            Default Usable Hours Per Day Type
          </Label>
          <p className="text-xs text-muted-foreground">
            Sets the default planning budget when initializing your day context
            in the 7-step workflow.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(state.prefs.dayTypeHours) as DayType[]).map((d) => (
            <div
              key={d}
              className="rounded-xl border border-glass-border/40 bg-secondary/30 p-3"
            >
              <Label className="capitalize text-xs font-medium text-foreground">
                {d}
              </Label>
              <Input
                type="number"
                min={0}
                max={16}
                step={0.5}
                value={state.prefs.dayTypeHours[d]}
                onChange={(e) =>
                  setPrefs({
                    dayTypeHours: {
                      ...state.prefs.dayTypeHours,
                      [d]: +e.target.value,
                    },
                  })
                }
                className="mt-1"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                hours / day
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Constraints */}
      <div className="space-y-2 pt-2">
        <Label className="text-sm font-semibold text-foreground">
          Personal Operating Constraints
        </Label>
        <p className="text-xs text-muted-foreground">
          Rule definitions and boundaries automatically loaded during the daily
          Plan Pre-Think workflow.
        </p>
        <Textarea
          rows={3}
          value={state.prefs.constraints}
          onChange={(e) => setPrefs({ constraints: e.target.value })}
          placeholder="e.g. No meetings before 14:00. High-energy deep work blocks reserved strictly for Priority 1."
        />
      </div>
    </div>
  );
}
