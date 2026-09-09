import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveRateLimitRule, takeRateLimitToken } from "@/lib/rate-limit";

const PUBLIC_PAGE_PREFIXES = [
  "/",
  "/login",
  "/demo-accounts",
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

const CLINIC_PAGE_ACCESS: Record<string, string[]> = {
  "/plan": ["Owner"],
  "/settings": ["Owner"],
  "/automation": ["Owner"],
  "/campaigns": ["Owner"],
  "/queue": ["Doctor", "Nurse", "Receptionist"],
  "/encounters": ["Doctor", "Nurse"],
  "/analytics": ["Doctor", "Nurse", "Biller"],
  "/consents": ["Doctor", "Nurse", "Receptionist"],
  "/audit": ["Doctor", "Biller"],
  "/labs": ["Doctor", "Nurse", "Pharmacist"],
  "/tasks": ["Doctor", "Nurse", "Receptionist", "Biller", "Pharmacist"],
  "/documents": ["Doctor", "Nurse", "Receptionist"],
  "/reports": ["Doctor", "Nurse", "Biller"],
  "/availability": ["Doctor", "Nurse"],
  "/catalogs": ["Doctor", "Nurse", "Pharmacist"],
  "/communications": ["Receptionist"],
  "/locations": ["Receptionist"],
  "/waitlist": ["Receptionist"],
  "/billing": ["Biller"],
  "/payments": ["Biller"],
  "/inventory": ["Nurse", "Pharmacist"],
};

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

function clinicPageAllowed(pathname: string, roles: string[]) {
  const match = Object.entries(CLINIC_PAGE_ACCESS).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!match) return true;
  if (roles.includes("Owner") || roles.includes("Super Admin")) return true;
  const displayRoles = roles.map((role) =>
    role === "Care Coordinator" ? "Receptionist" : role,
  );
  return match[1].some((role) => displayRoles.includes(role));
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

async function maybeRateLimitRequest(request: NextRequest, tokenUserId?: string) {
  const rule = resolveRateLimitRule(
    request.nextUrl.pathname,
    request.method,
    getClientKey(request),
    tokenUserId,
  );
  if (!rule) {
    return null;
  }
  return takeRateLimitToken(rule.key, rule.config);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isHttps = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    // NextAuth derives the cookie name from NEXTAUTH_URL (e.g. a dev
    // "http://localhost:3000" baked into the Edge bundle) which flips the
    // prefix to "next-auth.session-token" even though the app sets
    // "__Secure-next-auth.session-token" on https. Pass the flag explicitly so
    // the Edge middleware always reads the cookie the app actually writes.
    secureCookie: isHttps,
  });
  const rateLimit = await maybeRateLimitRequest(
    request,
    token?.id as string | undefined,
  );

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
    return NextResponse.redirect(
      new URL(
        (token.roles as string[] | undefined)?.includes("Super Admin")
          ? "/super"
          : "/dashboard",
        request.url,
      ),
    );
  }

  if (isPublicPage(pathname) || isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (token) {
    if (
      (token.roles as string[] | undefined)?.includes("Super Admin") &&
      !pathname.startsWith("/super") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/super", request.url));
    }
    if (!pathname.startsWith("/api/") && !clinicPageAllowed(pathname, (token.roles as string[] | undefined) ?? [])) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname === "/" ? "/dashboard" : pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|og-image.png).*)",
  ],
};