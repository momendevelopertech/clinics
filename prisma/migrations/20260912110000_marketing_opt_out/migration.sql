-- Marketing consent flag for patients (WhatsApp/SMS campaign opt-out).
-- Default false = not opted out; outreach filters on this column.
ALTER TABLE "Patient" ADD COLUMN "marketingOptOut" BOOLEAN NOT NULL DEFAULT false;