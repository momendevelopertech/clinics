-- P0#6: TOTP two-factor auth on staff accounts. ADDITIVE ONLY — four
-- nullable/defaulted columns on "User". Existing rows get
-- totpEnabled = false (2FA off, login flow unchanged) and NULL secrets.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT,
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpBackupCodes" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3);
