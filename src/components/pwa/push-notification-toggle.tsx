"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="h-9 w-9 rounded-md border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={
        isSubscribed ? "Disable notifications" : "Enable notifications"
      }
    >
      {isSubscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </Button>
  );
}
