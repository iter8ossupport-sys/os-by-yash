import type { LucideIcon } from "lucide-react";

export function SettingsSectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-glass-border/60 pb-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed md:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
