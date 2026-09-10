-- Persist Cloudinary public_ids for lifecycle cleanup (P2: Cloudinary & Media).
-- Additive nullable columns only; existing rows untouched.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarPublicId" TEXT;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
