import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { takeRateLimitToken } from "@/lib/rate-limit";

const PUBLIC_PAGE_PREFIXES = [
  "/",
  "/login",
  "/patient-login",
  "/patient-portal",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/suspended",
];
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/patient-auth",
  "/api/patient-portal",
  "/api/vitals/stream",
  "/api/communications/scheduled",
  "/api/communications/appointment-reminders",
  "/api/webhooks/stripe",
  "/api/signup",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

function isPublicPage(pathname: string) {
  return PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function maybeRateLimitRequest(request: NextRequest, tokenUserId?: string) {
  const { pathname } = request.nextUrl;
  const ip = getClientKey(request);

  if (pathname === "/api/signup") {
    return takeRateLimitToken(`signup:${ip}`, {
      max: 3,
      windowMs: 60 * 60 * 1000,
    });
  }

  const authRoute =
    pathname.startsWith("/api/auth") || pathname === "/api/patient-auth/login";
  if (authRoute) {
    return takeRateLimitToken(`auth:${ip}:${pathname}`, {
      max: 5,
      windowMs: 60_000,
    });
  }

  const highVolumeGetRoutes = new Set([
    "/api/patients",
    "/api/appointments",
    "/api/tasks",
    "/api/communications",
    "/api/waitlist",
    "/api/audit",
  ]);

  if (request.method === "GET" && highVolumeGetRoutes.has(pathname)) {
    return takeRateLimitToken(`list:${tokenUserId ?? ip}:${pathname}`, {
      max: 60,
      windowMs: 60_000,
    });
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const rateLimit = maybeRateLimitRequest(request, token?.id as string | undefined);

  if (rateLimit && !rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  if (
    (pathname === "/login" || pathname === "/signup") &&
    token
  ) {
    return NextResponse.redirect(new URL("/patients", request.url));
  }

  if (isPublicPage(pathname) || isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (token) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname === "/" ? "/patients" : pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|og-image.png).*)",
  ],
};