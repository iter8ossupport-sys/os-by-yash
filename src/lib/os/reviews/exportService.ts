import type { DayRecord, OSState, ReviewPeriodSummary } from "../types";

/**
 * Generates and downloads a clean CSV export of review period metrics and daily breakdowns.
 */
export function exportPeriodToCSV(
  summary: ReviewPeriodSummary,
  records: DayRecord[],
) {
  const headers = [
    "Date",
    "State",
    "Source",
    "P1 Planned (min)",
    "P1 Actual (min)",
    "P2 Planned (min)",
    "P2 Actual (min)",
    "P2 Workstream A (min)",
    "P2 Workstream B (min)",
    "P3 Planned (min)",
    "P3 Actual (min)",
    "Tasks Planned",
    "Tasks Done",
    "Outcomes Achieved",
    "Unfinished Count",
    "Learning",
  ];

  const rows = records.map((r) => [
    `"${r.date}"`,
    `"${r.state ?? "finalized"}"`,
    `"${r.source ?? "closeout"}"`,
    r.plannedMin[1] ?? 0,
    r.actualMin[1] ?? 0,
    r.plannedMin[2] ?? 0,
    r.actualMin[2] ?? 0,
    r.p2WorkstreamMinutes?.workstreamA ?? 0,
    r.p2WorkstreamMinutes?.workstreamB ?? 0,
    r.plannedMin[3] ?? 0,
    r.actualMin[3] ?? 0,
    r.tasksPlanned ?? 0,
    r.tasksDone ?? 0,
    `"${(r.outcomesAchieved ?? []).join(", ")}"`,
    (r.unfinished ?? []).length,
    `"${(r.learning ?? "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `yash-os-review-${summary.id}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a structured JSON snapshot of the period summary and underlying records.
 */
export function exportPeriodToJSON(
  summary: ReviewPeriodSummary,
  records: DayRecord[],
) {
  const payload = {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    summary,
    records,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `yash-os-review-${summary.id}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print-formatted window suitable for direct Save-as-PDF.
 */
export function printReviewReport(
  summary: ReviewPeriodSummary,
  records: DayRecord[],
  userName = "Yash",
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Yash OS Review — ${summary.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; margin: 0; line-height: 1.5; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .card .val { font-size: 20px; font-weight: 700; color: #0284c7; }
    .card .lbl { font-size: 12px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { text-align: left; background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .section-title { font-size: 16px; font-weight: 600; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; background: #e0f2fe; color: #0369a1; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>Yash OS — Review Report: ${summary.id}</h1>
  <div class="subtitle">Period: ${summary.startDate} to ${summary.endDate} · Generated for ${userName} · ${records.length} Recorded Day(s)</div>

  <div class="grid">
    <div class="card"><div class="val">${summary.totalActualHours}h</div><div class="lbl">Actual Hours (Planned: ${summary.totalPlannedHours}h)</div></div>
    <div class="card"><div class="val">${summary.taskCompletionRate}%</div><div class="lbl">Task Completion (${summary.tasksDoneTotal}/${summary.tasksPlannedTotal})</div></div>
    <div class="card"><div class="val">${summary.outcomesRate}%</div><div class="lbl">Outcome Delivery (${summary.outcomesAchievedTotal}/${summary.outcomesPlannedTotal})</div></div>
    <div class="card"><div class="val">${summary.p2HoursWorkstreamA}h / ${summary.p2HoursWorkstreamB}h</div><div class="lbl">P2 Workstream A / B Split</div></div>
  </div>

  <div class="section-title">Priority Breakdown</div>
  <table>
    <thead><tr><th>Priority</th><th>Planned Hours</th><th>Actual Hours</th><th>Outcomes Achieved</th></tr></thead>
    <tbody>
      <tr><td>#1 Founder Capability</td><td>${summary.plannedHoursByPriority[1]}h</td><td>${summary.hoursByPriority[1]}h</td><td>${summary.outcomesByPriority[1].achieved}/${summary.outcomesByPriority[1].planned}</td></tr>
      <tr><td>#2 Cashflow Infrastructure</td><td>${summary.plannedHoursByPriority[2]}h</td><td>${summary.hoursByPriority[2]}h</td><td>${summary.outcomesByPriority[2].achieved}/${summary.outcomesByPriority[2].planned}</td></tr>
      <tr><td>#3 Learning for Execution</td><td>${summary.plannedHoursByPriority[3]}h</td><td>${summary.hoursByPriority[3]}h</td><td>${summary.outcomesByPriority[3].achieved}/${summary.outcomesByPriority[3].planned}</td></tr>
    </tbody>
  </table>

  <div class="section-title">Key Outputs Delivered (${summary.keyOutputs.length})</div>
  <ul>
    ${summary.keyOutputs.map((o) => `<li><strong>[${o.date}] #${o.priorityId} ${o.title}:</strong> ${o.text} ${o.workstream ? `<span class="tag">${o.workstream}</span>` : ""}</li>`).join("")}
  </ul>

  <div class="section-title">Recurring Unfinished Friction</div>
  <ul>
    ${summary.repeatedUnfinishedTasks.length ? summary.repeatedUnfinishedTasks.map((t) => `<li><strong>${t.title}:</strong> postponed ${t.count} time(s)</li>`).join("") : "<li>No recurring friction noted.</li>"}
  </ul>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
