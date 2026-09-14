"use client";

import * as React from "react";
import { CloudinaryImageUpload } from "@/components/uploads/cloudinary-image-upload";
import { logClientError } from "@/lib/client-logger";

type ProfileAvatarCardProps = {
  title: string;
  description: string;
  uploadLabel: string;
};

export function ProfileAvatarCard({
  title,
  description,
  uploadLabel,
}: ProfileAvatarCardProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/avatar")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.avatarUrl) setAvatarUrl(payload.avatarUrl);
      })
      .catch((error) => logClientError("Load avatar failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const persistAvatar = async (result: {
    url: string;
    publicId: string;
    mimeType: string;
  }) => {
    const response = await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarUrl: result.url,
        publicId: result.publicId,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to save avatar");
    }
    setAvatarUrl(result.url);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <CloudinaryImageUpload
        purpose="avatar"
        label={uploadLabel}
        currentUrl={avatarUrl}
        onUploaded={persistAvatar}
      />
    </div>
  );
}
