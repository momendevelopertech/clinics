/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __crmOrgId?: string;
};

const SENSITIVE_API_PATTERNS = [
  /\/api\/patients/,
  /\/api\/encounters/,
  /\/api\/labs/,
  /\/api\/prescriptions/,
  /\/api\/billing/,
  /\/api\/payments/,
  /\/api\/insurance/,
  /\/api\/vitals/,
  /\/api\/documents/,
  /\/api\/clinical-orders/,
  /\/api\/lab-orders/,
  /\/api\/procedure-orders/,
];

const SAFE_API_PATTERNS = [
  /\/api\/org\//,
  /\/api\/settings/,
  /\/api\/catalogs/,
  /\/api\/rooms/,
  /\/api\/branches/,
];

const AUTH_ONLY_PATTERNS = [
  /^\/login/,
  /^\/signup/,
  /^\/forgot-password/,
  /^\/reset-password/,
  /^\/verify-email/,
  /^\/patient-login/,
  /^\/api\/auth\//,
];

function matchesAny(url: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(url));
}

function tenantKey(baseKey: string): string {
  const org = self.__crmOrgId;
  return org ? `${baseKey}::org:${org}` : baseKey;
}

const tenantScopePlugin: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
    return tenantKey(request.url);
  },
};

function getRuntimeCaching() {
  return [
    {
      matcher: ({
        url,
        sameOrigin,
      }: {
        url: URL;
        sameOrigin: boolean;
      }) => sameOrigin && matchesAny(url.pathname, AUTH_ONLY_PATTERNS),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({
        request,
        url,
        sameOrigin,
      }: {
        request: Request;
        url: URL;
        sameOrigin: boolean;
      }) => {
        if (!sameOrigin || request.method !== "GET") return false;
        if (matchesAny(url.pathname, AUTH_ONLY_PATTERNS)) return false;
        if (matchesAny(url.pathname, SENSITIVE_API_PATTERNS)) return false;
        if (matchesAny(url.pathname, SAFE_API_PATTERNS)) return true;
        if (url.pathname.startsWith("/api/")) return true;
        return false;
      },
      handler: new NetworkFirst({
        cacheName: "crm-api-safe",
        plugins: [
          tenantScopePlugin,
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
        networkTimeoutSeconds: 5,
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
      }: {
        request: Request;
        sameOrigin: boolean;
      }) =>
        sameOrigin &&
        request.mode === "navigate",
      handler: new StaleWhileRevalidate({
        cacheName: "crm-pages",
        plugins: [
          tenantScopePlugin,
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
      }: {
        request: Request;
        sameOrigin: boolean;
      }) =>
        sameOrigin &&
        (request.destination === "script" || request.destination === "style"),
      handler: new StaleWhileRevalidate({
        cacheName: "crm-static-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
      }: {
        request: Request;
        sameOrigin: boolean;
      }) => sameOrigin && request.destination === "image",
      handler: new CacheFirst({
        cacheName: "crm-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
      }: {
        request: Request;
        sameOrigin: boolean;
      }) => sameOrigin && request.destination === "font",
      handler: new CacheFirst({
        cacheName: "crm-fonts",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ];
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: true,
  runtimeCaching: getRuntimeCaching(),
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }: { request: Request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (!event.data) return;

  const data = event.data as {
    type?: string;
    orgId?: string;
  };

  if (data.type === "SET_ORG_CONTEXT" && data.orgId) {
    self.__crmOrgId = data.orgId;
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (data.type === "SYNC_MUTATIONS") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((client) =>
            client.postMessage({ type: "RUN_SYNC" })
          )
        );
      })()
    );
  }
});

self.addEventListener(
  "sync",
  ((event: Event & { tag?: string; waitUntil(p: Promise<unknown>): void }) => {
    if (event.tag !== "sync-mutations") return;
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((client) => client.postMessage({ type: "RUN_SYNC" }))
        );
      })()
    );
  }) as EventListener
);

self.addEventListener("push", (event: PushEvent) => {
  let data: {
    title?: string;
    body?: string;
    url?: string;
    orgId?: string;
  } = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "Vinova Clinic";
  const options: NotificationOptions = {
    body: data.body ?? "You have a new notification.",
    data: { url: data.url ?? "/" },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  let url = "/";
  if (event.notification.data?.url) {
    url = String(event.notification.data.url);
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }
    )
  );
});

serwist.addEventListeners();