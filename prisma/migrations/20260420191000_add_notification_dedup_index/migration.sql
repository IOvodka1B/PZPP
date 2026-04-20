-- AddUniqueIndex
-- Prevents duplicate notifications for the same (userId, type, entityId) combination.
-- NULL entityId values are treated as distinct in Postgres, so non-keyed notification
-- types (entityId IS NULL) are unaffected by this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_userId_type_entityId_key"
  ON "Notification"("userId", "type", "entityId");
