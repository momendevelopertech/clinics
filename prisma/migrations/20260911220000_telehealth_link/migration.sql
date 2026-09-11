-- P1#5: telehealth coordination. ADDITIVE ONLY — one nullable column.
-- Staff attach their own meeting link (Meet/Zoom) to telehealth visits;
-- patients get a Join button in the portal and the link in reminders.
-- Managed in-app video (Daily/Twilio SFU) needs vendor keys — tracked
-- separately (F-B5); no fake video room is ever generated here.

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "telehealthUrl" TEXT;
