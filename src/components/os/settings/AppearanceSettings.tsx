import { Moon, Palette, Sun, Monitor } from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { Theme } from "@/lib/os/types";
import { Label, Segmented } from "@/components/os/ui";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function AppearanceSettings() {
  const { state, update } = useOS();

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Appearance"
        description="Control the visual experience and theme mode of the Yash OS operating system."
        icon={Palette}
      />

      <div className="space-y-4">
        <div>
          <Label>Interface Theme</Label>
          <Segmented
            value={state.theme}
            options={["dark", "light", "system"] as const}
            onChange={(v: Theme) => update((s) => ({ ...s, theme: v }))}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {state.theme === "dark"
              ? "Dark theme active: Signature midnight navy palette with controlled violet depth."
              : state.theme === "light"
                ? "Light theme active: Clean high-contrast surfaces for daylight reading."
                : "System theme active: Automatically matches your operating system display preference."}
          </p>
        </div>

        <div className="grid gap-3 pt-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Moon className="h-4 w-4 text-primary" />
              Midnight Navy
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deep dark canvas engineered for minimum eye strain during long
              execution blocks.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sun className="h-4 w-4 text-cyan" />
              Cyan & Blue Accents
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Crisp visual indicators highlighting focus states, active tasks,
              and completion.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Adaptive Glass
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Subtle backdrop blur and fine hairline borders maintaining
              hierarchy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
