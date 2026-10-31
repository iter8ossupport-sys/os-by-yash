import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOS, fmtMin } from "@/lib/os/store";
import { buildDayRecord } from "@/lib/os/logic";
import type { DayRecord, PriorityId } from "@/lib/os/types";
import { Empty, Glass, PageHeader, Segmented } from "@/components/os/ui";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Yash OS" },
      { name: "description", content: "Daily, weekly and monthly reviews built from your recorded execution." },
      { property: "og:title", content: "Reviews — Yash OS" },
      { property: "og:description", content: "Turn data into growth." },
    ],
  }),
  component: ReviewsPage,
});

const TABS = ["Daily", "Weekly", "Monthly", "History"] as const;
const IDS: PriorityId[] = [1, 2, 3];

function sum(recs: DayRecord[]) {
  const z = { 1: 0, 2: 0, 3: 0 } as Record<PriorityId, number>;
  const planned = { ...z }, actual = { ...z };
  recs.forEach((r) => IDS.forEach((i) => { planned[i] += r.plannedMin[i]; actual[i] += r.actualMin[i]; }));
  return { planned, actual };
}

function ReviewsPage() {
  const { state } = useOS();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Daily");
  const live = state.plan ? buildDayRecord(state.plan, "") : null;
  const all = useMemo(() => [...state.history].sort((a, b) => b.date.localeCompare(a.date)), [state.history]);
  const days = tab === "Weekly" ? 7 : tab === "Monthly" ? 30 : 1;
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const recs = tab === "Daily" ? (live ? [live] : all.slice(0, 1)) : all.filter((r) => r.date >= cutoff);
  const s = sum(recs);
  const chart = state.priorities.map((p) => ({ name: `#${p.id} ${p.name.split(" ")[0]}`, Planned: s.planned[p.id], Actual: s.actual[p.id] }));

  return (
    <div>
      <PageHeader eyebrow="Post-think · Improve" title="Review — Turn Data into Growth" subtitle="Everything here comes from what you actually planned and recorded." />
      <Segmented value={tab} options={TABS} onChange={setTab} className="mb-6 max-w-lg" />

      {tab === "History" ? (
        all.length === 0 ? <Empty title="No closed days yet">Run Daily Closeout in Execute to create your first review.</Empty> : (
          <div className="space-y-3">
            {all.map((r) => (
              <Glass key={r.date} className="p-4">
                <div className="flex flex-wrap justify-between gap-2"><b>{r.date}</b><span className="text-sm text-muted-foreground">{r.tasksDone}/{r.tasksPlanned} tasks · outcomes achieved: {r.outcomesAchieved.length}/3</span></div>
                {r.learning && <p className="mt-2 text-sm text-muted-foreground">Learning: {r.learning}</p>}
              </Glass>
            ))}
          </div>
        )
      ) : recs.length === 0 ? (
        <Empty title="No data for this period yet">Approve a plan and record outputs — reviews build from real execution only.</Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Glass className="p-5">
            <h2 className="mb-1 font-semibold">Plan vs Actual (minutes)</h2>
            <p className="mb-4 text-xs text-muted-foreground">{tab === "Daily" ? (live ? "Today (live, not yet closed)" : recs[0].date) : `${recs.length} closed day(s) in the last ${days} days`}</p>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="Planned" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Actual" fill="var(--violet)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>
          <Glass className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Stat l="Tasks done" v={`${recs.reduce((a, r) => a + r.tasksDone, 0)}/${recs.reduce((a, r) => a + r.tasksPlanned, 0)}`} />
              <Stat l="Actual time" v={fmtMin(IDS.reduce((a, i) => a + s.actual[i], 0))} />
              <Stat l="Outcomes achieved" v={String(recs.reduce((a, r) => a + r.outcomesAchieved.length, 0))} />
              <Stat l="Unfinished" v={String(recs.reduce((a, r) => a + r.unfinished.length, 0))} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Key outputs</h3>
              <ul className="space-y-1.5 text-sm">
                {recs.flatMap((r) => r.outputs).slice(0, 8).map((o, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">#{o.priorityId} {o.title}:</span>
                    {o.workstream && <span className="rounded-md border border-cyan/30 bg-cyan/10 px-1.5 py-0.2 text-[10px] font-medium text-cyan">{o.workstream}</span>}
                    <span className="text-muted-foreground">{o.text}</span>
                  </li>
                ))}
              </ul>
              {recs.every((r) => !r.outputs.length) && <p className="text-sm text-muted-foreground">No outputs recorded.</p>}
            </div>
            {tab !== "Daily" && (
              <div><h3 className="mb-2 text-sm font-semibold">Repeated unfinished work</h3>
                <ul className="text-sm text-muted-foreground">{Object.entries(recs.flatMap((r) => r.unfinished).reduce<Record<string, number>>((m, u) => ({ ...m, [u]: (m[u] ?? 0) + 1 }), {})).filter(([, n]) => n > 1).map(([u, n]) => <li key={u}>{u} ×{n}</li>)}</ul>
              </div>
            )}
            {tab === "Monthly" && (
              <div className="text-sm"><h3 className="mb-2 font-semibold">Milestones</h3>{state.priorities.map((p) => <div key={p.id}>#{p.id} Level C progress: {state.goals.levelC[p.id].progress}% (self-assessed)</div>)}
                <div>Level A: {state.goals.levelA.approved ? "approved" : "proposed"} · Level B: {state.goals.levelB.approved ? "approved" : "proposed"}</div></div>
            )}
            <div><h3 className="mb-2 text-sm font-semibold">Learning</h3><ul className="text-sm text-muted-foreground">{recs.filter((r) => r.learning).map((r) => <li key={r.date}>{r.date}: {r.learning}</li>)}</ul></div>
          </Glass>
        </div>
      )}
    </div>
  );
}

const Stat = ({ l, v }: { l: string; v: string }) => <div className="rounded-2xl bg-secondary/40 p-3"><div className="font-display text-xl font-semibold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>;
