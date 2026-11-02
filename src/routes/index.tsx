import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Moon,
  Play,
  Target,
  Zap,
} from "lucide-react";
import hero from "@/assets/hero-space.jpg";
import orb from "@/assets/orb.png";
import { useOS, fmtMin } from "@/lib/os/store";
import { selectedTasks, plannedMinutes } from "@/lib/os/logic";
import {
  Button,
  Glass,
  PriorityIcon,
  Progress,
  priorityTone,
} from "@/components/os/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Yash OS" },
      {
        name: "description",
        content:
          "Your current operating state: North Star, three priorities and today's focus.",
      },
      { property: "og:title", content: "Home — Yash OS" },
      {
        property: "og:description",
        content: "Your current operating state at a glance.",
      },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12
    ? "Good Morning,"
    : h < 18
      ? "Good Afternoon,"
      : "Good Evening,";
}

function HomePage() {
  const { state, setGoalsOpen } = useOS();
  const nav = useNavigate();
  const plan = state.plan;
  const sel = selectedTasks(plan);
  const done = sel.filter((t) => t.status === "done").length;

  const quick = [
    {
      label: "Plan Today",
      sub: plan ? "Plan approved — replan" : "7-step workflow",
      icon: ListChecks,
      onClick: () => nav({ to: "/plan" }),
    },
    {
      label: "Execute Plan",
      sub: plan
        ? `${sel.length - done} tasks remaining`
        : "No approved plan yet",
      icon: Play,
      onClick: () => nav({ to: "/execute" }),
    },
    {
      label: "Goals & Milestones",
      sub: "Level A · B · C",
      icon: Target,
      onClick: () => setGoalsOpen(true),
    },
    {
      label: "Emergency Switch",
      sub: "Pause & redirect",
      icon: Zap,
      onClick: () => nav({ to: "/execute", search: { emergency: 1 } }),
    },
    {
      label: "Daily Closeout",
      sub: "End your day",
      icon: Moon,
      onClick: () => nav({ to: "/execute", search: { closeout: 1 } }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Glass className="relative overflow-hidden p-6 md:p-10">
          <img
            src={hero}
            alt=""
            width={1600}
            height={912}
            className="absolute inset-0 h-full w-full object-cover opacity-70 dark:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="relative">
            <div className="text-2xl font-light md:text-3xl">{greeting()}</div>
            <div className="font-display text-5xl font-bold md:text-6xl">
              {state.userName}.
            </div>
            <p className="mt-2 text-muted-foreground">
              Reality over assumptions. Progress through execution.
            </p>
            <p className="mt-6 text-sm font-medium text-foreground/90 md:text-base">
              Find human friction. Solve problems. Build systems. Scale impact.
            </p>

            <div className="glass mt-8 max-w-xl rounded-3xl p-6">
              <img
                src={orb}
                alt=""
                width={120}
                height={120}
                className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 float-slow md:block"
              />
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
                North Star
              </div>
              <div className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
                {state.foundation.northStar}
              </div>
              <button
                onClick={() => setGoalsOpen(true)}
                className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Long-term: {state.goals.periodMonths}-month goal → nearest
                milestone <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Glass>

        <Glass className="p-5">
          <div className="mb-4 font-display font-semibold">Quick Actions</div>
          <div className="space-y-2">
            {quick.map(({ label, sub, icon: I, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex w-full items-center gap-3 rounded-2xl border border-glass-border bg-secondary/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-accent"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <I className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Glass>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Three Priorities</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {state.priorities.map((p) => {
            const ts = sel.filter((t) => t.priorityId === p.id);
            const d = ts.filter((t) => t.status === "done").length;
            return (
              <Glass
                key={p.id}
                className="p-5 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <PriorityIcon id={p.id} />
                  <div>
                    <div className="text-xs text-muted-foreground">#{p.id}</div>
                    <div className="font-semibold">{p.name}</div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {p.purpose}
                </p>
                <div className="mt-4 text-sm">
                  <span className="text-muted-foreground">Project: </span>
                  {p.project || (
                    <span className="italic text-muted-foreground/60">
                      No active project
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Milestone: </span>
                  {p.milestone || (
                    <span className="italic text-muted-foreground/60">
                      None set
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  {ts.length ? (
                    <>
                      <Progress
                        value={(d / ts.length) * 100}
                        tone={priorityTone(p.id)}
                      />
                      <div className="mt-2 text-xs text-muted-foreground">
                        {d}/{ts.length} tasks today
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No tasks planned today
                    </div>
                  )}
                </div>
              </Glass>
            );
          })}
        </div>
      </section>

      <Glass className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Today's Focus</h2>
            <p className="text-sm text-muted-foreground">
              {plan
                ? `${done}/${sel.length} tasks done · ${fmtMin(plannedMinutes(plan))} planned`
                : "Start with a plan to define today's outcomes."}
            </p>
          </div>
          {plan ? (
            <Button variant="primary" onClick={() => nav({ to: "/execute" })}>
              Continue execution <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/plan">
              <Button variant="primary">
                Plan today <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        {plan && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {state.priorities.map((p) => (
              <div key={p.id} className="rounded-2xl bg-secondary/40 p-4">
                <div className="text-xs text-muted-foreground">
                  #{p.id} outcome
                </div>
                <div className="mt-1 text-sm">{plan.outcomes[p.id] || "—"}</div>
                <div className="mt-3 space-y-1">
                  {sel
                    .filter((t) => t.priorityId === p.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <CheckCircle2
                          className={
                            t.status === "done"
                              ? "h-3.5 w-3.5 text-success"
                              : "h-3.5 w-3.5 text-muted-foreground/40"
                          }
                        />
                        <span
                          className={
                            t.status === "done"
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {t.title}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
}
