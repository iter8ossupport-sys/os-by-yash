import { CheckCircle2, Lock, ShieldCheck, Zap } from "lucide-react";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function PrivacySecuritySettings() {
  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Privacy & Security"
        description="Client-side boundary, data autonomy, and zero remote telemetry."
        icon={ShieldCheck}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-cyan" />
            100% Client-Side Boundary
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            All your strategic visions, operational bottlenecks, revenue
            numbers, and sensitive review notes reside exclusively inside your
            device's browser memory.
          </p>
        </div>

        <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Zero Remote Telemetry
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Yash OS transmits zero tracking cookies, user profiling packets, or
            background analytics. The application operates in strict compliance
            with offline-first founder privacy.
          </p>
        </div>

        <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Data Sovereignty & Portability
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            You maintain complete ownership of your operating system state.
            Export your structured JSON database at any moment with zero vendor
            lock-in.
          </p>
        </div>

        <div className="rounded-2xl border border-glass-border/60 bg-secondary/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan" />
            Air-Gapped Operation
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Yash OS executes cleanly without requiring an active internet
            connection. All core planning and timer capabilities run locally in
            browser service workers.
          </p>
        </div>
      </div>
    </div>
  );
}
