-- Dedicated check-in / check-out timestamps for reception workflows.
ALTER TABLE "Appointment" ADD COLUMN "checkedInAt" TIMESTAMPTZ;
ALTER TABLE "Appointment" ADD COLUMN "checkedOutAt" TIMESTAMPTZ;