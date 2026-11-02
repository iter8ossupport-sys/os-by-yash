import { useRef, useState } from "react";
import { Camera, Check, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { useOS } from "@/lib/os/store";
import { processAvatarFile, validateAvatarFile } from "@/lib/os/avatar";
import { Button, Input, Label } from "@/components/os/ui";
import { ProfileAvatar } from "@/components/os/ProfileAvatar";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function ProfileSettings() {
  const { state, update } = useOS();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      e.target.value = "";
      return;
    }

    try {
      setIsProcessing(true);
      const dataUrl = await processAvatarFile(file, 256);
      setPreviewAvatar(dataUrl);
      toast.info("Image preview ready. Click 'Save Photo' to apply.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to process image";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  const handleSaveAvatar = () => {
    if (!previewAvatar) return;
    update((s) => ({ ...s, userAvatar: previewAvatar }));
    setPreviewAvatar(null);
    toast.success("Profile photo saved successfully");
  };

  const handleCancelPreview = () => {
    setPreviewAvatar(null);
    toast.info("Profile photo preview discarded");
  };

  const handleRemoveAvatar = () => {
    update((s) => ({ ...s, userAvatar: null }));
    setPreviewAvatar(null);
    toast.success("Profile photo removed");
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Profile & Identity"
        description="Manage your founder profile, circular avatar, and public identity across Yash OS."
        icon={User}
      />

      <div className="flex flex-col gap-6 rounded-2xl border border-glass-border/40 bg-secondary/20 p-5 sm:flex-row sm:items-center">
        <div className="relative flex shrink-0 justify-center">
          <ProfileAvatar
            src={previewAvatar || state.userAvatar}
            name={state.userName}
            size="xl"
            className={previewAvatar ? "ring-4 ring-cyan" : undefined}
          />
          {previewAvatar && (
            <span className="absolute -bottom-2 rounded-full bg-cyan px-2.5 py-0.5 text-[10px] font-semibold text-background shadow">
              Preview Mode
            </span>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">
              Profile Photo (Circular DP)
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Displayed in the application header and review documents. Supports
              PNG, JPG, WebP, or SVG up to 5MB. Automatically cropped and
              optimized offline.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {previewAvatar ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAvatar}
                  disabled={isProcessing}
                >
                  <Check className="h-4 w-4" />
                  Save Photo
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleCancelPreview}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Camera className="h-4 w-4" />
                  {state.userAvatar ? "Replace Photo" : "Upload Photo"}
                </Button>
                {state.userAvatar && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Photo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <Label>Your Name</Label>
          <Input
            value={state.userName}
            onChange={(e) =>
              update((s) => ({ ...s, userName: e.target.value }))
            }
            placeholder="e.g. Yash"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Used in dashboard greetings, header indicators, and generated
            PDF/print reports.
          </p>
        </div>

        <div className="rounded-xl border border-glass-border/40 bg-secondary/15 p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Identity Note: </span>
          The personal founder profile avatar is kept strictly independent from
          the Yash OS application brand logo.
        </div>
      </div>
    </div>
  );
}
