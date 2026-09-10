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
      className="rounded-[16px] border border-white/55 bg-white/60 dark:border-white/6 dark:bg-white/[0.03]"
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
