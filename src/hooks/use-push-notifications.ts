"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function currentPermission(): NotificationPermission {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "default";
}

export function usePushNotifications() {
  const [isSupported] = useState(isPushSupported);
  const [permission] = useState<NotificationPermission>(currentPermission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    let cancelled = false;

    navigator.serviceWorker
      .ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub);
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || loading) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ) as unknown as BufferSource,
      });

      const subJson = sub.toJSON();
      await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
        }),
      });
      setIsSubscribed(true);
    } catch (error) {
      console.error("Push subscription failed:", error);
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || loading) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}