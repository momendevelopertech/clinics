import { createHash, randomBytes } from "crypto";
import { logServerError } from "./safe-logger";

// ---- Token hashing helpers (used for email verification & password reset) ----
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensEqual(a: string, b: string): boolean {
  return hashToken(a) === b;
}

export type EmailResult = {
  success: boolean;
  messageId?: string | null;
  devUrl?: string | null;
  error?: string | null;
};

type SendAuthEmailParams = {
  to: string;
  subject: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
};

/**
 * Sends an email with graceful degradation:
 * - When SMTP/SendGrid/Resend credentials exist, sends a real email.
 * - Otherwise falls back to logging the link to the server console (dev mode)
 *   so the flow still works locally without an email provider.
 */
export async function sendAuthEmail({
  to,
  subject,
  body,
  ctaUrl,
  ctaLabel,
}: SendAuthEmailParams): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "console";

  if (provider === "console" || provider === "log" || provider === "none") {
    console.log(`[auth-email] to=${to} subject="${subject}" link=${ctaUrl}`);
    return { success: true, messageId: null, devUrl: ctaUrl };
  }

  try {
    // SMTP via nodemailer when EMAIL_HOST etc. are configured.
    if (provider === "smtp") {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM || "HealthCRM <no-reply@healthcrm.local>",
        to,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#0b4a63">${subject}</h2>
            <p>${body}</p>
            <p style="margin:24px 0">
              <a href="${ctaUrl}" style="display:inline-block;background:#0b6e8f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">
                ${ctaLabel}
              </a>
            </p>
            <p style="color:#667;font-size:12px">If the button above does not work, copy this link into your browser: <br/><a href="${ctaUrl}">${ctaUrl}</a></p>
          </div>
        `,
        text: `${body}\n\n${ctaLabel}: ${ctaUrl}`,
      });

      return { success: true, messageId: result.messageId };
    }

    // Resend
    if (provider === "resend") {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return {
          success: false,
          error: "RESEND_API_KEY is not configured",
          devUrl: ctaUrl,
        };
      }
      // Optional provider: package is only needed when EMAIL_PROVIDER=resend.
      // @ts-expect-error - "resend" is an optional dependency; absence falls back to console logging.
      const resendModule = await import("resend");
      const resend = new resendModule.Resend(resendKey);
      const { data } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "HealthCRM <onboarding@resend.dev>",
        to: [to],
        subject,
        html: `
          <h2>${subject}</h2>
          <p>${body}</p>
          <p><a href="${ctaUrl}">${ctaLabel}</a></p>
          <p style="color:#667;font-size:12px"><a href="${ctaUrl}">${ctaUrl}</a></p>
        `,
      });
      return { success: true, messageId: data?.id };
    }

    console.log(`[auth-email] unknown provider "${provider}", link=${ctaUrl}`);
    return { success: true, messageId: null, devUrl: ctaUrl };
  } catch (error) {
    logServerError("Failed to send auth email, falling back to console", error);
    return { success: false, messageId: null, devUrl: ctaUrl, error: "send_failed" };
  }
}

/**
 * Builds an absolute URL for app routes (handles NEXTAUTH_URL / local dev).
 */
export function getAppUrl() {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}