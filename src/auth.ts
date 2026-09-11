import { prisma } from "@/lib/prisma";
import { verifyPasswordHash } from "@/lib/password";
import {
  consumeBackupCode,
  decryptTotpSecret,
  parseBackupHashes,
  verifyTotpToken,
} from "@/lib/two-factor";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

function getLocalhostAwareAuthUrl() {
  const configuredAuthUrl = process.env.NEXTAUTH_URL?.trim();

  if (process.env.NODE_ENV === "production") {
    // In production we must never force a localhost/plain-http URL: NextAuth v4
    // uses it to compute the session cookie's host + secure flag, and a wrong
    // value makes the auth middleware/proxy reject the cookie and loop back to
    // /login?callbackUrl=... . If the injected value is not a real https origin
    // (or is missing), leave NEXTAUTH_URL unset so NextAuth infers it from the
    // request origin (Vercel auto-inflates it during the build).
    if (!configuredAuthUrl) {
      return undefined;
    }
    try {
      const parsed = new URL(configuredAuthUrl);
      const isLocalhost =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "0.0.0.0";
      if (parsed.protocol !== "https:" || isLocalhost) {
        return undefined;
      }
    } catch {
      return undefined;
    }
    return configuredAuthUrl;
  }

  const port = process.env.PORT?.trim() || "3000";

  if (!configuredAuthUrl) {
    return `http://localhost:${port}`;
  }

  try {
    const parsedUrl = new URL(configuredAuthUrl);
    const isLocalhost =
      parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

    if (isLocalhost && parsedUrl.port !== port) {
      parsedUrl.port = port;
      const normalized = parsedUrl.toString();
      return parsedUrl.pathname === "/"
        ? normalized.replace(/\/$/, "")
        : normalized;
    }
  } catch {
    return configuredAuthUrl;
  }

  return configuredAuthUrl;
}

const resolvedAuthUrl = getLocalhostAwareAuthUrl();

if (resolvedAuthUrl) {
  process.env.NEXTAUTH_URL = resolvedAuthUrl;
}

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  roles: string[];
};

function isDevelopmentPlaceholderPassword(
  storedPassword: string | null,
  candidatePassword: string,
) {
  return (
    process.env.NODE_ENV !== "production" &&
    storedPassword === "hashed_password_placeholder" &&
    candidatePassword === "admin123"
  );
}

function isPasswordValid(
  storedPassword: string | null,
  candidatePassword: string,
) {
  return (
    verifyPasswordHash(storedPassword, candidatePassword) ||
    isDevelopmentPlaceholderPassword(storedPassword, candidatePassword)
  );
}

async function authenticateUser(
  email: string,
  password: string,
  totpToken?: string,
): Promise<AuthenticatedUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      organization: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || !user.organizationId || !isPasswordValid(user.passwordHash, password)) {
    return null;
  }

  // Tenant lifecycle gating: pending/suspended orgs and inactive staff are blocked.
  const orgStatus = user.organization?.status ?? "active";
  if (orgStatus !== "active") {
    return null;
  }

  if (user.active === false) {
    return null;
  }

  // Second factor: accounts with TOTP enabled must present a current code
  // (or an unused backup code, consumed on success). No code at all surfaces
  // as a distinct 2FA_REQUIRED error so the login UI can prompt for it;
  // a wrong code fails closed as a generic credentials error.
  if (user.totpEnabled) {
    const secret = decryptTotpSecret(user.totpSecret);
    if (!totpToken?.trim()) {
      throw new Error("2FA_REQUIRED");
    }
    const tokenOk = secret ? verifyTotpToken(secret, totpToken) : false;
    if (!tokenOk) {
      const consumed = consumeBackupCode(
        parseBackupHashes(user.totpBackupCodes),
        totpToken,
      );
      if (!consumed) {
        return null;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { totpBackupCodes: JSON.stringify(consumed) },
      });
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    roles: user.userRoles.map(
      (entry: { role: { name: string } }) => entry.role.name,
    ),
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpToken: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        return authenticateUser(email, password, credentials?.totpToken);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.roles = user.roles;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.organizationId = token.organizationId ?? "";
        session.user.roles = token.roles ?? [];
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
