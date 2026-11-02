import { describe, it, expect } from "vitest";
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  validateAvatarFile,
  getInitials,
} from "../lib/os/avatar";
import { initialState } from "../lib/os/seed";
import { migrateOSState } from "../lib/os/reviews/migrations";

describe("Profile Identity & Avatar Management", () => {
  it("defines standard allowed avatar formats and 5MB size limit", () => {
    expect(ALLOWED_AVATAR_TYPES).toContain("image/png");
    expect(ALLOWED_AVATAR_TYPES).toContain("image/jpeg");
    expect(ALLOWED_AVATAR_TYPES).toContain("image/webp");
    expect(ALLOWED_AVATAR_TYPES).toContain("image/svg+xml");
    expect(MAX_AVATAR_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("validates supported and unsupported avatar file formats", () => {
    // Valid PNG file
    const validPng = new File(["dummy content"], "avatar.png", {
      type: "image/png",
    });
    expect(validateAvatarFile(validPng)).toEqual({ valid: true });

    // Valid JPEG file
    const validJpg = new File(["dummy content"], "avatar.jpg", {
      type: "image/jpeg",
    });
    expect(validateAvatarFile(validJpg)).toEqual({ valid: true });

    // Valid SVG file
    const validSvg = new File(["<svg></svg>"], "avatar.svg", {
      type: "image/svg+xml",
    });
    expect(validateAvatarFile(validSvg)).toEqual({ valid: true });

    // Unsupported PDF file
    const invalidPdf = new File(["dummy pdf"], "document.pdf", {
      type: "application/pdf",
    });
    const pdfCheck = validateAvatarFile(invalidPdf);
    expect(pdfCheck.valid).toBe(false);
    expect(pdfCheck.error).toContain("Unsupported image format");

    // Unsupported executable or text file
    const invalidTxt = new File(["hello"], "note.txt", { type: "text/plain" });
    expect(validateAvatarFile(invalidTxt).valid).toBe(false);
  });

  it("prevents excessively large image uploads (> 5MB)", () => {
    // Create mock file over 5MB
    const bigFile = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });

    const check = validateAvatarFile(bigFile);
    expect(check.valid).toBe(false);
    expect(check.error).toContain("Image file is too large");
  });

  it("generates correct fallback initials for single and multi-word names", () => {
    expect(getInitials("Yash")).toBe("YA");
    expect(getInitials("Yash Tyagi")).toBe("YT");
    expect(getInitials("Alex")).toBe("AL");
    expect(getInitials("Satya Nadella")).toBe("SN");
    expect(getInitials("")).toBe("Y");
    expect(getInitials("   ")).toBe("Y");
  });

  it("initializes initialState with userAvatar as null", () => {
    expect(initialState.userAvatar).toBeNull();
  });

  it("migrates legacy states and preserves userAvatar correctly", () => {
    // Legacy state without userAvatar
    const legacyWithoutAvatar = {
      ...initialState,
      userAvatar: undefined,
    };
    const migrated1 = migrateOSState(legacyWithoutAvatar);
    expect(migrated1.userAvatar).toBeNull();

    // State with custom data URL userAvatar
    const customAvatar =
      "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2wAA";
    const stateWithAvatar = {
      ...initialState,
      userAvatar: customAvatar,
    };
    const migrated2 = migrateOSState(stateWithAvatar);
    expect(migrated2.userAvatar).toBe(customAvatar);
  });
});
