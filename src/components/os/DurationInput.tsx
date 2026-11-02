import { useEffect, useState } from "react";
import { formatMinutesForInput, parseDurationInput } from "@/lib/os/duration";
import { cn } from "@/lib/utils";

interface DurationInputProps {
  value: number; // Duration in minutes
  onChange: (minutes: number) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export function DurationInput({
  value,
  onChange,
  className,
  placeholder = "e.g. 1.5 or 45m",
  ariaLabel = "Duration",
}: DurationInputProps) {
  const [text, setText] = useState(() => formatMinutesForInput(value));
  const [focused, setFocused] = useState(false);

  // Sync external changes when not focused
  useEffect(() => {
    if (!focused) {
      setText(formatMinutesForInput(value));
    }
  }, [value, focused]);

  const parsed = parseDurationInput(text);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextText = e.target.value;
    setText(nextText);
    const result = parseDurationInput(nextText);
    if (result.valid) {
      onChange(result.minutes);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const result = parseDurationInput(text);
    if (result.valid) {
      onChange(result.minutes);
    } else {
      // Revert to current valid value if input was left invalid/empty
      setText(formatMinutesForInput(value));
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="text"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-xl border bg-secondary/60 pl-3 pr-20 text-xs font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30",
          parsed.valid
            ? "border-input focus:border-ring"
            : "border-destructive text-destructive focus:border-destructive focus:ring-destructive/20",
        )}
      />
      <div className="pointer-events-none absolute right-2 flex items-center">
        {parsed.valid ? (
          <span className="rounded-lg bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {parsed.interpretedText}
          </span>
        ) : (
          <span className="rounded-lg bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            {parsed.error || "Invalid"}
          </span>
        )}
      </div>
    </div>
  );
}
