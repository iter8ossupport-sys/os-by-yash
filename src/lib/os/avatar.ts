export const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateAvatarFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return {
      valid: false,
      error:
        "Unsupported image format. Please upload a PNG, JPEG, WebP, or SVG file.",
    };
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return {
      valid: false,
      error: "Image file is too large. Maximum allowed size is 5MB.",
    };
  }

  return { valid: true };
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "Y";
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase() || "Y";
  }
  const last = parts[parts.length - 1] ?? "";
  const firstChar = first[0] ?? "";
  const lastChar = last[0] ?? "";
  return (firstChar + lastChar).toUpperCase() || "Y";
}

/**
 * Optimizes an uploaded avatar image into a lightweight data URL:
 * - Square crop from center
 * - Resized to max dimension (default 256px)
 * - Compressed as WebP / JPEG
 * Keeps localStorage footprint small (~15-30KB) and avoids hitting quota limits.
 */
export async function processAvatarFile(
  file: File,
  targetSize = 256,
): Promise<string> {
  const check = validateAvatarFile(file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      // SVGs don't need raster downscaling
      if (file.type === "image/svg+xml" || typeof document === "undefined") {
        return resolve(rawDataUrl);
      }

      const img = new Image();
      img.onerror = () =>
        reject(new Error("Unable to parse image data. File may be corrupted."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(rawDataUrl);
          }

          // Center-crop to 1:1 square
          const minSide = Math.min(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
          );
          const sx = ((img.naturalWidth || img.width) - minSide) / 2;
          const sy = ((img.naturalHeight || img.height) - minSide) / 2;

          const dimension = Math.min(targetSize, Math.max(minSide, 64));
          canvas.width = dimension;
          canvas.height = dimension;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            dimension,
            dimension,
          );

          const webp = canvas.toDataURL("image/webp", 0.85);
          if (
            webp.startsWith("data:image/webp") ||
            webp.startsWith("data:image/png")
          ) {
            resolve(webp);
          } else {
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          }
        } catch {
          // Canvas failure fallback
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
