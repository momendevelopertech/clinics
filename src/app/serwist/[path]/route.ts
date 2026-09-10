import { createSerwistRoute } from "@serwist/turbopack";

// Vercel strips .git (see .vercelignore), so `git rev-parse` fails at build
// time. Use the commit SHA injected by Vercel when available.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.NEXT_PUBLIC_COMMIT_SHA?.trim() ||
  "v1";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
