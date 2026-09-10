"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logClientError } from "@/lib/client-logger";
import type { UploadPurpose } from "@/lib/validations/uploads";

type ImageUploadPurpose = Extract<UploadPurpose, "avatar" | "clinic_logo" | "patient_photo">;

type CloudinaryImageUploadProps = {
  purpose: ImageUploadPurpose;
  label: string;
  currentUrl?: string | null;
  onUploaded: (result: {
    url: string;
    publicId: string;
    mimeType: string;
  }) => void | Promise<void>;
  disabled?: boolean;
};

/**
 * Reusable authenticated uploader for avatars, clinic logos, and patient photos.
 * Posts multipart file to /api/uploads then notifies the parent to persist the URL.
 */
export function CloudinaryImageUpload({
  purpose,
  label,
  currentUrl,
  onUploaded,
  disabled,
}: CloudinaryImageUploadProps) {
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      await onUploaded({
        url: payload.url,
        publicId: payload.publicId,
        mimeType: payload.mimeType,
      });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      logClientError("Cloudinary image upload failed", error);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          className="h-16 w-16 rounded-full object-cover border"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-neutral-100 border flex items-center justify-center">
          <Upload className="h-5 w-5 text-neutral-400" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          disabled={disabled || loading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? "Uploading…" : label}
        </Button>
      </div>
    </div>
  );
}
