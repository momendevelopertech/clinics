"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { usePostActionGuidance } from "@/hooks/use-post-action-guidance";
import { logClientError } from "@/lib/client-logger";
import type { Dictionary } from "@/lib/i18n/locale";

export function SendRxButton({
  rxId,
  t,
}: {
  rxId: string;
  t: Dictionary;
}) {
  const { triggerGuidance } = usePostActionGuidance();
  const [channel, setChannel] = React.useState<"sms" | "whatsapp">("whatsapp");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    setSending(true);
    try {
      const r = await fetch(`/api/prescriptions/${rxId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.ok !== true) {
        throw new Error(data.error || "Send failed");
      }
      triggerGuidance("prescription_created", t["rx_sent"]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      logClientError("Send prescription failed", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <SearchableSelect
        value={channel}
        onValueChange={(v) => setChannel(v as "sms" | "whatsapp")}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "sms", label: "SMS" },
        ]}
        ariaLabel={String(t["rx_send"])}
        triggerClassName="h-8 w-auto min-w-32 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
      />
      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void send()} disabled={sending}>
        <Send className="h-3.5 w-3.5" />
        {t["rx_send"]}
      </Button>
    </div>
  );
}