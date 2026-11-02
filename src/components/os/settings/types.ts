import {
  Bell,
  Compass,
  Cpu,
  HardDrive,
  Info,
  Palette,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsCategory =
  | "profile"
  | "appearance"
  | "workspace"
  | "navigation"
  | "notifications"
  | "data"
  | "privacy"
  | "system";

export interface SettingsCategoryMeta {
  id: SettingsCategory;
  label: string;
  description: string;
  shortDesc: string;
  icon: LucideIcon;
}

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    id: "profile",
    label: "Profile & Identity",
    description:
      "Manage your founder identity, circular profile photo, and public name across Yash OS.",
    shortDesc: "Avatar, name and identity",
    icon: User,
  },
  {
    id: "appearance",
    label: "Appearance",
    description:
      "Customize the interface theme and visual mode of the workspace.",
    shortDesc: "Theme, contrast and colors",
    icon: Palette,
  },
  {
    id: "workspace",
    label: "Workspace",
    description:
      "Foundation principles, strategic phases, permanent priorities, and long-term milestones.",
    shortDesc: "Foundation, goals and priorities",
    icon: Compass,
  },
  {
    id: "navigation",
    label: "Navigation & Experience",
    description:
      "Fine-tune execution flow, timer visibility, and personal operating constraints.",
    shortDesc: "Timer, daily hours and constraints",
    icon: Cpu,
  },
  {
    id: "notifications",
    label: "Notifications",
    description:
      "System alerts, session transitions, and daily review reminder preferences.",
    shortDesc: "Alerts and review reminders",
    icon: Bell,
  },
  {
    id: "data",
    label: "Data & Storage",
    description:
      "Local browser persistence, JSON backup exports, data restoration, and factory reset.",
    shortDesc: "Backup, restore and storage",
    icon: HardDrive,
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    description:
      "Client-side boundary, zero remote telemetry, and local data sovereignty.",
    shortDesc: "Client-side boundary and autonomy",
    icon: ShieldCheck,
  },
  {
    id: "system",
    label: "System",
    description:
      "Technical specifications, active schema version, platform runtime, and storage diagnostics.",
    shortDesc: "Version, schema and diagnostics",
    icon: Info,
  },
];
