# OpenHealthCRM — PWA Conversion Analysis & Plan

> Last updated: 2026-09-10

---

## 1. Project Overview

| Aspect | Detail |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `src/` dir) |
| UI | React 19, Tailwind v4, shadcn/Radix, framer-motion |
| Auth | next-auth v4 (JWT, Credentials) |
| DB | Prisma 7 + PostgreSQL (Neon via `@prisma/adapter-pg` Pool) |
| i18n | Arabic/English, RTL/LTR, cookie-persisted locale |
| Multi-tenant | Organization-scoped, RBAC (8 roles) |
| Deploy | Vercel (primary) + Docker |
| Icons | lucide-react |
| Dashboard | 27 modules (patients, appointments, billing, inventory, labs, encounters, prescriptions, etc.) |
| Public pages | Landing (`/`), Login, Signup, Forgot/Reset Password, Patient Portal, Super Admin |
| API routes | 38 route groups under `src/app/api/` |

---

## 2. Current State vs. PWA Requirements

| PWA Requirement | Status | Action Needed |
|---|---|---|
| HTTPS | Yes (Vercel auto) | None |
| Web App Manifest | **Missing** | Create `manifest.json` |
| Service Worker | **Missing** | Add SW via `next-pwa` or Serwist |
| Offline Support | **None** | Cache strategy for dashboard shell + API fallback |
| Install Prompt | **None** | `beforeinstallprompt` handling |
| App Icons (all sizes) | **Partial** (favicon.ico + apple-touch-icon.png only) | Generate 192px, 512px, maskable variants |
| Theme Color | CSS vars exist, no meta tag | Add `<meta name="theme-color">` |
| Splash Screen | **Missing** | Derive from manifest |
| Push Notifications | **None** (optional, high value) | Web Push API + VAPID keys |
| Background Sync | **None** (optional) | Queue failed mutations when offline |

---

## 3. Recommended Approach: `next-pwa` by `shadowwalker`

### Why `next-pwa`

1. **First-class Next.js 16 support** — works with App Router, `src/` dir, and `next.config.ts`
2. **Minimal config** — 5 lines in `next.config.ts`
3. **Auto service worker** — generates SW at build time with Workbox under the hood
4. **Cache strategies built-in** — stale-while-revalidate for static assets, network-first for API
5. **PWA manifest integration** — can generate manifest from config
6. **Active maintenance** — most downloaded PWA package for Next.js (~500k/week)

### Alternatives Considered

| Option | Verdict |
|---|---|
| **Serwist** (by Workbox team) | More powerful but heavier setup; better for complex offline-first apps. Overkill for this CRM. |
| **vite-plugin-pwa** | Vite-only, incompatible with Next.js. |
| **Manual Workbox setup** | Maximum control but 3-5x more code. Not worth it for a SaaS dashboard. |
| **`@ducanh2912/next-pwa`** | Fork of next-pwa with Next 14+ fixes. Good fallback if next-pwa lags behind Next 16. |

---

## 4. Implementation Plan

### Phase 1: Core PWA (1-2 hours)

#### 4.1 Install Dependencies

```bash
npm install next-pwa
```

#### 4.2 Create App Icons

Generate from a single 512x512 source image:

| File | Size | Purpose |
|---|---|---|
| `public/icons/icon-192x192.png` | 192x192 | Android home screen |
| `public/icons/icon-512x512.png` | 512x512 | Android splash / Play Store |
| `public/icons/icon-maskable-512x512.png` | 512x512 | Maskable (safe zone) |
| `public/apple-touch-icon.png` | 180x180 | iOS home screen (already exists, verify size) |

Tool: [maskable.app](https://maskable.app) or `pwa-asset-generator` CLI.

#### 4.3 Create `public/manifest.json`

```json
{
  "name": "Healthcare CRM",
  "short_name": "HealthCRM",
  "description": "Patient, Appointment & Billing Management",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#f8f9fa",
  "theme_color": "#0891b2",
  "orientation": "any",
  "lang": "en",
  "dir": "auto",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

#### 4.4 Update `next.config.ts`

```typescript
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 100, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static\/css\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-css",
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "radix-ui",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-popover",
      "@radix-ui/react-separator",
      "date-fns",
    ],
  },
};

export default withPWA(nextConfig);
```

#### 4.5 Update `src/app/layout.tsx`

Add manifest link and theme-color meta:

```tsx
export const metadata: Metadata = {
  // ... existing metadata ...
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0891b2" },
    { media: "(prefers-color-scheme: dark)", color: "#0891b2" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HealthCRM",
  },
  formatDetection: {
    telephone: false,
  },
};
```

#### 4.6 Install Prompt Handler

Create `src/hooks/use-pwa-install.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, install };
}
```

---

### Phase 2: Offline Strategy (2-3 hours)

#### Cache Strategy Decision Matrix

| Route/Resource | Strategy | Rationale |
|---|---|---|
| Static assets (`/_next/static/*`) | **CacheFirst** | Immutable hashes, safe to cache forever |
| CSS/JS bundles | **CacheFirst** | Same as above |
| Fonts | **CacheFirst** | Rarely change |
| Images | **CacheFirst** | Static assets |
| API routes (`/api/*`) | **NetworkFirst** | Always try fresh data, fall back to cache |
| Dashboard shell (HTML) | **StaleWhileRevalidate** | Show cached UI immediately, update in background |
| Landing page | **NetworkFirst** | Marketing content should be fresh |
| Login/Signup | **NetworkOnly** | Auth must be real-time |

#### Offline Fallback Page

Create `public/offline.html` — a minimal page shown when both network and cache miss:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — Healthcare CRM</title>
  <style>
    body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; color: #1a1a1a; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #6b7280; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>Please check your internet connection and try again.</p>
  </div>
</body>
</html>
```

---

### Phase 3: Push Notifications (Optional, 3-4 hours)

| Component | Implementation |
|---|---|
| VAPID Keys | Generate with `web-push` CLI or `npx web-push generate-vapid-keys` |
| Backend | New API route `src/app/api/notifications/push/route.ts` |
| Subscription Store | New Prisma model `PushSubscription { id, userId, endpoint, keys, createdAt }` |
| SW Listener | `push` event in SW to show notifications |
| UI | Bell icon in sidebar with permission request flow |

**Best for:** Appointment reminders, task assignments, lab results ready.

---

## 5. SaaS-Specific PWA Considerations

### Multi-Tenant Cache Isolation

```
Cache keys must be scoped by organizationId to prevent cross-tenant data leakage in shared browser caches.
```

- Service Worker cache names should include org prefix: `crm-api-{orgId}`
- On logout, clear all CRM caches: `caches.keys().then(keys => keys.filter(k => k.startsWith('crm-')).forEach(k => caches.delete(k)))`

### Auth Token Handling

- next-auth JWT is stored in httpOnly cookie — safe from XSS
- SW should NOT cache auth responses
- On token expiry (401), invalidate API cache and redirect to `/login`

### i18n Offline

- Both Arabic and English dictionaries are bundled at build time (~1090 keys each)
- Already cached via `_next/static` — no additional work needed

### Plan/Entitlement Gating

- Entitlement checks happen server-side — offline mode cannot verify plan limits
- **Recommendation:** Show cached entitlements but disable mutations (billing, plan changes) when offline

---

## 6. File Changes Summary

| File | Action | Description |
|---|---|---|
| `package.json` | Edit | Add `next-pwa` dependency |
| `next.config.ts` | Edit | Wrap with PWA config |
| `public/manifest.json` | **Create** | Web App Manifest |
| `public/icons/` | **Create** | 192px, 512px, maskable icons |
| `public/offline.html` | **Create** | Offline fallback page |
| `src/app/layout.tsx` | Edit | Add manifest link, theme-color meta |
| `src/hooks/use-pwa-install.ts` | **Create** | Install prompt hook |
| `src/components/pwa/install-banner.tsx` | **Create** | Optional install CTA banner |
| `src/lib/pwa/cache-clear.ts` | **Create** | Logout cache cleanup utility |

---

## 7. Build & Verification Checklist

```bash
# 1. Install
npm install next-pwa

# 2. Build
npm run build

# 3. Verify SW registered
# Open DevTools → Application → Service Workers → should show active SW

# 4. Verify manifest
# DevTools → Application → Manifest → should show all fields

# 5. Lighthouse audit
npx lighthouse http://localhost:3000 --view  # Target: PWA badge = green

# 6. Test offline
# DevTools → Network → Offline → navigate dashboard → should show cached shell

# 7. Test install
# DevTools → Application → Manifest → "Install" button should appear
```

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stale cached API data | Clinical data could be outdated | NetworkFirst for all API routes; show "last synced" timestamp |
| Cache size growth | Mobile storage limits (~50MB) | Auto-cleanup after 7 days; max 100 API responses |
| SW update conflicts | User sees old UI after deploy | `skipWaiting: true` + `clientsClaim: true` for instant activation |
| Auth bypass via cache | Security: cached pages behind auth | SW must not cache authenticated HTML; only static assets |
| Neon cold starts + offline | DB unreachable offline | Graceful degradation: show cached read-only data, block writes |

---

## 9. Priority Order

1. **Phase 1 (Core PWA)** — manifest + icons + SW + install prompt → **ship this week**
2. **Phase 2 (Offline)** — cache strategies + offline page → **next sprint**
3. **Phase 3 (Push)** — notifications for appointments/tasks → **feature request**

---

*Generated for OpenHealthCRM by automated project analysis.*
