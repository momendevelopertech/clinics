-- Prevent duplicate inventory digests when cron runs overlap:
-- at most one in-app digest notification per recipient, per type, per day.
CREATE UNIQUE INDEX "Notification_digest_recipient_key"
  ON "Notification"("recipientId", "entityType", "entityId")
  WHERE "entityType" = 'inventory_digest';