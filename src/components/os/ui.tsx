import { cva, type VariantProps } from "class-variance-authority";
import { X, Cpu, Database, BookOpen } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { PriorityId } from "@/lib/os/types";

export function Glass({
  className,
  strong,
  ...p
}: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-3xl",
        className,
      )}
      {...p}
    />
  );
}

const btn = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-primary text-primary-foreground glow hover:brightness-110",
        glass: "glass hover:bg-accent text-foreground",
        ghost: "hover:bg-accent text-muted-foreground hover:text-foreground",
        danger:
          "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
        success:
          "bg-success/15 text-success border border-success/30 hover:bg-success/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>
>(({ className, variant, size, ...p }, ref) => (
  <button ref={ref} className={cn(btn({ variant, size }), className)} {...p} />
));
Button.displayName = "Button";

const field =
  "w-full rounded-xl border border-input bg-secondary/60 dark:bg-[#0b1220]/70 dark:border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition [color-scheme:dark] focus:border-ring focus:ring-2 focus:ring-ring/30";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cn(field, "h-10", p.className)} />
);
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    rows={3}
    {...p}
    className={cn(field, "min-h-[76px] resize-y leading-relaxed", p.className)}
  />
);
export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(field, "h-10", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-popover">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-xl bg-secondary/50 p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === o
              ? "bg-gradient-primary text-primary-foreground glow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Progress({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "p1" | "p2" | "p3" | undefined;
}) {
  const toneCls = {
    primary: "bg-gradient-primary",
    p1: "bg-p1",
    p2: "bg-p2",
    p3: "bg-p3",
  }[tone];
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          toneCls,
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-glass-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const DemoTag = () => null;

const P_ICON = { 1: Cpu, 2: Database, 3: BookOpen } as const;
const P_TONE = {
  1: "text-p1 bg-p1/15 border-p1/30",
  2: "text-p2 bg-p2/15 border-p2/30",
  3: "text-p3 bg-p3/15 border-p3/30",
} as const;
export function PriorityIcon({
  id,
  className,
}: {
  id: PriorityId;
  className?: string;
}) {
  const I = P_ICON[id];
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
        P_TONE[id],
        className,
      )}
    >
      <I className="h-5 w-5" />
    </span>
  );
}
export const priorityTone = (id: PriorityId): "p1" | "p2" | "p3" =>
  id === 1 ? "p1" : id === 2 ? "p2" : "p3";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 fade-up">
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

let activeModalsCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (activeModalsCount === 0) {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  activeModalsCount++;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  activeModalsCount = Math.max(0, activeModalsCount - 1);
  if (activeModalsCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  className,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevActiveElement = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
      if (prevActiveElement && typeof prevActiveElement.focus === "function") {
        try {
          prevActiveElement.focus();
        } catch {
          // Ignore focus errors
        }
      }
    };
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden"
      role="presentation"
    >
      {/* Viewport backdrop with click-outside listener */}
      <div
        className="fixed inset-0 bg-background/70 backdrop-blur-md modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Viewport-centered dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "glass-strong relative z-10 flex w-full flex-col rounded-3xl border border-glass-border shadow-2xl modal-panel",
          "max-h-[min(92vh,calc(100dvh-2rem))] sm:max-h-[min(88vh,calc(100dvh-3rem))]",
          wide ? "max-w-4xl lg:max-w-5xl" : "max-w-xl",
          className,
        )}
      >
        {/* Pinned Dialog Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-glass-border/40 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl truncate">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Internally Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 overscroll-contain">
          {children}
        </div>

        {/* Optional Pinned Footer */}
        {footer && (
          <div className="shrink-0 border-t border-glass-border/40 px-5 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-glass-border p-8 text-center">
      <div className="font-medium">{title}</div>
      {children && (
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      )}
    </div>
  );
}
