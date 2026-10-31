import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, PlayCircle, FolderKanban, BarChart3, BookMarked, Settings, Sun, Moon, Target } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOS } from "@/lib/os/store";
import orb from "@/assets/orb.png";
import { Button } from "./ui";
import { GoalsPanel } from "./GoalsPanel";

export const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/plan", label: "Plan", icon: ListChecks },
  { to: "/execute", label: "Execute", icon: PlayCircle },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/reviews", label: "Reviews", icon: BarChart3 },
  { to: "/knowledge", label: "Knowledge", icon: BookMarked },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state, update, setGoalsOpen } = useOS();
  const isDark = state.theme !== "light";
  const date = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="atmosphere" />
      <div className="relative z-10 flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col p-4 lg:flex">
          <div className="glass flex h-full flex-col rounded-3xl p-4">
            <Link to="/" className="mb-8 flex items-center gap-3 px-2 pt-2">
              <img src={orb} alt="" width={36} height={36} className="h-9 w-9 float-slow" />
              <span className="font-display text-lg font-semibold">Yash OS</span>
            </Link>
            <nav className="flex flex-col gap-1">
              {NAV.map(({ to, label, icon: I }) => {
                const active = to === "/" ? path === "/" : path.startsWith(to);
                return (
                  <Link key={to} to={to}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                      active ? "bg-gradient-primary text-primary-foreground glow" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                    <I className="h-4 w-4" />{label}
                  </Link>
                );
              })}
            </nav>
            <div className="relative mt-auto overflow-hidden rounded-2xl border border-glass-border bg-secondary/40 p-4">
              <img src={orb} alt="" loading="lazy" width={120} height={120} className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 opacity-80 float-slow" />
              <div className="relative font-display text-lg font-semibold leading-tight">{state.foundation.northStar}</div>
              <div className="relative mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">North Star</div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pt-4 lg:px-6">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img src={orb} alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display font-semibold">Yash OS</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <span className="glass hidden rounded-full px-4 py-2 text-xs sm:inline">{date}</span>
              <Button variant="glass" size="icon" className="rounded-full" aria-label="Goals & Milestones" onClick={() => setGoalsOpen(true)}><Target className="h-4 w-4" /></Button>
              <Button variant="glass" size="icon" className="rounded-full" aria-label="Toggle theme"
                onClick={() => update((s) => ({ ...s, theme: isDark ? "light" : "dark" }))}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">{state.userName[0]}</span>
            </div>
          </header>
          <main key={path} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 fade-up lg:px-8 lg:pb-12">{children}</main>
        </div>
      </div>

      <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex justify-between rounded-2xl p-1.5 lg:hidden">
        {NAV.map(({ to, label, icon: I }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} aria-label={label}
              className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px]", active ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground")}>
              <I className="h-4 w-4" /><span className="hidden sm:block">{label}</span>
            </Link>
          );
        })}
      </nav>
      <GoalsPanel />
    </div>
  );
}
