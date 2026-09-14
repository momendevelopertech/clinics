"use client";

import { ExternalLink } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Direct file URL (signed downloadUrl or external storage URL). */
  url: string | null;
};

/**
 * Shared in-place file preview: every "view" action opens here instead of a
 * new browser tab (invoices/reports print flows stay separate tabs).
 * Falls back to an explicit new-tab link for hosts that refuse embedding.
 */
export function FilePreviewDialog({ open, onOpenChange, title, url }: FilePreviewDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>
        {url ? (
          <iframe
            src={url}
            title={title}
            className="h-[70vh] w-full rounded-md border border-border bg-background"
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("common_noFile")}
          </p>
        )}
        <DialogFooter className="sm:justify-between">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t("common_openInNewTab")}
            </a>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common_close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
