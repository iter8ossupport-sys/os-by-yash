import { describe, it, expect } from "vitest";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategory,
} from "../components/os/settings/types";
import { initialState } from "../lib/os/seed";

describe("Settings Module Information Architecture", () => {
  it("defines exactly 8 distinct settings categories", () => {
    expect(SETTINGS_CATEGORIES).toHaveLength(8);

    const ids = SETTINGS_CATEGORIES.map((c) => c.id);
    const expectedCategories: SettingsCategory[] = [
      "profile",
      "appearance",
      "workspace",
      "navigation",
      "notifications",
      "data",
      "privacy",
      "system",
    ];

    expect(ids).toEqual(expectedCategories);
  });

  it("provides comprehensive metadata for each category", () => {
    for (const cat of SETTINGS_CATEGORIES) {
      expect(cat.id).toBeDefined();
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.description.length).toBeGreaterThan(0);
      expect(cat.shortDesc.length).toBeGreaterThan(0);
      expect(cat.icon).toBeDefined();
    }
  });

  it("maps all existing state settings to initial state", () => {
    // Profile
    expect(initialState.userName).toBe("Yash");
    expect(initialState.userAvatar).toBeNull();

    // Appearance
    expect(initialState.theme).toBe("dark");

    // Workspace
    expect(initialState.foundation.northStar).toBe(
      "Build systems that remove human friction.",
    );
    expect(initialState.priorities).toHaveLength(3);
    expect(initialState.goals).toBeDefined();

    // Navigation & Experience
    expect(initialState.prefs.timer).toBe(true);
    expect(initialState.prefs.dayTypeHours).toBeDefined();
    expect(initialState.prefs.constraints).toBeDefined();

    // Notifications
    expect(initialState.prefs.notifications).toBe(false);

    // Data & Storage
    expect(initialState.history).toBeDefined();
    expect(initialState.projects).toBeDefined();
    expect(initialState.knowledge).toBeDefined();
  });
});
