import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Compass,
  FileCheck,
  History,
  Lightbulb,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useOS } from "@/lib/os/store";
import { PageHeader, Segmented, Button, Badge } from "@/components/os/ui";
import { ReviewOverview } from "@/components/os/reviews/ReviewOverview";
import {
  AnalyticsHubView,
  type AnalyticalSubView,
} from "@/components/os/reviews/AnalyticsHubView";
import { DailyReviewView } from "@/components/os/reviews/DailyReviewView";
import { WeeklyReviewView } from "@/components/os/reviews/WeeklyReviewView";
import { MonthlyReviewView } from "@/components/os/reviews/MonthlyReviewView";
import { HistoryReviewView } from "@/components/os/reviews/HistoryReviewView";
import { BottlenecksView } from "@/components/os/reviews/BottlenecksView";
import { ImprovementsView } from "@/components/os/reviews/ImprovementsView";
import { AIAnalystView } from "@/components/os/reviews/AIAnalystView";
import { ForecastView } from "@/components/os/reviews/ForecastView";
import { ReviewSettingsModal } from "@/components/os/reviews/ReviewSettingsModal";
import { ReportShareModal } from "@/components/os/reviews/ReportShareModal";
import { Share2 } from "lucide-react";

type SearchParams = {
  tab?: string | undefined;
  date?: string | undefined;
  view?: string | undefined;
};

export const Route = createFileRoute("/reviews")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    tab: typeof s["tab"] === "string" ? (s["tab"] as string) : undefined,
    date: typeof s["date"] === "string" ? (s["date"] as string) : undefined,
    view: typeof s["view"] === "string" ? (s["view"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reviews — Yash OS" },
      {
        name: "description",
        content:
          "Evidence-based performance & improvement intelligence built from verified planning and execution records.",
      },
      { property: "og:title", content: "Reviews — Yash OS" },
      {
        property: "og:description",
        content: "PRE-THINK → ACT → POST-THINK → IMPROVE.",
      },
    ],
  }),
  component: ReviewsPage,
});

const TABS = [
  "Overview",
  "Analytics",
  "Daily",
  "Weekly",
  "Monthly",
  "History",
  "Bottlenecks",
  "Improvements",
  "AI Analyst",
  "Forecast",
] as const;

type TabType = (typeof TABS)[number];

function ReviewsPage() {
  const { state } = useOS();
  const search = Route.useSearch();
  const nav = useNavigate();

  // Selected tab
  const [tab, setTab] = useState<TabType>(() => {
    if (search.tab && TABS.includes(search.tab as TabType)) {
      return search.tab as TabType;
    }
    const def = state.reviewSettings?.defaultPeriod;
    if (def === "weekly") return "Weekly";
    if (def === "monthly") return "Monthly";
    if (def === "history") return "History";
    return "Overview";
  });

  // Track target date when navigating between views
  const [targetedDate, setTargetedDate] = useState<string | undefined>(
    search.date,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Sync tab changes with URL search params
  const handleTabChange = (nextTab: TabType) => {
    setTab(nextTab);
    const searchParams: SearchParams = { tab: nextTab, date: targetedDate };
    nav({
      to: "/reviews",
      search: searchParams,
      replace: true,
    });
  };

  const handleSelectDateFromHistory = (date: string) => {
    setTargetedDate(date);
    setTab("Daily");
    const searchParams: SearchParams = { tab: "Daily", date };
    nav({
      to: "/reviews",
      search: searchParams,
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header with System Actions */}
      <PageHeader
        eyebrow="Post-Think · Analyze · Improve"
        title="Reviews & Improvement Intelligence"
        subtitle="Empirical performance intelligence, bottleneck resolution, and milestone forecasting from actual records."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1 text-primary" />
              Share / Export
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => nav({ to: "/execute", search: { closeout: 1 } })}
              className="text-xs"
            >
              <Moon className="h-3.5 w-3.5 mr-1 text-cyan" />
              Daily Closeout
            </Button>
            <Button
              variant="glass"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Reviews Settings"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        }
      />

      {/* Main Tab Navigation */}
      <div className="overflow-x-auto pb-1">
        <Segmented
          value={tab}
          options={TABS}
          onChange={handleTabChange}
          className="min-w-max"
        />
      </div>

      {/* Tab Views */}
      <div className="pt-2 animate-in fade-in duration-300">
        {tab === "Overview" && (
          <ReviewOverview
            onSelectTab={(t, v) => {
              if (v) {
                const searchParams: SearchParams = {
                  tab: t,
                  view: v,
                  date: targetedDate,
                };
                nav({ to: "/reviews", search: searchParams, replace: true });
                setTab(t as TabType);
              } else {
                handleTabChange(t as TabType);
              }
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {tab === "Analytics" && (
          <AnalyticsHubView
            initialSubView={search.view as AnalyticalSubView | undefined}
            onNavigateToTab={(t, d) => {
              if (d) setTargetedDate(d);
              handleTabChange(t as TabType);
            }}
          />
        )}

        {tab === "Daily" && <DailyReviewView initialDate={targetedDate} />}

        {tab === "Weekly" && (
          <WeeklyReviewView
            initialDate={targetedDate}
            onNavigateToDay={handleSelectDateFromHistory}
          />
        )}

        {tab === "Monthly" && <MonthlyReviewView initialDate={targetedDate} />}

        {tab === "History" && (
          <HistoryReviewView onSelectDate={handleSelectDateFromHistory} />
        )}

        {tab === "Bottlenecks" && <BottlenecksView />}

        {tab === "Improvements" && <ImprovementsView />}

        {tab === "AI Analyst" && (
          <AIAnalystView
            onGoToImprovements={() => handleTabChange("Improvements")}
          />
        )}

        {tab === "Forecast" && <ForecastView />}
      </div>

      {/* Review Settings & Backup Modal */}
      <ReviewSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Report Sharing & Permission Modal */}
      <ReportShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
