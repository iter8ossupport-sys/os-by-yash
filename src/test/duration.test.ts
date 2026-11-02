import { describe, expect, it } from "vitest";
import { parseDurationInput, formatMinutesForInput } from "@/lib/os/duration";

describe("Duration parsing with automatic unit detection", () => {
  it("interprets numeric values without units as hours", () => {
    // Exact table examples from specifications
    expect(parseDurationInput("1")).toMatchObject({ valid: true, minutes: 60 });
    expect(parseDurationInput("1.5")).toMatchObject({
      valid: true,
      minutes: 90,
    });
    expect(parseDurationInput("5")).toMatchObject({
      valid: true,
      minutes: 300,
    });
    expect(parseDurationInput("15")).toMatchObject({
      valid: true,
      minutes: 900,
    });
  });

  it("interprets values ending in m or M as minutes", () => {
    // Exact table examples from specifications
    expect(parseDurationInput("15m")).toMatchObject({
      valid: true,
      minutes: 15,
    });
    expect(parseDurationInput("30M")).toMatchObject({
      valid: true,
      minutes: 30,
    });
    expect(parseDurationInput("90m")).toMatchObject({
      valid: true,
      minutes: 90,
    });
  });

  it("handles whitespace correctly", () => {
    expect(parseDurationInput("  2.5  ")).toMatchObject({
      valid: true,
      minutes: 150,
    });
    expect(parseDurationInput("45 m")).toMatchObject({
      valid: true,
      minutes: 45,
    });
    expect(parseDurationInput("  20M ")).toMatchObject({
      valid: true,
      minutes: 20,
    });
  });

  it("displays interpreted text clearly", () => {
    expect(parseDurationInput("1").interpretedText).toContain("1 hour");
    expect(parseDurationInput("1.5").interpretedText).toContain("1.5 hours");
    expect(parseDurationInput("45m").interpretedText).toBe("45 mins");
  });

  it("validates empty, negative, zero, and malformed inputs safely", () => {
    expect(parseDurationInput("").valid).toBe(false);
    expect(parseDurationInput("   ").valid).toBe(false);
    expect(parseDurationInput("-1").valid).toBe(false);
    expect(parseDurationInput("0").valid).toBe(false);
    expect(parseDurationInput("0m").valid).toBe(false);
    expect(parseDurationInput("abc").valid).toBe(false);
    expect(parseDurationInput("1.5.0").valid).toBe(false);
    expect(parseDurationInput("2hours").valid).toBe(false);
  });

  it("formats minutes back to clean input strings", () => {
    expect(formatMinutesForInput(60)).toBe("1");
    expect(formatMinutesForInput(90)).toBe("1.5");
    expect(formatMinutesForInput(300)).toBe("5");
    expect(formatMinutesForInput(45)).toBe("45m");
    expect(formatMinutesForInput(15)).toBe("15m");
  });
});
