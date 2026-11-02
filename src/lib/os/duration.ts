export interface DurationParseResult {
  valid: boolean;
  minutes: number;
  interpretedText: string;
  error?: string;
}

/**
 * Parses duration input with automatic unit detection:
 * - A numeric value without a unit means HOURS (e.g. 1 -> 60m, 1.5 -> 90m, 5 -> 300m, 15 -> 900m)
 * - Decimal values are valid (e.g. 0.5 -> 30m, 1.5 -> 90m)
 * - A value ending in m or M means MINUTES (e.g. 15m -> 15m, 30M -> 30m, 90m -> 90m)
 * - Safely handles invalid, empty, or negative inputs without silently defaulting to zero
 */
export function parseDurationInput(raw: string): DurationParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      minutes: 0,
      interpretedText: "",
      error: "Duration is required",
    };
  }

  // Regex pattern: numeric value (integer or decimal) followed by optional whitespace and optional m/M
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([mM])?$/);
  if (!match) {
    return {
      valid: false,
      minutes: 0,
      interpretedText: "",
      error: "Enter hours (e.g. 1.5) or minutes (e.g. 45m)",
    };
  }

  const num = parseFloat(match[1] ?? "");
  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      minutes: 0,
      interpretedText: "",
      error: "Duration must be greater than 0",
    };
  }

  const unit = match[2]?.toLowerCase();
  if (unit === "m") {
    // Explicit minutes
    const minutes = Math.round(num);
    if (minutes <= 0) {
      return {
        valid: false,
        minutes: 0,
        interpretedText: "",
        error: "Duration must be at least 1 minute",
      };
    }
    return {
      valid: true,
      minutes,
      interpretedText: minutes === 1 ? "1 min" : `${minutes} mins`,
    };
  } else {
    // Numeric value without unit means HOURS
    const minutes = Math.round(num * 60);
    const hoursLabel = num === 1 ? "1 hour" : `${num} hours`;
    return {
      valid: true,
      minutes,
      interpretedText: `${hoursLabel} (${minutes}m)`,
    };
  }
}

/**
 * Formats stored minutes into a clean, concise input string.
 * Whole hours -> "1", "2"
 * Clean decimal hours -> "1.5", "0.5"
 * Other minutes -> "45m", "15m"
 */
export function formatMinutesForInput(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (minutes % 60 === 0) {
    return String(minutes / 60);
  }
  const hours = minutes / 60;
  const fixed = Number(hours.toFixed(2));
  if (Math.round(fixed * 60) === minutes && hours <= 24) {
    return String(fixed);
  }
  return `${minutes}m`;
}
