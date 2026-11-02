import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/os/avatar";

export interface ProfileAvatarProps {
  src?: string | null | undefined;
  name?: string | undefined;
  size?: "sm" | "md" | "lg" | "xl" | undefined;
  className?: string | undefined;
  ring?: boolean | undefined;
}

const SIZE_MAP = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-24 w-24 text-2xl",
};

export function ProfileAvatar({
  src,
  name = "Yash",
  size = "md",
  className,
  ring = true,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full font-semibold select-none transition-all duration-200",
        sizeClasses,
        ring && "ring-2 ring-glass-border shadow-md",
        className,
      )}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name ? `${name}'s avatar` : "Profile avatar"}
          className="h-full w-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
          {initials ? (
            <span>{initials}</span>
          ) : (
            <User className="h-1/2 w-1/2 opacity-80" />
          )}
        </div>
      )}
    </div>
  );
}
