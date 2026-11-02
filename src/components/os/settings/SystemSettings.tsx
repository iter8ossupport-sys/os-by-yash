import { useEffect, useState } from "react";
import { Info, Cpu, Database, Server } from "lucide-react";
import { useOS } from "@/lib/os/store";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function SystemSettings() {
  const { state } = useOS();
  const [storageSizeKb, setStorageSizeKb] = useState<number>(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("yash-os-v1") || "";
      const bytes = raw.length * 2;
      setStorageSizeKb(Math.round((bytes / 1024) * 10) / 10);
    } catch {
      setStorageSizeKb(0);
    }
  }, [state]);

  const stats = [
    {
      label: "Application",
      value: "Yash OS",
      sub: "Founder Operating System",
      icon: Cpu,
    },
    {
      label: "Release",
      value: "v0.1.0-beta",
      sub: "Production-ready build",
      icon: Server,
    },
    {
      label: "Schema Version",
      value: `v${state.schemaVersion ?? 2}`,
      sub: "Automatic schema migration",
      icon: Database,
    },
    {
      label: "Storage Footprint",
      value: `~${storageSizeKb} KB`,
      sub: "Local storage utilization",
      icon: Info,
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="System"
        description="Application-level specifications, schema architecture, and storage diagnostics."
        icon={Info}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-glass-border/50 bg-secondary/25 p-4 transition-all hover:bg-secondary/40"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-base font-bold text-foreground sm:text-lg">
              {value}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
          Runtime Architecture
        </h3>

        <div className="rounded-2xl border border-glass-border/40 bg-secondary/15 p-5 text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            <strong className="text-foreground">State Store Engine: </strong>
            React Context with unified LocalStorage synchronization, automatic
            snapshot migration, and cross-tab durability.
          </p>
          <p>
            <strong className="text-foreground">Router: </strong>
            TanStack Router with route-level code preloading and instant view
            transitions.
          </p>
          <p>
            <strong className="text-foreground">Persistence Key: </strong>
            <code className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              yash-os-v1
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
