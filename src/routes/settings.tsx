import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Glass, PageHeader } from "@/components/os/ui";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategory,
} from "@/components/os/settings/types";
import { ProfileSettings } from "@/components/os/settings/ProfileSettings";
import { AppearanceSettings } from "@/components/os/settings/AppearanceSettings";
import { WorkspaceSettings } from "@/components/os/settings/WorkspaceSettings";
import { NavigationSettings } from "@/components/os/settings/NavigationSettings";
import { NotificationSettings } from "@/components/os/settings/NotificationSettings";
import { DataStorageSettings } from "@/components/os/settings/DataStorageSettings";
import { PrivacySecuritySettings } from "@/components/os/settings/PrivacySecuritySettings";
import { SystemSettings } from "@/components/os/settings/SystemSettings";

type SettingsSearch = {
  section?: string | undefined;
};

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>): SettingsSearch => {
    const valid: SettingsCategory[] = [
      "profile",
      "appearance",
      "workspace",
      "navigation",
      "notifications",
      "data",
      "privacy",
      "system",
    ];
    const sec = typeof s["section"] === "string" ? s["section"] : undefined;
    return {
      section: valid.includes(sec as SettingsCategory) ? sec : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Settings — Yash OS" },
      {
        name: "description",
        content:
          "Centralized operating system control panel: Profile, Appearance, Workspace, Navigation, Notifications, Data, Privacy, and System.",
      },
      { property: "og:title", content: "Settings — Yash OS" },
      {
        property: "og:description",
        content: "Configure your Founder Operating System.",
      },
    ],
  }),
  component: SettingsPage,
});

function renderSection(category: SettingsCategory) {
  switch (category) {
    case "profile":
      return <ProfileSettings />;
    case "appearance":
      return <AppearanceSettings />;
    case "workspace":
      return <WorkspaceSettings />;
    case "navigation":
      return <NavigationSettings />;
    case "notifications":
      return <NotificationSettings />;
    case "data":
      return <DataStorageSettings />;
    case "privacy":
      return <PrivacySecuritySettings />;
    case "system":
      return <SystemSettings />;
    default:
      return <ProfileSettings />;
  }
}

function SettingsPage() {
  const search = Route.useSearch();
  const nav = useNavigate();

  // Active category defaults to "profile" on desktop
  const activeCategory: SettingsCategory =
    (search.section as SettingsCategory) || "profile";
  const isMobileSectionOpen = Boolean(search.section);

  const handleSelectCategory = (catId: SettingsCategory) => {
    nav({
      to: "/settings",
      search: { section: catId },
      replace: true,
    });
  };

  const handleBackToMobileList = () => {
    nav({
      to: "/settings",
      search: {},
      replace: true,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile Back Navigation Header */}
      {isMobileSectionOpen && (
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMobileList}
            className="-ml-2 mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All Settings Categories
          </Button>
        </div>
      )}

      {/* Main Page Header */}
      <div className={cn(isMobileSectionOpen && "hidden md:block")}>
        <PageHeader
          eyebrow="System"
          title="Settings"
          subtitle="Centralized operating-system control panel for your founder workspace."
        />
      </div>

      {/* Two-Panel Layout on Desktop, Drill-down on Mobile */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left Navigation Panel (Category List) */}
        <div
          className={cn(
            "w-full md:w-72 md:shrink-0",
            isMobileSectionOpen ? "hidden md:block" : "block",
          )}
        >
          <Glass className="p-3 md:sticky md:top-24 md:p-4">
            <div className="mb-2.5 px-3 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Control Panel Sections
              </span>
            </div>

            <nav className="space-y-1">
              {SETTINGS_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.99]",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground font-semibold shadow-sm glow"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          isActive
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-glass-border/40 bg-secondary/40 text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-sm leading-tight">
                          {cat.label}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-[11px]",
                            isActive
                              ? "text-white/80"
                              : "text-muted-foreground/70",
                          )}
                        >
                          {cat.shortDesc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        isActive
                          ? "text-white"
                          : "text-muted-foreground/50 md:hidden",
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </Glass>
        </div>

        {/* Right Content Panel (Active Section) */}
        <div
          className={cn(
            "flex-1 min-w-0",
            isMobileSectionOpen ? "block" : "hidden md:block",
          )}
        >
          <Glass className="p-6 md:p-8">{renderSection(activeCategory)}</Glass>
        </div>
      </div>
    </div>
  );
}
