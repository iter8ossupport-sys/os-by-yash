import { cva, type VariantProps } from "class-variance-authority";
import { X, Cpu, Database, BookOpen } from "lucide-react";
import { forwardRef, useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { PriorityId } from "@/lib/os/types";

export function Glass({ className, strong, ...p }: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return <div className={cn(strong ? "glass-strong" : "glass", "rounded-3xl", className)} {...p} />;
}

const btn = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        primary: "bg-gradient-primary text-primary-foreground glow hover:brightness-110",
        glass: "glass hover:bg-accent text-foreground",
        ghost: "hover:bg-accent text-muted-foreground hover:text-foreground",
        danger: "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
        success: "bg-success/15 text-success border border-success/30 hover:bg-success/25",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-10 px-4", lg: "h-12 px-6 text-base", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>>(
  ({ className, variant, size, ...p }, ref) => <button ref={ref} className={cn(btn({ variant, size }), className)} {...p} />,
);
Button.displayName = "Button";

const field = "w-full rounded-xl border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(field, "h-10", p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cn(field, p.className)} />;
export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(field, "h-10", className)}>
      {options.map((o) => <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>)}
    </select>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-1.5 text-xs font-medium text-muted-foreground", className)}>{children}</div>;
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: readonly T[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-xl bg-secondary/50 p-1", className)}>
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all", value === o ? "bg-gradient-primary text-primary-foreground glow" : "text-muted-foreground hover:text-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "p1" | "p2" | "p3" | undefined }) {
  const toneCls = { primary: "bg-gradient-primary", p1: "bg-p1", p2: "bg-p2", p3: "bg-p3" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-700", toneCls)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-glass-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>{children}</span>;
}

export const DemoTag = () => <Badge className="border-warning/30 text-warning">Demo data</Badge>;

const P_ICON = { 1: Cpu, 2: Database, 3: BookOpen } as const;
const P_TONE = { 1: "text-p1 bg-p1/15 border-p1/30", 2: "text-p2 bg-p2/15 border-p2/30", 3: "text-p3 bg-p3/15 border-p3/30" } as const;
export function PriorityIcon({ id, className }: { id: PriorityId; className?: string }) {
  const I = P_ICON[id];
  return <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", P_TONE[id], className)}><I className="h-5 w-5" /></span>;
}
export const priorityTone = (id: PriorityId): "p1" | "p2" | "p3" => (id === 1 ? "p1" : id === 2 ? "p2" : "p3");

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 fade-up">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/60 p-4 backdrop-blur-sm animate-in fade-in md:p-10" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cn("glass-strong w-full rounded-3xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300", wide ? "max-w-5xl" : "max-w-xl")}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-glass-border p-8 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
